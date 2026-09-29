import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveriesService {
  constructor(private prisma: PrismaService) {}

  private async resolveWorkspaceId(workspaceId?: string): Promise<string> {
    if (workspaceId) return workspaceId;
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException('No workspace found');
    return org.id;
  }

  /** "Start delivery" -> creates the Delivery record and marks it in transit. */
  async start(workspaceId: string, orderId: string, agentId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const order = await this.prisma.order.findFirst({ where: { id: orderId, workspaceId: wsId } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.delivery.upsert({
      where: { orderId },
      create: { orderId, agentId, status: 'IN_TRANSIT', startedAt: new Date() },
      update: { status: 'IN_TRANSIT', startedAt: new Date() },
    });
  }

  /** "Arrive customer" -> agent checks in with GPS coordinates. */
  async arrive(workspaceId: string, orderId: string, lat: number, lng: number) {
    await this.assertOrderInWorkspace(workspaceId, orderId);
    return this.prisma.delivery.update({
      where: { orderId },
      data: { status: 'ARRIVED', arrivedAt: new Date(), lat, lng },
    });
  }

  /** "Confirm delivery" -> final step before invoice generation. */
  async confirm(workspaceId: string, orderId: string) {
    await this.assertOrderInWorkspace(workspaceId, orderId);
    return this.prisma.delivery.update({
      where: { orderId },
      data: { status: 'DELIVERED', confirmedAt: new Date() },
    });
  }

  async fail(workspaceId: string, orderId: string) {
    await this.assertOrderInWorkspace(workspaceId, orderId);
    return this.prisma.delivery.update({ where: { orderId }, data: { status: 'FAILED' } });
  }

  async findAll(workspaceId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    return this.prisma.delivery.findMany({
      where: { order: { workspaceId: wsId } },
      include: { order: { include: { customer: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  private async assertOrderInWorkspace(workspaceId: string, orderId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const order = await this.prisma.order.findFirst({ where: { id: orderId, workspaceId: wsId } });
    if (!order) throw new NotFoundException('Order not found');
  }
}
