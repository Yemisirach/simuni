import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SalesSource = 'manual' | 'auto';

export interface VariantSalesRow {
  productId: string;
  variant: string;
  sku: string | null;
  unit: string;
  currentStock: number;
  openingStock: number;
  factoryReceived: number;
  packQty: number;
  manualPackQty: number;
  autoPackQty: number;
  sellingPrice: number;
  factoryPrice: number;
  salesAmount: number;
  costAmount: number;
  marginAmount: number;
  marginPercent: number;
  remainingPack: number;
  last3Days?: { date: string; packQty: number; salesAmount: number }[];
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async resolveWorkspaceId(workspaceId?: string): Promise<string> {
    if (workspaceId) return workspaceId;
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new NotFoundException('No workspace found');
    return org.id;
  }

  private parseMetadata(metadataStr: string | null | undefined): Record<string, any> {
    if (!metadataStr) return {};
    try {
      return JSON.parse(metadataStr);
    } catch {
      return {};
    }
  }

  async dailySales(workspaceId: string | undefined, date?: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const { day, start, end } = this.reportDay(date);

    // Calculate previous day key
    const prevDateObj = new Date(start);
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    const prevDay = prevDateObj.toISOString().slice(0, 10);

    // 1. Fetch organization & existing saved snapshots
    const org = await this.prisma.organization.findUnique({ where: { id: wsId } });
    const metadata = this.parseMetadata(org?.metadata);
    const snapshots: Record<string, any> = metadata.dailySalesSnapshots || {};
    const currentSnapshot = snapshots[day];
    const prevSnapshot = snapshots[prevDay];

    // 2. Fetch all active products in the catalog
    const allProducts = await this.prisma.product.findMany({
      where: { workspaceId: wsId, isActive: true },
      orderBy: { name: 'asc' },
    });

    // 3. Fetch orders for that day
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          workspaceId: wsId,
          createdAt: { gte: start, lt: end },
          status: { not: 'CANCELLED' },
        },
      },
      include: {
        product: true,
        order: {
          select: {
            id: true,
            source: true,
            createdAt: true,
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    // 4. Fetch factory orders arrived on that day
    const factoryItems = await this.prisma.factoryOrderItem.findMany({
      where: {
        factoryOrder: {
          workspaceId: wsId,
          date: { gte: start, lt: end },
        },
      },
    });

    const factoryReceivedMap = new Map<string, number>();
    for (const fi of factoryItems) {
      const cur = factoryReceivedMap.get(fi.productId) || 0;
      factoryReceivedMap.set(fi.productId, cur + fi.quantity);
    }

    // 5. Aggregate order items
    const sourceTotals: Record<SalesSource, { orders: Set<string>; packQty: number; salesAmount: number; marginAmount: number }> = {
      manual: { orders: new Set(), packQty: 0, salesAmount: 0, marginAmount: 0 },
      auto: { orders: new Set(), packQty: 0, salesAmount: 0, marginAmount: 0 },
    };

    const ordersAggByProduct = new Map<string, {
      packQty: number;
      manualPackQty: number;
      autoPackQty: number;
      salesAmount: number;
      costAmount: number;
      sellingPrice: number;
      factoryPrice: number;
    }>();

    for (const item of items) {
      const source: SalesSource = item.order.source === 'TELEGRAM' ? 'auto' : 'manual';
      const quantity = item.quantity;
      const sellingPrice = Number(item.price);
      const factoryPrice = Number(item.product.factoryPrice || 0);
      const salesAmount = sellingPrice * quantity;
      const costAmount = factoryPrice * quantity;
      const marginAmount = salesAmount - costAmount;

      const agg = ordersAggByProduct.get(item.productId) || {
        packQty: 0,
        manualPackQty: 0,
        autoPackQty: 0,
        salesAmount: 0,
        costAmount: 0,
        sellingPrice,
        factoryPrice,
      };

      agg.packQty += quantity;
      agg.manualPackQty += source === 'manual' ? quantity : 0;
      agg.autoPackQty += source === 'auto' ? quantity : 0;
      agg.salesAmount += salesAmount;
      agg.costAmount += costAmount;
      ordersAggByProduct.set(item.productId, agg);

      sourceTotals[source].orders.add(item.order.id);
      sourceTotals[source].packQty += quantity;
      sourceTotals[source].salesAmount += salesAmount;
      sourceTotals[source].marginAmount += marginAmount;
    }

    // 6. Build Variant Rows for ALL active products
    const variants: VariantSalesRow[] = allProducts.map((p) => {
      const orderAgg = ordersAggByProduct.get(p.id);
      const factoryReceived = factoryReceivedMap.get(p.id) || 0;
      const snapshotVariant = currentSnapshot?.variants?.find((v: any) => v.productId === p.id);
      const prevVariant = prevSnapshot?.variants?.find((v: any) => v.productId === p.id);

      // Determine Opening Stock:
      // Priority 1: Current saved snapshot openingStock
      // Priority 2: Previous day snapshot's closingStock
      // Priority 3: Derived from product.stock (currentStock - receivedToday + soldToday)
      const orderSold = orderAgg?.packQty || 0;
      let openingStock = 0;
      if (snapshotVariant?.openingStock !== undefined) {
        openingStock = Number(snapshotVariant.openingStock);
      } else if (prevVariant?.closingStock !== undefined) {
        openingStock = Number(prevVariant.closingStock);
      } else {
        openingStock = Math.max(0, p.stock - factoryReceived + orderSold);
      }

      // Determine Sold Quantity:
      // If snapshot recorded a custom physical-count sold qty, respect it; otherwise use actual orders
      const packQty = snapshotVariant?.soldQty !== undefined ? Number(snapshotVariant.soldQty) : orderSold;
      const manualPackQty = snapshotVariant?.manualPackQty !== undefined ? Number(snapshotVariant.manualPackQty) : (orderAgg?.manualPackQty || 0);
      const autoPackQty = snapshotVariant?.autoPackQty !== undefined ? Number(snapshotVariant.autoPackQty) : (orderAgg?.autoPackQty || 0);

      // Remaining / Closing stock:
      // Opening + Factory Inflow - Sold
      let remainingPack = openingStock + factoryReceived - packQty;
      if (snapshotVariant?.closingStock !== undefined) {
        remainingPack = Number(snapshotVariant.closingStock);
      }

      // Pricing
      const sellingPrice = snapshotVariant?.sellingPrice !== undefined ? Number(snapshotVariant.sellingPrice) : (orderAgg && orderAgg.packQty > 0 ? orderAgg.salesAmount / orderAgg.packQty : Number(p.price));
      const factoryPrice = snapshotVariant?.factoryPrice !== undefined ? Number(snapshotVariant.factoryPrice) : Number(p.factoryPrice || 0);

      const salesAmount = packQty * sellingPrice;
      const costAmount = packQty * factoryPrice;
      const marginAmount = salesAmount - costAmount;
      const marginPercent = salesAmount > 0 ? (marginAmount / salesAmount) * 100 : 0;

      return {
        productId: p.id,
        variant: p.name,
        sku: p.sku,
        unit: p.unit,
        currentStock: p.stock,
        openingStock,
        factoryReceived: snapshotVariant?.factoryReceived !== undefined ? Number(snapshotVariant.factoryReceived) : factoryReceived,
        packQty,
        manualPackQty,
        autoPackQty,
        sellingPrice: this.money(sellingPrice),
        factoryPrice: this.money(factoryPrice),
        salesAmount: this.money(salesAmount),
        costAmount: this.money(costAmount),
        marginAmount: this.money(marginAmount),
        marginPercent: this.money(marginPercent),
        remainingPack,
        last3Days: [],
      };
    });

    // 7. Calculate overall totals
    const totals = variants.reduce(
      (acc, row) => ({
        packQty: acc.packQty + row.packQty,
        openingStock: acc.openingStock + row.openingStock,
        factoryReceived: acc.factoryReceived + row.factoryReceived,
        remainingPack: acc.remainingPack + row.remainingPack,
        salesAmount: acc.salesAmount + row.salesAmount,
        costAmount: acc.costAmount + row.costAmount,
        marginAmount: acc.marginAmount + row.marginAmount,
      }),
      { packQty: 0, openingStock: 0, factoryReceived: 0, remainingPack: 0, salesAmount: 0, costAmount: 0, marginAmount: 0 },
    );

    const orderIds = new Set(items.map((item) => item.order.id));

    return {
      date: day,
      range: { start: start.toISOString(), end: end.toISOString() },
      hasSnapshot: !!currentSnapshot,
      snapshotMetadata: currentSnapshot ? { market: currentSnapshot.market, priceTier: currentSnapshot.priceTier, notes: currentSnapshot.notes } : null,
      previousDayAvailable: !!prevSnapshot,
      summary: {
        orders: orderIds.size,
        packQty: totals.packQty,
        openingStock: totals.openingStock,
        factoryReceived: totals.factoryReceived,
        remainingPack: totals.remainingPack,
        salesAmount: this.money(totals.salesAmount),
        costAmount: this.money(totals.costAmount),
        marginAmount: this.money(totals.marginAmount),
        marginPercent: totals.salesAmount > 0 ? this.money((totals.marginAmount / totals.salesAmount) * 100) : 0,
      },
      sources: {
        manual: {
          label: 'Manual sales',
          orders: sourceTotals.manual.orders.size,
          packQty: sourceTotals.manual.packQty,
          salesAmount: this.money(sourceTotals.manual.salesAmount),
          marginAmount: this.money(sourceTotals.manual.marginAmount),
        },
        auto: {
          label: 'Auto sales',
          orders: sourceTotals.auto.orders.size,
          packQty: sourceTotals.auto.packQty,
          salesAmount: this.money(sourceTotals.auto.salesAmount),
          marginAmount: this.money(sourceTotals.auto.marginAmount),
        },
      },
      variants,
    };
  }

  async saveInventorySnapshot(workspaceId: string | undefined, data: any) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    if (!data?.date) {
      throw new BadRequestException('date is required (YYYY-MM-DD)');
    }

    const org = await this.prisma.organization.findUnique({ where: { id: wsId } });
    if (!org) throw new NotFoundException('Workspace not found');

    const metadata = this.parseMetadata(org.metadata);
    if (!metadata.dailySalesSnapshots) {
      metadata.dailySalesSnapshots = {};
    }

    // Save snapshot data for the specified date
    metadata.dailySalesSnapshots[data.date] = {
      date: data.date,
      market: data.market || 'addis',
      priceTier: data.priceTier || 'new',
      notes: data.notes || '',
      updatedAt: new Date().toISOString(),
      variants: data.variants || [],
    };

    // Update database Organization metadata
    await this.prisma.organization.update({
      where: { id: wsId },
      data: { metadata: JSON.stringify(metadata) },
    });

    // Optionally update live Product stock in database
    if (data.updateProductStock !== false && Array.isArray(data.variants)) {
      for (const item of data.variants) {
        if (item.productId && item.closingStock !== undefined) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: Math.max(0, Math.round(Number(item.closingStock))),
              ...(item.factoryPrice ? { factoryPrice: Number(item.factoryPrice) } : {}),
            },
          }).catch((e) => console.error('Failed to update product stock:', e));
        }
      }
    }

    return {
      success: true,
      message: `Inventory & daily sales report saved for ${data.date}`,
      date: data.date,
    };
  }

  async resetDailySales(workspaceId: string | undefined, date?: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const org = await this.prisma.organization.findUnique({ where: { id: wsId } });
    if (!org) throw new NotFoundException('Workspace not found');

    const metadata = this.parseMetadata(org.metadata);
    if (!metadata.dailySalesSnapshots) {
      metadata.dailySalesSnapshots = {};
    }

    if (date) {
      delete metadata.dailySalesSnapshots[date];
    } else {
      metadata.dailySalesSnapshots = {};
    }

    await this.prisma.organization.update({
      where: { id: wsId },
      data: { metadata: JSON.stringify(metadata) },
    });

    return {
      success: true,
      message: date ? `Daily sales report reset for ${date}` : 'All daily sales reports have been reset.',
    };
  }

  async getPreviousReport(workspaceId: string | undefined, date?: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const { start } = this.reportDay(date);

    const prevDateObj = new Date(start);
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    const prevDay = prevDateObj.toISOString().slice(0, 10);

    return this.dailySales(wsId, prevDay);
  }

  private reportDay(date?: string) {
    const day = date || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new BadRequestException('date must use YYYY-MM-DD format');
    }
    const start = new Date(`${day}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { day, start, end };
  }

  private money(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
