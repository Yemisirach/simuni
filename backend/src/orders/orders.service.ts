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

  /**
   * "Order Collection" step: agent creates an order, adds products,
   * confirms quantity, submits. Prices are snapshotted from the
   * product catalog at submission time.
   */
  async create(workspaceId: string, agentId: string, dto: CreateOrderDto) {
    return this.createOrder(workspaceId, {
      customerId: dto.customerId,
      agentId,
      routeId: dto.routeId,
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
    return this.createOrder(workspaceId, { customerId, agentId: null, routeId: null, items, source: 'TELEGRAM' });
  }

  private async createOrder(
    workspaceId: string,
    params: { customerId: string; agentId: string | null; routeId?: string | null; items: OrderItemInput[]; source: 'AGENT' | 'TELEGRAM' },
  ) {
    const products = await this.prisma.product.findMany({
      where: { workspaceId, id: { in: params.items.map((i) => i.productId) } },
    });
    const priceById = new Map(products.map((p) => [p.id, p.price]));

    return this.prisma.order.create({
      data: {
        workspaceId,
        customerId: params.customerId,
        agentId: params.agentId,
        routeId: params.routeId,
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

  findAll(workspaceId: string) {
    return this.prisma.order.findMany({
      where: { workspaceId },
      include: { customer: true, items: true, delivery: true, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Orders no field agent has claimed for delivery yet — surfaces Telegram orders that need a driver. */
  findUnclaimed(workspaceId: string) {
    return this.prisma.order.findMany({
      where: { workspaceId, delivery: { is: null } },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, workspaceId },
      include: { customer: true, items: { include: { product: true } }, delivery: true, invoice: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async confirm(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  orderTotal(order: { items: { price: any; quantity: number }[] }) {
    return order.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  }
}
