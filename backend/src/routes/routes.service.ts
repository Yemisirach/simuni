import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoutingService } from '../routing/routing.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { AssignAgentDto } from './dto/assign-agent.dto';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService, private routing: RoutingService) {}

  /** "Create Delivery Routes" + "Add customers" + optional "Assign Agent" in one call. */
  create(workspaceId: string, dto: CreateRouteDto) {
    return this.prisma.route.create({
      data: {
        workspaceId,
        name: dto.name,
        date: new Date(dto.date),
        agentId: dto.agentId,
        stops: {
          create: dto.customerIds.map((customerId, i) => ({ customerId, sequence: i + 1 })),
        },
      },
      include: { stops: { include: { customer: true } } },
    });
  }

  findAll(workspaceId: string) {
    return this.prisma.route.findMany({
      where: { workspaceId },
      include: {
        agent: true,
        stops: {
          include: { customer: true },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, workspaceId },
      include: { 
        agent: true, 
        stops: { 
          include: { 
            customer: {
              include: { invoices: { where: { paymentStatus: 'UNPAID' } } }
            } 
          }, 
          orderBy: { sequence: 'asc' } 
        } 
      },
    });
    if (!route) throw new NotFoundException('Route not found');

    // Attach outstanding loan balance dynamically for the MVP
    const stopsWithBalance = route.stops.map(stop => {
      const outstandingBalance = stop.customer?.invoices
        ? stop.customer.invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
        : 0;
      return {
        ...stop,
        customer: stop.customer
          ? {
              ...stop.customer,
              outstandingBalance,
            }
          : null,
      };
    });

    return { ...route, stops: stopsWithBalance };
  }

  async assignAgent(workspaceId: string, id: string, dto: AssignAgentDto) {
    await this.findOne(workspaceId, id);
    return this.prisma.route.update({ where: { id }, data: { agentId: dto.agentId } });
  }

  /** "Agent Receives Route" -> starts the route, flips status, kicks off GPS tracking client-side. */
  async start(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.route.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
  }

  async complete(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.route.update({ where: { id }, data: { status: 'COMPLETED' } });
  }

  /** Marks a single stop visited once the agent checks in at the customer. */
  async visitStop(workspaceId: string, routeId: string, stopId: string) {
    await this.findOne(workspaceId, routeId);
    return this.prisma.routeStop.update({
      where: { id: stopId },
      data: { status: 'VISITED', visitedAt: new Date() },
    });
  }

  /** Live route progress: stops visited vs. total, used for the manager tracking dashboard. */
  async progress(workspaceId: string, id: string) {
    const route = await this.findOne(workspaceId, id);
    const total = route.stops.length;
    const visited = route.stops.filter((s) => s.status === 'VISITED').length;
    return { routeId: id, total, visited, percent: total ? Math.round((visited / total) * 100) : 0 };
  }

  /**
   * Turn-by-turn directions from the agent's current GPS position to the
   * next PENDING stop (or a specific stop, if `stopId` is given). Backs the
   * "Navigate" step of the Delivery Management flow on the mobile app.
   */
  async directionsToNextStop(workspaceId: string, id: string, from: { lat: number; lng: number }, stopId?: string) {
    const route = await this.findOne(workspaceId, id);
    const target = stopId
      ? route.stops.find((s) => s.id === stopId)
      : route.stops.find((s) => s.status === 'PENDING');

    if (!target) throw new NotFoundException('No pending stop to navigate to');
    if (!target.customer || target.customer.lat == null || target.customer.lng == null) {
      throw new BadRequestException('This customer has no GPS coordinates on file');
    }

    const directions = await this.routing.directionsToStop(from, {
      lat: target.customer.lat,
      lng: target.customer.lng,
    });
    if (!directions) throw new BadRequestException('Could not reach the routing service (OSRM)');

    return { stopId: target.id, customerName: target.customer.name, ...directions };
  }

  /**
   * Re-sequences a route's stops into OSRM's suggested visiting order,
   * starting from the agent's current position. Manager-triggered from the
   * route detail screen ("Optimize order").
   */
  async optimizeOrder(workspaceId: string, id: string, from: { lat: number; lng: number }) {
    const route = await this.findOne(workspaceId, id);
    const pending = route.stops.filter((s) => s.status === 'PENDING' && s.customer?.lat != null && s.customer?.lng != null);
    if (pending.length < 2) return route;

    const order = await this.routing.optimizeStopOrder(
      from,
      pending.map((s) => ({ lat: s.customer!.lat!, lng: s.customer!.lng! })),
    );
    if (!order) throw new BadRequestException('Could not reach the routing service (OSRM)');

    await this.prisma.$transaction(
      order.map((stopIndex, position) =>
        this.prisma.routeStop.update({
          where: { id: pending[stopIndex].id },
          data: { sequence: position + 1 },
        }),
      ),
    );

    return this.findOne(workspaceId, id);
  }

  /** Update route basic details (name, date, agentId, status, and optionally customer stops). */
  async update(workspaceId: string, id: string, dto: any) {
    await this.findOne(workspaceId, id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.agentId !== undefined) data.agentId = dto.agentId || null;
    if (dto.status !== undefined) data.status = dto.status;

    if (dto.customerIds && Array.isArray(dto.customerIds)) {
      // Re-link stops
      await this.prisma.routeStop.deleteMany({ where: { routeId: id } });
      data.stops = {
        create: dto.customerIds.map((customerId: string, i: number) => ({
          customerId,
          sequence: i + 1,
        })),
      };
    }

    return this.prisma.route.update({
      where: { id },
      data,
      include: {
        agent: true,
        stops: {
          include: { customer: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });
  }

  /** Delete a route and cascade-delete its stops. */
  async remove(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    // Delete stops first
    await this.prisma.routeStop.deleteMany({ where: { routeId: id } });
    return this.prisma.route.delete({ where: { id } });
  }
}
