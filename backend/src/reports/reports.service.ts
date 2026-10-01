import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SalesSource = 'manual' | 'auto';

interface VariantSalesRow {
  productId: string;
  variant: string;
  unit: string;
  packQty: number;
  manualPackQty: number;
  autoPackQty: number;
  sellingPrice: number;
  factoryPrice: number;
  salesAmount: number;
  costAmount: number;
  marginAmount: number;
  marginPercent: number;
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

  async dailySales(workspaceId: string | undefined, date?: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const { day, start, end } = this.reportDay(date);

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

    const rowsByProduct = new Map<string, VariantSalesRow>();
    const sourceTotals: Record<SalesSource, { orders: Set<string>; packQty: number; salesAmount: number; marginAmount: number }> = {
      manual: { orders: new Set(), packQty: 0, salesAmount: 0, marginAmount: 0 },
      auto: { orders: new Set(), packQty: 0, salesAmount: 0, marginAmount: 0 },
    };

    for (const item of items) {
      const source: SalesSource = item.order.source === 'TELEGRAM' ? 'auto' : 'manual';
      const quantity = item.quantity;
      const sellingPrice = Number(item.price);
      const factoryPrice = Number(item.product.factoryPrice || 0);
      const salesAmount = sellingPrice * quantity;
      const costAmount = factoryPrice * quantity;
      const marginAmount = salesAmount - costAmount;

      const current = rowsByProduct.get(item.productId) || {
        productId: item.productId,
        variant: item.product.name,
        unit: item.product.unit,
        packQty: 0,
        manualPackQty: 0,
        autoPackQty: 0,
        sellingPrice: 0,
        factoryPrice,
        salesAmount: 0,
        costAmount: 0,
        marginAmount: 0,
        marginPercent: 0,
      };

      current.packQty += quantity;
      current.manualPackQty += source === 'manual' ? quantity : 0;
      current.autoPackQty += source === 'auto' ? quantity : 0;
      current.salesAmount += salesAmount;
      current.costAmount += costAmount;
      current.marginAmount += marginAmount;
      current.sellingPrice = current.packQty > 0 ? current.salesAmount / current.packQty : sellingPrice;
      current.factoryPrice = factoryPrice;
      current.marginPercent = current.salesAmount > 0 ? (current.marginAmount / current.salesAmount) * 100 : 0;

  // Track last 3 days
  if (!(current as any).last3Days) (current as any).last3Days = [];
  const dayKey = item.order.createdAt.toISOString().slice(0, 10);
  const existing = (current as any).last3Days.find((d: any) => d.date === dayKey);
  if (existing) {
    existing.packQty += quantity;
    existing.salesAmount += salesAmount;
  } else {
    (current as any).last3Days.push({ date: dayKey, packQty: quantity, salesAmount });
  }

  // Remaining pack not tracked yet
  (current as any).remainingPack = null;

      rowsByProduct.set(item.productId, current);

      sourceTotals[source].orders.add(item.order.id);
      sourceTotals[source].packQty += quantity;
      sourceTotals[source].salesAmount += salesAmount;
      sourceTotals[source].marginAmount += marginAmount;
    }

    const variants = Array.from(rowsByProduct.values())
      .map((row) => ({
        ...row,
        sellingPrice: this.money(row.sellingPrice),
        factoryPrice: this.money(row.factoryPrice),
        salesAmount: this.money(row.salesAmount),
        costAmount: this.money(row.costAmount),
        marginAmount: this.money(row.marginAmount),
      marginPercent: this.money(row.marginPercent),
      last3Days: (row as any).last3Days || [],
      remainingPack: (row as any).remainingPack ?? null,
      }))
      .sort((a, b) => b.salesAmount - a.salesAmount);

    const totals = variants.reduce(
      (acc, row) => ({
        packQty: acc.packQty + row.packQty,
        salesAmount: acc.salesAmount + row.salesAmount,
        costAmount: acc.costAmount + row.costAmount,
        marginAmount: acc.marginAmount + row.marginAmount,
      }),
      { packQty: 0, salesAmount: 0, costAmount: 0, marginAmount: 0 },
    );

    const orderIds = new Set(items.map((item) => item.order.id));

    return {
      date: day,
      range: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        orders: orderIds.size,
        packQty: totals.packQty,
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
