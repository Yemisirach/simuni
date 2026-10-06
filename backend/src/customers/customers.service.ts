import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private async resolveWorkspaceId(workspaceId?: string): Promise<string> {
    if (workspaceId) return workspaceId;
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException('No workspace found');
    return org.id;
  }

  async create(workspaceId: string, dto: CreateCustomerDto) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const phone = dto.phone?.trim() || 'N/A';
    return this.prisma.customer.create({ data: { ...dto, phone, workspaceId: wsId } });
  }

  /** Used by the Telegram bot — finds the customer already linked to this chat, if any. */
  findByTelegramChatId(chatId: string) {
    return this.prisma.customer.findUnique({ where: { telegramChatId: chatId } });
  }

  /**
   * Called by the Telegram bot when a user first interacts. We register
   * them as a Customer and links this chat to that record going forward.
   * `phone` may be a Telegram-provided contact share or a typed number.
   */
  async registerFromTelegram(workspaceId: string, chatId: string, name: string, phone: string, lat?: number, lng?: number) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    let zoneId: string | undefined = undefined;
    if (lat && lng) {
      const zones = await this.prisma.zone.findMany({ where: { workspaceId: wsId } });
      const matchingZone = zones.find(z => 
        lat >= z.minLat && lat <= z.maxLat && lng >= z.minLng && lng <= z.maxLng
      );
      if (matchingZone) zoneId = matchingZone.id;
    }

    return this.prisma.customer.create({
      data: { workspaceId: wsId, name, phone, telegramChatId: chatId, category: 'Telegram', lat, lng, zoneId },
    });
  }

  async registerShopFromTelegram(data: {
    workspaceId: string;
    name: string;
    phone?: string;
    category?: string;
    address?: string;
    lat: number;
    lng: number;
    registeredByChatId?: string;
  }) {
    const wsId = await this.resolveWorkspaceId(data.workspaceId);
    let zoneId: string | undefined = undefined;
    if (data.lat && data.lng) {
      const zones = await this.prisma.zone.findMany({ where: { workspaceId: wsId } });
      const matchingZone = zones.find(z => 
        data.lat >= z.minLat && data.lat <= z.maxLat && data.lng >= z.minLng && data.lng <= z.maxLng
      );
      if (matchingZone) zoneId = matchingZone.id;
    }

    const phone = data.phone?.trim() || 'N/A';
    const address = data.address || `GPS: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)} (Telegram Tag)`;

    return this.prisma.customer.create({
      data: {
        workspaceId: wsId,
        name: data.name,
        phone,
        category: data.category || 'RETAIL_SHOP',
        address,
        lat: data.lat,
        lng: data.lng,
        zoneId,
      },
    });
  }

  async findAll(workspaceId: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    return this.prisma.customer.findMany({
      where: { workspaceId: wsId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Geospatial viewport fetch: returns customers located inside the active map bounding box.
   * Also guarantees any specified `includeIds` (selected stops) are returned even if outside the box.
   */
  async findInViewport(
    workspaceId: string,
    params: {
      minLat?: number;
      maxLat?: number;
      minLng?: number;
      maxLng?: number;
      limit?: number;
      search?: string;
      includeIds?: string[];
    },
  ) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const limit = params.limit ? Math.min(Math.max(params.limit, 10), 1000) : 350;

    const where: any = { workspaceId: wsId };

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    if (
      typeof params.minLat === 'number' &&
      typeof params.maxLat === 'number' &&
      typeof params.minLng === 'number' &&
      typeof params.maxLng === 'number'
    ) {
      where.lat = { gte: params.minLat, lte: params.maxLat };
      where.lng = { gte: params.minLng, lte: params.maxLng };
    }

    const viewportCustomers = await this.prisma.customer.findMany({
      where,
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        category: true,
        lat: true,
        lng: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (params.includeIds && params.includeIds.length > 0) {
      const existingIds = new Set(viewportCustomers.map((c) => c.id));
      const missingIds = params.includeIds.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        const selectedCustomers = await this.prisma.customer.findMany({
          where: {
            workspaceId: wsId,
            id: { in: missingIds },
          },
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            category: true,
            lat: true,
            lng: true,
          },
        });
        return [...selectedCustomers, ...viewportCustomers];
      }
    }

    return viewportCustomers;
  }

  async findOne(workspaceId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, workspaceId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(workspaceId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(workspaceId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete associated route stops
      await tx.routeStop.deleteMany({ where: { customerId: id } });

      // 2. Find all orders for this customer
      const orders = await tx.order.findMany({ where: { customerId: id }, select: { id: true } });
      const orderIds = orders.map((o) => o.id);

      if (orderIds.length > 0) {
        // 3. Find and delete invoice payments and invoices
        const invoices = await tx.invoice.findMany({
          where: { OR: [{ customerId: id }, { orderId: { in: orderIds } }] },
          select: { id: true },
        });
        const invoiceIds = invoices.map((inv) => inv.id);

        if (invoiceIds.length > 0) {
          await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
          await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
        }

        // 4. Delete deliveries and order items
        await tx.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });

        // 5. Delete orders
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      // 6. Delete customer record
      return tx.customer.delete({ where: { id } });
    });
  }

  /** Order + payment history for a single customer, used on the customer profile screen. */
  async history(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);
    return this.prisma.order.findMany({
      where: { customerId: id, workspaceId },
      include: { items: { include: { product: true } }, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Bulk seed standard Addis Ababa tagged commercial hubs & customer locations
   * for the current workspace (or all workspaces if requested).
   */
  async seedAddisLocations(workspaceId: string, locations: Array<{
    name: string;
    phone?: string;
    address?: string;
    category?: string;
    lat: number;
    lng: number;
  }>, applyToAllWorkspaces = false) {
    const targetWsIds: string[] = [];

    if (applyToAllWorkspaces) {
      const allOrgs = await this.prisma.organization.findMany({ select: { id: true } });
      targetWsIds.push(...allOrgs.map((o) => o.id));
    } else {
      const wsId = await this.resolveWorkspaceId(workspaceId);
      targetWsIds.push(wsId);
    }

    let createdCount = 0;
    for (const wsId of targetWsIds) {
      // 1. Fetch all existing customer records in workspace in a single query
      const existingList = await this.prisma.customer.findMany({
        where: { workspaceId: wsId },
        select: { id: true, name: true, lat: true, lng: true },
      });
      const existingMap = new Map(existingList.map((c) => [c.name, c]));

      const toCreate: Array<{
        workspaceId: string;
        name: string;
        phone: string;
        address: string;
        category: string;
        lat: number;
        lng: number;
      }> = [];

      const toUpdate: Array<{
        id: string;
        lat: number;
        lng: number;
        address?: string;
      }> = [];

      for (const loc of locations) {
        const existing = existingMap.get(loc.name);
        if (!existing) {
          toCreate.push({
            workspaceId: wsId,
            name: loc.name,
            phone: loc.phone || '0911000000',
            address: loc.address || 'Addis Ababa',
            category: loc.category || 'Retailer',
            lat: loc.lat,
            lng: loc.lng,
          });
        } else {
          // Only update if coordinates differ
          const latDiff = existing.lat != null ? Math.abs(existing.lat - loc.lat) : 1;
          const lngDiff = existing.lng != null ? Math.abs(existing.lng - loc.lng) : 1;
          if (latDiff > 0.00005 || lngDiff > 0.00005) {
            toUpdate.push({
              id: existing.id,
              lat: loc.lat,
              lng: loc.lng,
              address: loc.address,
            });
          }
        }
      }

      // 2. Fast bulk insert for new customers
      if (toCreate.length > 0) {
        const BATCH_SIZE = 500;
        for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
          const chunk = toCreate.slice(i, i + BATCH_SIZE);
          await this.prisma.customer.createMany({
            data: chunk,
            skipDuplicates: true,
          });
          createdCount += chunk.length;
        }
      }

      // 3. Fast concurrent batch update for existing customers
      if (toUpdate.length > 0) {
        const UPDATE_BATCH = 40;
        for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
          const chunk = toUpdate.slice(i, i + UPDATE_BATCH);
          await Promise.all(
            chunk.map((item) =>
              this.prisma.customer.update({
                where: { id: item.id },
                data: {
                  lat: item.lat,
                  lng: item.lng,
                  address: item.address,
                },
              }),
            ),
          );
        }
      }
    }

    return { success: true, createdCount, targetWorkspacesCount: targetWsIds.length };
  }
}
