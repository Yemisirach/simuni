import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

interface OrderItemInput {
  productId: string;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async resolveWorkspaceId(workspaceId?: string): Promise<string> {
    if (workspaceId) return workspaceId;
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException('No workspace found');
    return org.id;
  }

  /**
   * "Order Collection" step: agent creates an order, adds products,
   * confirms quantity, submits. Prices are snapshotted from the
   * product catalog at submission time.
   */
  async create(workspaceId: string, agentId: string, dto: CreateOrderDto) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    return this.createOrder(wsId, {
      customerId: dto.customerId,
      agentId: agentId || null,
      routeId: dto.routeId || null,
      items: dto.items,
      source: 'AGENT',
    });
  }

  /**
   * Customer-initiated order with no field agent involved yet — the
   * Telegram bot flow (see telegram/telegram.service.ts). `agentId` is left
   * null; any agent can later claim it for delivery via the normal
   * `POST /deliveries/:orderId/start` endpoint, which sets the *delivery's*
   * agent independently of who collected the order.
   */
  async createFromTelegram(workspaceId: string, customerId: string, items: OrderItemInput[]) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    let matchedRouteId: string | null = null;
    
    if (customer?.zoneId) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const activeRoute = await this.prisma.route.findFirst({
        where: {
          workspaceId,
          zoneId: customer.zoneId,
          status: { in: ['PLANNED', 'IN_PROGRESS'] },
          date: { gte: startOfDay, lte: endOfDay }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (activeRoute) matchedRouteId = activeRoute.id;
    }
    
    return this.createOrder(workspaceId, { customerId, agentId: null, routeId: matchedRouteId, items, source: 'TELEGRAM' });
  }

  private async createOrder(
    workspaceId: string,
    params: { customerId: string; agentId: string | null; routeId?: string | null; items: OrderItemInput[]; source: 'AGENT' | 'TELEGRAM' },
  ) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const products = await this.prisma.product.findMany({
      where: { workspaceId: wsId, id: { in: params.items.map((i) => i.productId) } },
    });
    const priceById = new Map(products.map((p) => [p.id, p.price]));

    if (params.routeId) {
      const existingStop = await this.prisma.routeStop.findUnique({
        where: { routeId_customerId: { routeId: params.routeId, customerId: params.customerId } },
      });
      if (!existingStop) {
        const lastStop = await this.prisma.routeStop.findFirst({
          where: { routeId: params.routeId },
          orderBy: { sequence: 'desc' },
        });
        await this.prisma.routeStop.create({
          data: {
            routeId: params.routeId,
            customerId: params.customerId,
            sequence: (lastStop?.sequence || 0) + 1,
            status: params.source === 'TELEGRAM' ? 'PENDING' : 'VISITED',
          }
        });
      }
    }

    return this.prisma.order.create({
      data: {
        workspaceId: wsId,
        customerId: params.customerId,
        agentId: params.agentId || null,
        routeId: params.routeId || null,
        status: 'SUBMITTED',
        source: params.source,
        items: {
          create: params.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: priceById.get(i.productId) ?? 0,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
  }

  async findAll(workspaceId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    return this.prisma.order.findMany({
      where: { workspaceId: wsId },
      include: { customer: true, items: true, delivery: true, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Orders no field agent has claimed for delivery yet — surfaces Telegram orders that need a driver. */
  async findUnclaimed(workspaceId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    return this.prisma.order.findMany({
      where: { workspaceId: wsId, delivery: { is: null } },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const order = await this.prisma.order.findFirst({
      where: { id, workspaceId: wsId },
      include: { customer: true, items: { include: { product: true } }, delivery: true, invoice: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async confirm(workspaceId: string, id: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    await this.findOne(wsId, id);
    return this.prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  async deleteOrder(workspaceId: string | undefined, id: string) {
    console.log(`[OrdersService] Deleting order ${id} for workspace ${workspaceId}`);
    const wsId = await this.resolveWorkspaceId(workspaceId);
    console.log(`[OrdersService] Resolved workspaceId: ${wsId}`);
    const order = await this.findOne(wsId, id);
    console.log(`[OrdersService] Found order to delete: ${order.id}. Deleting sequentially without interactive transaction...`);

    // 1. Delete associated payments if an invoice exists
    if (order.invoice?.id) {
      console.log(`[OrdersService] Deleting payments & invoice: ${order.invoice.id}`);
      await this.prisma.payment.deleteMany({
        where: { invoiceId: order.invoice.id },
      });
      await this.prisma.invoice.delete({
        where: { id: order.invoice.id },
      });
    }

    // 2. Delete delivery if exists
    if (order.delivery?.id) {
      console.log(`[OrdersService] Deleting delivery: ${order.delivery.id}`);
      await this.prisma.delivery.delete({
        where: { id: order.delivery.id },
      });
    }

    // 3. Delete order items & revert stock if needed
    console.log(`[OrdersService] Deleting order items count: ${order.items.length}`);
    for (const item of order.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      }).catch((e) => console.log('Error reverting stock:', e.message));
    }
    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    // 4. Delete the order
    console.log(`[OrdersService] Deleting order row: ${id}`);
    await this.prisma.order.delete({
      where: { id },
    });

    // 5. Delete customer if it was an auto-created spot sale shop
    if (order.customer && order.customer.name.startsWith('Spot Sale') && order.customer.phone === 'N/A') {
      console.log(`[OrdersService] Deleting spot customer: ${order.customer.id}`);
      await this.prisma.customer.delete({
        where: { id: order.customer.id },
      }).catch(() => {});
    }

    console.log(`[OrdersService] Order ${id} successfully deleted!`);
    return { success: true, message: `Order ${id} deleted successfully.` };
  }

  orderTotal(order: { items: { price: any; quantity: number }[] }) {
    return order.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  }
}
