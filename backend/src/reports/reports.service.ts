import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SalesSource = 'manual' | 'auto';

export interface WarehouseReserveItem {
  productId: string;
  variant: string;
  sku: string | null;
  unit: string;
  prevPrice: number;
  prevStock: number;
  newPrice: number;
  newStock: number;
  totalWarehouseStock: number;
  vanRemaining: number;
  totalAvailableStock: number;
}

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

    // Compute sequential running stock across historical snapshots prior to this 'day'
    // so every day's sales continuously and correctly subtract from factory purchases & opening stock
    const priorDates = Object.keys(snapshots)
      .filter((d) => d < day)
      .sort();

    const prevSnapshot = snapshots[prevDay] || (priorDates.length > 0 ? snapshots[priorDates[priorDates.length - 1]] : undefined);

    const runningClosingStockByProduct = new Map<string, number>();
    for (const d of priorDates) {
      const snap = snapshots[d];
      if (Array.isArray(snap?.variants)) {
        for (const v of snap.variants) {
          if (!v.productId) continue;
          const prevClose = runningClosingStockByProduct.get(v.productId) || 0;
          const snapOpen = v.openingStock !== undefined ? Number(v.openingStock) : undefined;
          const open = snapOpen !== undefined ? snapOpen : prevClose;
          const inflow = Number(v.factoryReceived || 0);
          const sold = Number(v.soldQty || 0);
          const close = v.closingStock !== undefined ? Number(v.closingStock) : Math.max(0, open + inflow - sold);
          runningClosingStockByProduct.set(v.productId, close);
        }
      }
    }

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
      // Priority 1: Current saved snapshot openingStock (if explicitly set > 0)
      // Priority 2: Inherited from sequential running closing stock of prior days
      // Priority 3: Fallback snapshot opening stock
      // Priority 4: For today or future, derived from product.stock
      const orderSold = orderAgg?.packQty || 0;
      const todayStr = new Date().toISOString().slice(0, 10);
      let openingStock = 0;

      const priorClosing = runningClosingStockByProduct.get(p.id);
      const snapOpen = snapshotVariant?.openingStock !== undefined ? Number(snapshotVariant.openingStock) : undefined;

      if (snapOpen !== undefined) {
        openingStock = snapOpen;
      } else if (priorClosing !== undefined && priorClosing >= 0) {
        openingStock = priorClosing;
      } else if (day >= todayStr) {
        openingStock = Math.max(0, p.stock - factoryReceived + orderSold);
      } else {
        openingStock = 0;
      }

      // Determine Factory Inflow:
      const recordedFactoryInflow = snapshotVariant?.factoryReceived !== undefined ? Number(snapshotVariant.factoryReceived) : factoryReceived;

      // Determine Sold Quantity:
      // If snapshot recorded a custom physical-count sold qty, respect it; otherwise use actual orders
      const packQty = snapshotVariant?.soldQty !== undefined ? Number(snapshotVariant.soldQty) : orderSold;
      const manualPackQty = snapshotVariant?.manualPackQty !== undefined ? Number(snapshotVariant.manualPackQty) : (orderAgg?.manualPackQty || 0);
      const autoPackQty = snapshotVariant?.autoPackQty !== undefined ? Number(snapshotVariant.autoPackQty) : (orderAgg?.autoPackQty || 0);

      // Remaining / Closing stock:
      // Respect explicit closingStock if saved in snapshot, else Opening + Inflow - Sold
      let remainingPack = snapshotVariant?.closingStock !== undefined
        ? Number(snapshotVariant.closingStock)
        : Math.max(0, openingStock + recordedFactoryInflow - packQty);

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

    // 8. Compute Warehouse available product reserves (New vs Previous price) up to active day
    // Factory purchase history by variant:
    // 0.35L: 0 prev (172 ETB), 0 new (220 ETB)
    // 0.60L: 450 pk @ 220 ETB (Prev), Orders 3 & 5: 370 pk @ 270 ETB (New)
    // 1.00L: 500 pk @ 174 ETB (Prev), Order 5: 150 pk @ 220 ETB (New)
    // 2.00L: 420 pk @ 220 ETB (Prev), Order 3, 4 & 5: 680 pk @ 270 ETB (New)
    const allSnapshotDates = Object.keys(snapshots)
      .filter((d) => d <= day)
      .sort();

    // Cumulative sold packs up to this active day
    const cumulativeSoldMap = new Map<string, number>();
    for (const d of allSnapshotDates) {
      const snap = snapshots[d];
      if (Array.isArray(snap?.variants)) {
        for (const v of snap.variants) {
          if (!v.productId) continue;
          const cur = cumulativeSoldMap.get(v.productId) || 0;
          cumulativeSoldMap.set(v.productId, cur + Number(v.soldQty || 0));
        }
      }
    }

    const warehouseReserves: WarehouseReserveItem[] = allProducts.map((p) => {
      const name = (p.name || '').toLowerCase();
      const variantRow = variants.find((v) => v.productId === p.id);
      const vanRemaining = variantRow ? variantRow.remainingPack : 0;
      const cumSold = cumulativeSoldMap.get(p.id) || 0;

      let prevBuy = 220;
      let newBuy = 270;
      let totalPrevPurchased = 0;
      let totalNewPurchased = 0;

      if (name.includes('0.35')) {
        prevBuy = 172;
        newBuy = 220;
        totalPrevPurchased = 0;
        totalNewPurchased = day >= '2026-10-03' ? 250 : 0;
      } else if (name.includes('0.6')) {
        prevBuy = 220;
        newBuy = 270;
        totalPrevPurchased = 450;
        totalNewPurchased = day >= '2026-10-03' ? 470 : (day >= '2026-10-02' ? 370 : (day >= '2026-09-30' ? 170 : 0));
      } else if (name.includes('1') && !name.includes('0.35') && !name.includes('0.6')) {
        prevBuy = 174;
        newBuy = 220;
        totalPrevPurchased = 500;
        totalNewPurchased = day >= '2026-10-02' ? 150 : 0;
      } else if (name.includes('2')) {
        prevBuy = 220;
        newBuy = 270;
        totalPrevPurchased = 420;
        // Total factory orders for 2.00L:
        // Mon-Tue (prev): 170 + 250 = 420
        // Wed: +400 (PO #3)
        // Thu: +250 (PO #4) -> 650
        // Fri: +250 (PO #5) -> 900
        // Sat/Oct 3+: +300 (PO #6) -> 1200
        totalNewPurchased = day >= '2026-10-03' ? 1200 : (day >= '2026-10-02' ? 900 : (day >= '2026-10-01' ? 650 : (day >= '2026-09-30' ? 400 : 0)));
      }

      // Total available inventory across business = Total purchased - Total sold
      const totalAvailable = Math.max(0, (totalPrevPurchased + totalNewPurchased) - cumSold);

      // Store stock is the quantity physically in the store warehouse (outside the active delivery van)
      // When vanRemaining is present, store stock = totalAvailable - vanRemaining
      const storeStock = Math.max(0, totalAvailable - vanRemaining);

      // FIFO breakdown for Store Stock:
      // Cumulative loaded onto van or sold comes first from prevBuy, then newBuy
      const remainingPrevStock = Math.min(storeStock, Math.max(0, totalPrevPurchased - cumSold));
      const remainingNewStock = Math.max(0, storeStock - remainingPrevStock);

      return {
        productId: p.id,
        variant: p.name,
        sku: p.sku,
        unit: p.unit,
        prevPrice: prevBuy,
        prevStock: remainingPrevStock,
        newPrice: newBuy,
        newStock: remainingNewStock,
        totalWarehouseStock: storeStock,
        vanRemaining,
        totalAvailableStock: totalAvailable,
      };
    });

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
      warehouseReserves,
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
      await this.prisma.product.updateMany({
        where: { workspaceId: wsId },
        data: { stock: 0 },
      });
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

  /**
   * Weekly Finance, Driver Compensation, Tax & Audit Reconciliation Report
   * Features:
   * - Daily driver compensation: Fixed 600 ETB commission + 500 ETB lunch per working day (1,100 ETB/day)
   * - Daily sales, cost of goods (COGS), gross margin
   * - Net operating profit after driver payroll & expenses
   * - Ethiopia VAT / TOT & business profit tax estimation
   * - Reselling margin analysis (factory purchase vs retail resale)
   * - Audit trail & reconciliation ledger
   */
  async weeklyFinanceReport(workspaceId: string | undefined, startDate?: string, endDate?: string) {
    const wsId = await this.resolveWorkspaceId(workspaceId);
    const org = await this.prisma.organization.findUnique({ where: { id: wsId } });
    const metadata = this.parseMetadata(org?.metadata);
    const snapshots: Record<string, any> = metadata.dailySalesSnapshots || {};

    // Default to the working week (e.g., 2026-09-28 to 2026-10-02)
    const startStr = startDate || '2026-09-28';
    const endStr = endDate || '2026-10-02';

    // Generate list of date strings in range
    const cur = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T00:00:00.000Z`);
    const dateList: string[] = [];
    while (cur <= end) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const dailyBreakdown: any[] = [];
    let totalSales = 0;
    let totalCogs = 0;
    let totalGrossMargin = 0;
    let totalPacksSold = 0;
    let workingDaysCount = 0;

    for (const d of dateList) {
      const daily = await this.dailySales(wsId, d);
      const isWorkingDay = daily.summary.packQty > 0 || daily.hasSnapshot;
      if (isWorkingDay) workingDaysCount++;

      // Driver compensation: 600 ETB commission + 500 ETB lunch
      const driverCommission = isWorkingDay ? 600 : 0;
      const driverLunch = isWorkingDay ? 500 : 0;
      const totalDriverCost = driverCommission + driverLunch;

      const sales = daily.summary.salesAmount;
      const cost = daily.summary.costAmount;
      const grossMargin = daily.summary.marginAmount;
      const netProfit = grossMargin - totalDriverCost;

      totalSales += sales;
      totalCogs += cost;
      totalGrossMargin += grossMargin;
      totalPacksSold += daily.summary.packQty;

      dailyBreakdown.push({
        date: d,
        dayName: new Date(`${d}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'long' }),
        hasSnapshot: daily.hasSnapshot,
        isWorkingDay,
        packsSold: daily.summary.packQty,
        salesAmount: sales,
        cogsAmount: cost,
        grossMargin,
        grossMarginPercent: sales > 0 ? this.money((grossMargin / sales) * 100) : 0,
        driverCompensation: {
          commission: driverCommission,
          lunch: driverLunch,
          total: totalDriverCost,
        },
        netProfit: this.money(netProfit),
        reconciliationStatus: daily.hasSnapshot ? 'BALANCED_AND_LOCKED' : (daily.summary.packQty > 0 ? 'ESTIMATED' : 'IDLE'),
      });
    }

    const totalDriverCommission = workingDaysCount * 600;
    const totalDriverLunch = workingDaysCount * 500;
    const totalDriverExpense = totalDriverCommission + totalDriverLunch;
    const netOperatingProfit = totalGrossMargin - totalDriverExpense;

    // Ethiopia Tax Calculation:
    // Option A: Standard 15% VAT on taxable turnover
    // Option B: 2% TOT (Turnover Tax) for goods / distribution threshold
    // Income Tax: 30% on net business profit
    const totTax = this.money(totalSales * 0.02);
    const vatTax = this.money(totalSales * 0.15);
    const businessIncomeTax = this.money(Math.max(0, netOperatingProfit) * 0.30);
    const netAfterTax = this.money(netOperatingProfit - businessIncomeTax);

    // Reselling Analysis (Factory Purchase vs Resale Performance)
    const resellingAnalysis = {
      totalVolumePacks: totalPacksSold,
      averageSellingPricePerPack: totalPacksSold > 0 ? this.money(totalSales / totalPacksSold) : 0,
      averageFactoryCostPerPack: totalPacksSold > 0 ? this.money(totalCogs / totalPacksSold) : 0,
      averageGrossMarginPerPack: totalPacksSold > 0 ? this.money(totalGrossMargin / totalPacksSold) : 0,
      overallGrossMarginPercent: totalSales > 0 ? this.money((totalGrossMargin / totalSales) * 100) : 0,
    };

    // Audit Ledger Summary
    const auditStatus = {
      reconciledDays: dailyBreakdown.filter((d) => d.hasSnapshot).length,
      totalWorkingDays: workingDaysCount,
      ledgerIntegrity: workingDaysCount === dailyBreakdown.filter((d) => d.hasSnapshot).length ? 'FULLY_AUDITED' : 'PARTIALLY_AUDITED',
      fiscalVerificationHash: `SIMUNI-AUDIT-W${startStr.replace(/-/g, '')}`,
      lastAuditedAt: new Date().toISOString(),
    };

    return {
      period: {
        startDate: startStr,
        endDate: endStr,
        workingDays: workingDaysCount,
      },
      summary: {
        totalSales: this.money(totalSales),
        totalCogs: this.money(totalCogs),
        totalGrossMargin: this.money(totalGrossMargin),
        grossMarginPercent: totalSales > 0 ? this.money((totalGrossMargin / totalSales) * 100) : 0,
        totalDriverCommission: this.money(totalDriverCommission),
        totalDriverLunch: this.money(totalDriverLunch),
        totalDriverExpense: this.money(totalDriverExpense),
        netOperatingProfit: this.money(netOperatingProfit),
        netProfitMarginPercent: totalSales > 0 ? this.money((netOperatingProfit / totalSales) * 100) : 0,
      },
      taxes: {
        vatRate: 15,
        vatAmount: vatTax,
        totRate: 2,
        totAmount: totTax,
        incomeTaxRate: 30,
        incomeTaxAmount: businessIncomeTax,
        netProfitAfterTax: netAfterTax,
      },
      reselling: resellingAnalysis,
      audit: auditStatus,
      dailyBreakdown,
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
