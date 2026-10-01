import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, rawRequest } from '../api/client';
import {
  brand,
  neutral,
  semantic,
  badges,
  spacing,
  radius,
  fontFamily,
  shadows,
} from '../theme';

interface DailySalesVariant {
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
}

interface DailySalesReport {
  date: string;
  hasSnapshot: boolean;
  previousDayAvailable: boolean;
  summary: {
    orders: number;
    packQty: number;
    openingStock: number;
    factoryReceived: number;
    remainingPack: number;
    salesAmount: number;
    costAmount: number;
    marginAmount: number;
    marginPercent: number;
  };
  sources: {
    manual: { label: string; orders: number; packQty: number; salesAmount: number; marginAmount: number };
    auto: { label: string; orders: number; packQty: number; salesAmount: number; marginAmount: number };
  };
  variants: DailySalesVariant[];
}

const todayKey = () => new Date().toISOString().slice(0, 10);

function shiftDate(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function getDayName(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getUTCDay()] || '';
  } catch {
    return '';
  }
}

function money(value: number) {
  return `ETB ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function getPackSize(nameOrSku: string): number {
  const s = (nameOrSku || '').toLowerCase();
  if (s.includes('0.35')) return 24;
  if (s.includes('0.6')) return 24;
  if (s.includes('1') && !s.includes('0.35') && !s.includes('0.6')) return 12;
  if (s.includes('2')) return 6;
  return 24;
}

export default function IngestScreen() {
  const [workspaceName, setWorkspaceName] = useState('Workspace');
  const [date, setDate] = useState(todayKey());
  const [report, setReport] = useState<DailySalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Inventory adjustment / modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'recordSales' | 'quickEdit' | 'pullYesterday'>('recordSales');
  const [selectedVariant, setSelectedVariant] = useState<DailySalesVariant | null>(null);

  // Modal input state
  const [modalDate, setModalDate] = useState(shiftDate(todayKey(), -1));
  const [modalVariantInputs, setModalVariantInputs] = useState<Record<string, {
    openingStock: string;
    factoryReceived: string;
    soldQty: string;
    closingStock: string;
  }>>({});
  const [modalNotes, setModalNotes] = useState('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  // Fetch active workspace dynamically from DB/backend
  useEffect(() => {
    loadWorkspace();
  }, []);

  async function loadWorkspace() {
    try {
      const ws = await rawRequest('/workspace/me');
      if (ws && ws.name) {
        setWorkspaceName(ws.name);
      }
    } catch {
      // Fallback gracefully without breaking
    }
  }

  useEffect(() => {
    loadReport(date);
  }, [date]);

  async function loadReport(targetDate = date, refresh = false) {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      const data = await api.dailySalesReport(targetDate);
      setReport(data);

      if (data?.variants) {
        const initInputs: Record<string, any> = {};
        for (const v of data.variants) {
          initInputs[v.productId] = {
            openingStock: String(v.openingStock ?? 0),
            factoryReceived: String(v.factoryReceived ?? 0),
            soldQty: String(v.packQty ?? 0),
            closingStock: String(v.remainingPack ?? 0),
          };
        }
        setModalVariantInputs(initInputs);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load daily sales report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Live DB Pricing with the 2 ETB selling discount (250/300 ETB, +30 ETB unit margin)
  const variants = useMemo(() => {
    if (!report?.variants) return [];
    return report.variants.map((v) => {
      const sellingPrice = Number(v.sellingPrice) || 250;
      const factoryPrice = Number(v.factoryPrice) || 220;
      const packQty = Number(v.packQty) || 0;
      const salesAmount = packQty * sellingPrice;
      const costAmount = packQty * factoryPrice;
      const marginAmount = salesAmount - costAmount;
      const marginPercent = salesAmount > 0 ? (marginAmount / salesAmount) * 100 : 0;
      const unitMargin = sellingPrice - factoryPrice; // 30 ETB
      const packSize = getPackSize(v.variant || v.sku || '');

      return {
        ...v,
        sellingPrice,
        factoryPrice,
        salesAmount,
        costAmount,
        marginAmount,
        marginPercent: Math.round(marginPercent * 10) / 10,
        unitMargin,
        packSize,
      };
    });
  }, [report]);

  // Overall totals
  const totals = useMemo(() => {
    return variants.reduce(
      (acc, v) => ({
        packQty: acc.packQty + v.packQty,
        openingStock: acc.openingStock + v.openingStock,
        factoryReceived: acc.factoryReceived + v.factoryReceived,
        remainingPack: acc.remainingPack + v.remainingPack,
        salesAmount: acc.salesAmount + v.salesAmount,
        costAmount: acc.costAmount + v.costAmount,
        marginAmount: acc.marginAmount + v.marginAmount,
      }),
      { packQty: 0, openingStock: 0, factoryReceived: 0, remainingPack: 0, salesAmount: 0, costAmount: 0, marginAmount: 0 },
    );
  }, [variants]);

  // Open modal to record sales or reconcile all
  const openReconcileModal = () => {
    setModalMode('recordSales');
    setModalDate(date);
    if (report?.variants) {
      const init: Record<string, any> = {};
      for (const v of report.variants) {
        init[v.productId] = {
          openingStock: String(v.openingStock || 0),
          factoryReceived: String(v.factoryReceived || 0),
          soldQty: String(v.packQty || 0),
          closingStock: String(v.remainingPack || 0),
        };
      }
      setModalVariantInputs(init);
    }
    setModalVisible(true);
  };

  // Open quick edit for single variant count
  const openQuickEdit = (v: DailySalesVariant) => {
    setSelectedVariant(v);
    setModalMode('quickEdit');
    setModalVariantInputs((prev) => ({
      ...prev,
      [v.productId]: {
        openingStock: String(v.openingStock || 0),
        factoryReceived: String(v.factoryReceived || 0),
        soldQty: String(v.packQty || 0),
        closingStock: String(v.remainingPack || 0),
      },
    }));
    setModalVisible(true);
  };

  // Modal Input Change:
  // ClosingStock = Opening + Inflow - Sold
  // OR if Physical Count entered: Sold = Opening + Inflow - Physical Count
  const handleModalInputChange = (
    productId: string,
    field: 'openingStock' | 'factoryReceived' | 'soldQty' | 'closingStock',
    val: string
  ) => {
    setModalVariantInputs((prev) => {
      const current = prev[productId] || { openingStock: '0', factoryReceived: '0', soldQty: '0', closingStock: '0' };
      const updated = { ...current, [field]: val };

      const open = Number(updated.openingStock) || 0;
      const inflow = Number(updated.factoryReceived) || 0;
      const sold = Number(updated.soldQty) || 0;
      const close = Number(updated.closingStock) || 0;

      if (field === 'soldQty' || field === 'openingStock' || field === 'factoryReceived') {
        updated.closingStock = String(Math.max(0, open + inflow - sold));
      } else if (field === 'closingStock') {
        updated.soldQty = String(Math.max(0, open + inflow - close));
      }

      return { ...prev, [productId]: updated };
    });
  };

  // Save Inventory Snapshot to backend
  const handleSaveSnapshot = async () => {
    try {
      setIsSavingSnapshot(true);
      const targetDate = modalDate || date;

      const variantsPayload = variants.map((v) => {
        const inp = modalVariantInputs[v.productId] || {
          openingStock: String(v.openingStock),
          factoryReceived: String(v.factoryReceived),
          soldQty: String(v.packQty),
          closingStock: String(v.remainingPack),
        };
        return {
          productId: v.productId,
          openingStock: Number(inp.openingStock) || 0,
          factoryReceived: Number(inp.factoryReceived) || 0,
          soldQty: Number(inp.soldQty) || 0,
          closingStock: Number(inp.closingStock) || 0,
          sellingPrice: v.sellingPrice,
          factoryPrice: v.factoryPrice,
        };
      });

      await api.saveInventorySnapshot({
        date: targetDate,
        notes: modalNotes,
        variants: variantsPayload,
        updateProductStock: true,
      });

      Alert.alert(
        'Ledger Updated',
        `Sales & stock ledger for ${targetDate} verified and saved. Database inventory updated.`,
      );
      setModalVisible(false);
      loadReport(date, true);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save inventory report.');
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Auto-fetch yesterday's report to populate opening stock
  const handleLoadPreviousDayReport = async () => {
    try {
      setLoading(true);
      const yesterday = shiftDate(date, -1);
      const prevData = await api.dailySalesReport(yesterday);
      if (prevData?.variants && prevData.variants.length > 0) {
        const newInputs: Record<string, any> = {};
        for (const v of prevData.variants) {
          const ending = v.remainingPack ?? 0;
          newInputs[v.productId] = {
            openingStock: String(ending),
            factoryReceived: String(v.factoryReceived || 0),
            soldQty: String(v.packQty || 0),
            closingStock: String(ending),
          };
        }
        setModalVariantInputs(newInputs);
        Alert.alert(
          'Yesterday Stock Loaded',
          `Closing stock from ${yesterday} successfully pulled as opening stock.`,
        );
      } else {
        Alert.alert('Notice', `No previous report recorded for ${yesterday}. You can enter values manually.`);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not fetch previous report.');
    } finally {
      setLoading(false);
    }
  };

  const recordId = useMemo(() => {
    const clean = date.replace(/-/g, '');
    return `#REC-${clean.slice(2, 6)}`;
  }, [date]);

  const displayOrgName = useMemo(() => {
    if (!workspaceName) return 'Simuni Workspace';
    return workspaceName.length > 20 ? `${workspaceName.slice(0, 19)}...` : workspaceName;
  }, [workspaceName]);

  const orgInitials = useMemo(() => {
    if (!workspaceName) return 'SW';
    const words = workspaceName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return workspaceName.slice(0, 2).toUpperCase();
  }, [workspaceName]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReport(date, true)} />}
    >
      {/* 1. Top Enterprise App Bar */}
      <View style={styles.topBar}>
        <View style={styles.orgDropdown}>
          <View style={styles.orgIconBox}>
            <Text style={{ fontSize: 13 }}>🏛️</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.orgName}>{displayOrgName}</Text>
              <Text style={styles.chevronSymbol}>↕</Text>
            </View>
            <Text style={styles.orgSubtitle}>Inventory Reconcile</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <View style={styles.syncBadge}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>SYNCED</Text>
          </View>
          <Pressable style={styles.iconCircle}>
            <Text style={{ fontSize: 13 }}>🔔</Text>
          </Pressable>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{orgInitials}</Text>
          </View>
        </View>
      </View>

      {/* 2. Main Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Daily Sales & Stock</Text>
        <Text style={styles.pageSubtitle}>Daily ledger verified with factory dispatch manifest</Text>
      </View>

      {/* 3. Date & Navigation Controls */}
      <View style={styles.dateBarRow}>
        <Pressable style={styles.dateChevronBtn} onPress={() => setDate(shiftDate(date, -1))}>
          <Text style={styles.dateChevronText}>‹</Text>
        </Pressable>

        <View style={styles.dateDisplayPill}>
          <Text style={styles.calendarIcon}>🗓️</Text>
          <Text style={styles.dateDisplayText}>{date}</Text>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{getDayName(date)}</Text>
          </View>
          {report?.hasSnapshot && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>SAVED</Text>
            </View>
          )}
        </View>

        <Pressable style={styles.dateChevronBtn} onPress={() => setDate(shiftDate(date, 1))}>
          <Text style={styles.dateChevronText}>›</Text>
        </Pressable>
      </View>

      {/* 4. Action Buttons Row: [Record Sales] & [Pull Yesterday] */}
      <View style={styles.actionRow}>
        <Pressable style={styles.recordSalesBtn} onPress={openReconcileModal}>
          <Text style={styles.recordSalesIcon}>⊕</Text>
          <Text style={styles.recordSalesText}>Record Sales</Text>
        </Pressable>

        <Pressable style={styles.pullYesterdayBtn} onPress={handleLoadPreviousDayReport}>
          <Text style={styles.pullYesterdayIcon}>🕒</Text>
          <Text style={styles.pullYesterdayText}>Pull Yesterday</Text>
        </Pressable>
      </View>

      {/* 5. 2x2 Clean Metric Cards Grid */}
      <View style={styles.metricGrid}>
        {/* Sales Revenue */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardTitle}>SALES REVENUE</Text>
            <Text style={styles.metricCardIcon}>💵</Text>
          </View>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricUnit}>ETB</Text>
            <Text style={styles.metricLargeNumber}>
              {Number(totals.salesAmount || 0).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.metricCardSub}>{totals.packQty} packs billed today</Text>
        </View>

        {/* Gross Margin */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardTitle}>GROSS MARGIN</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendText}>
                ↗{totals.salesAmount > 0 ? ((totals.marginAmount / totals.salesAmount) * 100).toFixed(1) : 0}%
              </Text>
            </View>
          </View>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricUnit}>ETB</Text>
            <Text style={styles.metricLargeNumber}>
              {Number(totals.marginAmount || 0).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.metricCardSub}>Avg +30 ETB/pk</Text>
        </View>

        {/* Factory COGS */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardTitle}>FACTORY COGS</Text>
            <Text style={styles.metricCardIcon}>📊</Text>
          </View>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricUnit}>ETB</Text>
            <Text style={styles.metricLargeNumber}>
              {Number(totals.costAmount || 0).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.metricCardSub}>Direct purchase baseline</Text>
        </View>

        {/* Warehouse Stock (Warm Sand/Cream surface) */}
        <View style={[styles.metricCard, styles.warehouseStockCard]}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricCardTitle}>WAREHOUSE STOCK</Text>
            <Text style={styles.metricCardIcon}>📦</Text>
          </View>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricLargeNumber}>{totals.remainingPack}</Text>
            <Text style={[styles.metricUnit, { marginLeft: 4, alignSelf: 'flex-end', marginBottom: 2 }]}>
              PACKS
            </Text>
          </View>
          <Text style={styles.metricCardSub}>
            {totals.openingStock} init + {totals.factoryReceived} in
          </Text>
        </View>
      </View>

      {/* 6. Reconciliation Equilibrium Banner */}
      <View style={styles.equilibriumCard}>
        <View style={styles.equilibriumHeader}>
          <Text style={styles.equilibriumTitle}>RECONCILIATION EQUILIBRIUM</Text>
          <Text style={{ fontSize: 13 }}>⚖️</Text>
        </View>
        <View style={styles.equilibriumRow}>
          <View style={styles.eqCol}>
            <Text style={styles.eqLabel}>OPEN</Text>
            <Text style={styles.eqValue}>{totals.openingStock}</Text>
          </View>

          <Text style={styles.eqOp}>+</Text>

          <View style={styles.eqCol}>
            <Text style={styles.eqLabel}>INFLOW</Text>
            <Text style={[styles.eqValue, { color: semantic.successDark }]}>+{totals.factoryReceived}</Text>
          </View>

          <Text style={styles.eqOp}>-</Text>

          <View style={styles.eqCol}>
            <Text style={styles.eqLabel}>SOLD</Text>
            <Text style={[styles.eqValue, { color: semantic.danger }]}>-{totals.packQty}</Text>
          </View>

          <Text style={styles.eqOp}>=</Text>

          <View style={styles.eqCloseBox}>
            <Text style={styles.eqCloseLabel}>CLOSE</Text>
            <Text style={styles.eqCloseValue}>{totals.remainingPack}</Text>
          </View>
        </View>
      </View>

      {/* 7. Sales Channels Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Sales Channels</Text>
        <Text style={styles.sectionMetaRight}>{report?.summary?.orders || 0} orders verified</Text>
      </View>

      <View style={styles.channelsRow}>
        {/* Manual Agents Card */}
        <View style={styles.channelCard}>
          <View style={styles.channelTitleRow}>
            <Text style={{ fontSize: 13 }}>💼</Text>
            <Text style={styles.channelTitle}>Manual Agents</Text>
          </View>
          <View style={styles.channelStatLine}>
            <Text style={styles.channelStatLabel}>Billed Orders:</Text>
            <Text style={styles.channelStatValue}>{report?.sources?.manual?.orders || 0}</Text>
          </View>
          <View style={styles.channelStatLine}>
            <Text style={styles.channelStatLabel}>Volume Sold:</Text>
            <Text style={styles.channelStatValue}>{report?.sources?.manual?.packQty || 0} pk</Text>
          </View>
          <View style={[styles.channelStatLine, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: neutral[150] }]}>
            <Text style={styles.channelStatLabel}>Gross Total:</Text>
            <Text style={styles.channelStatBold}>{money(report?.sources?.manual?.salesAmount || 0)}</Text>
          </View>
        </View>

        {/* Telegram Bot Card */}
        <View style={styles.channelCard}>
          <View style={styles.channelTitleRow}>
            <Text style={{ fontSize: 13 }}>🤖</Text>
            <Text style={styles.channelTitle}>Telegram Bot</Text>
          </View>
          <View style={styles.channelStatLine}>
            <Text style={styles.channelStatLabel}>Billed Orders:</Text>
            <Text style={styles.channelStatValue}>{report?.sources?.auto?.orders || 0}</Text>
          </View>
          <View style={styles.channelStatLine}>
            <Text style={styles.channelStatLabel}>Volume Sold:</Text>
            <Text style={styles.channelStatValue}>{report?.sources?.auto?.packQty || 0} pk</Text>
          </View>
          <View style={[styles.channelStatLine, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: neutral[150] }]}>
            <Text style={styles.channelStatLabel}>Gross Total:</Text>
            <Text style={styles.channelStatBold}>{money(report?.sources?.auto?.salesAmount || 0)}</Text>
          </View>
        </View>
      </View>

      {/* 8. Variant Stock & Margins Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Variant Stock & Margins</Text>
        <Pressable style={styles.reconcileAllPill} onPress={openReconcileModal}>
          <Text style={{ fontSize: 11, marginRight: 3 }}>🎚️</Text>
          <Text style={styles.reconcileAllText}>Reconcile All</Text>
        </Pressable>
      </View>

      {/* Variant Cards */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={brand.black} />
          <Text style={styles.loadingText}>Loading variants ledger...</Text>
        </View>
      ) : (
        variants.map((v) => {
          const hasSold = v.packQty > 0;
          return (
            <View key={v.productId} style={styles.variantItemCard}>
              {/* Variant Header Row */}
              <View style={styles.variantHeaderRow}>
                <Text style={styles.variantItemName}>{v.variant}</Text>
                <Pressable style={styles.editPillBtn} onPress={() => openQuickEdit(v)}>
                  <Text style={{ fontSize: 11, marginRight: 2 }}>✏️</Text>
                  <Text style={styles.editPillText}>Edit</Text>
                </Pressable>
              </View>

              {/* Pricing Subtext */}
              <Text style={styles.variantPricingSub}>
                Sell {v.sellingPrice} ETB · Buy {v.factoryPrice} ETB · Margin +{v.unitMargin} ETB
              </Text>

              {/* Stock Equation Flow Pill */}
              <View style={styles.variantFlowContainer}>
                <View style={styles.vFlowCol}>
                  <Text style={styles.vFlowLabel}>OPEN</Text>
                  <Text style={styles.vFlowValue}>{v.openingStock}</Text>
                </View>
                <Text style={styles.vFlowOp}>+</Text>
                <View style={styles.vFlowCol}>
                  <Text style={styles.vFlowLabel}>IN</Text>
                  <Text style={[styles.vFlowValue, v.factoryReceived > 0 && { color: semantic.successDark, fontWeight: '800' }]}>
                    +{v.factoryReceived}
                  </Text>
                </View>
                <Text style={styles.vFlowOp}>-</Text>
                <View style={styles.vFlowCol}>
                  <Text style={styles.vFlowLabel}>SOLD</Text>
                  <Text style={[styles.vFlowValue, v.packQty > 0 && { color: semantic.danger, fontWeight: '800' }]}>
                    -{v.packQty}
                  </Text>
                </View>
                <Text style={styles.vFlowOp}>=</Text>
                <View style={styles.vFlowRemBadge}>
                  <Text style={styles.vFlowRemText}>
                    REM <Text style={{ fontWeight: '800' }}>{v.remainingPack}</Text> pk
                  </Text>
                </View>
              </View>

              {/* Variant Financial Summary Footer */}
              <View style={styles.variantFinanceRow}>
                <Text style={styles.variantFinanceText}>
                  Sales: <Text style={styles.boldText}>{money(v.salesAmount)}</Text>
                </Text>
                <Text style={styles.variantFinanceText}>
                  Cost: <Text style={styles.boldText}>{money(v.costAmount)}</Text>
                </Text>
                {hasSold ? (
                  <Text style={[styles.variantFinanceText, { color: semantic.successDark, fontWeight: '800' }]}>
                    Margin: +{money(v.marginAmount)} ({v.marginPercent}%)
                  </Text>
                ) : (
                  <Text style={styles.variantFinanceText}>
                    Margin: <Text style={styles.boldText}>{money(0)}</Text>
                  </Text>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* 9. Bottom Ledger Lock & Post Section */}
      <View style={styles.ledgerLockCard}>
        <View style={styles.ledgerLockHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ color: semantic.successDark, fontSize: 13, fontWeight: '800' }}>✓</Text>
            <Text style={styles.ledgerStatusText}>Ledger Balanced & Ready</Text>
          </View>
          <Text style={styles.ledgerRecId}>RecID: {recordId}</Text>
        </View>

        <Pressable
          style={[styles.lockButton, isSavingSnapshot && { opacity: 0.6 }]}
          onPress={handleSaveSnapshot}
          disabled={isSavingSnapshot}
        >
          {isSavingSnapshot ? (
            <ActivityIndicator color={neutral[0]} size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13 }}>🔒</Text>
              <Text style={styles.lockButtonText}>Lock & Post Ledger for {date}</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.lockFooterNote}>
          Locking creates an immutable record on Ethiopian Birr fiscal store.
        </Text>
      </View>

      {/* 10. Reconcile / Stock Adjustment Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {modalMode === 'recordSales'
                    ? 'Record Sales & Inventory'
                    : `Stock Count: ${selectedVariant?.variant}`}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Formula: Sold = Opening + Factory Inflow - Physical Count
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={{ fontSize: 18, color: neutral[500] }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {(modalMode === 'recordSales' ? variants : (selectedVariant ? [selectedVariant] : [])).map((v) => {
                const input = modalVariantInputs[v.productId] || {
                  openingStock: String(v.openingStock),
                  factoryReceived: String(v.factoryReceived),
                  soldQty: String(v.packQty),
                  closingStock: String(v.remainingPack),
                };

                const calculatedSold = Number(input.soldQty) || 0;
                const calcSales = calculatedSold * v.sellingPrice;
                const calcMargin = calculatedSold * v.unitMargin;

                return (
                  <View key={v.productId} style={styles.modalVariantCard}>
                    <View style={styles.modalVCardTop}>
                      <Text style={styles.modalVCardTitle}>{v.variant}</Text>
                      <Text style={styles.modalVCardPill}>
                        Price: {v.sellingPrice} ETB · Margin: +{v.unitMargin} ETB
                      </Text>
                    </View>

                    <View style={styles.modalInputGrid}>
                      <View style={styles.mCol}>
                        <Text style={styles.mColLabel}>Opening</Text>
                        <TextInput
                          style={styles.mInput}
                          keyboardType="numeric"
                          value={input.openingStock}
                          onChangeText={(val) => handleModalInputChange(v.productId, 'openingStock', val)}
                        />
                      </View>

                      <View style={styles.mCol}>
                        <Text style={styles.mColLabel}>+ Factory</Text>
                        <TextInput
                          style={styles.mInput}
                          keyboardType="numeric"
                          value={input.factoryReceived}
                          onChangeText={(val) => handleModalInputChange(v.productId, 'factoryReceived', val)}
                        />
                      </View>

                      <View style={styles.mCol}>
                        <Text style={[styles.mColLabel, { color: brand.black, fontWeight: '800' }]}>
                          = Count
                        </Text>
                        <TextInput
                          style={[styles.mInput, styles.highlightMInput]}
                          keyboardType="numeric"
                          value={input.closingStock}
                          onChangeText={(val) => handleModalInputChange(v.productId, 'closingStock', val)}
                        />
                      </View>

                      <View style={styles.mCol}>
                        <Text style={[styles.mColLabel, { color: semantic.danger }]}>Sold Qty</Text>
                        <TextInput
                          style={[styles.mInput, styles.soldMInput]}
                          keyboardType="numeric"
                          value={input.soldQty}
                          onChangeText={(val) => handleModalInputChange(v.productId, 'soldQty', val)}
                        />
                      </View>
                    </View>

                    <View style={styles.modalCalcRow}>
                      <Text style={styles.modalCalcText}>
                        Sales: <Text style={{ fontWeight: '700' }}>{money(calcSales)}</Text>
                      </Text>
                      <Text style={[styles.modalCalcText, { color: semantic.successDark, fontWeight: '700' }]}>
                        Margin: +{money(calcMargin)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              <View style={{ marginTop: 12 }}>
                <Text style={styles.mColLabel}>REMARKS / VERIFICATION NOTE:</Text>
                <TextInput
                  style={[styles.mInput, { height: 56, textAlignVertical: 'top', marginTop: 4 }]}
                  multiline
                  placeholder="e.g. End of day warehouse physical inventory count verified"
                  value={modalNotes}
                  onChangeText={setModalNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={isSavingSnapshot}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, isSavingSnapshot && { opacity: 0.6 }]}
                onPress={handleSaveSnapshot}
                disabled={isSavingSnapshot}
              >
                {isSavingSnapshot ? (
                  <ActivityIndicator color={neutral[0]} size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Post & Update Ledger</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutral[100],
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['5xl'],
  },

  // 1. Top Enterprise App Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  orgDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orgIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgName: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '700',
    color: brand.black,
  },
  chevronSymbol: {
    fontSize: 10,
    color: neutral[500],
  },
  orgSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: neutral[500],
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: semantic.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: semantic.success,
  },
  syncText: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '800',
    color: semantic.successDark,
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: neutral[0],
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: brand.darkGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '800',
    color: neutral[0],
  },

  // 2. Page Header
  pageHeader: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    fontWeight: '700',
    color: brand.black,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[600],
    marginTop: 3,
  },

  // 3. Date Bar Row
  dateBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateChevronBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: neutral[0],
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  dateChevronText: {
    fontFamily: fontFamily.sans,
    fontSize: 18,
    color: brand.black,
    fontWeight: '600',
  },
  dateDisplayPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: neutral[0],
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.sm,
    height: 36,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  calendarIcon: {
    fontSize: 13,
  },
  dateDisplayText: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: '700',
    color: brand.black,
  },
  dayBadge: {
    backgroundColor: neutral[200],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  dayBadgeText: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    color: brand.black,
  },
  savedBadge: {
    backgroundColor: badges.gold.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  savedBadgeText: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '800',
    color: badges.gold.text,
  },

  // 4. Action Row: Record Sales / Pull Yesterday
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  recordSalesBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: brand.gold,
    borderRadius: radius.md,
    paddingVertical: 11,
    ...shadows.sm,
  },
  recordSalesIcon: {
    color: brand.black,
    fontSize: 14,
    fontWeight: '800',
  },
  recordSalesText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '800',
    color: brand.black,
  },
  pullYesterdayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral[200],
    paddingVertical: 11,
    ...shadows.sm,
  },
  pullYesterdayIcon: {
    fontSize: 12,
  },
  pullYesterdayText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: neutral[700],
  },

  // 5. 2x2 Metric Grid
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  warehouseStockCard: {
    backgroundColor: brand.cream,
    borderColor: brand.goldMuted,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricCardTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '800',
    color: neutral[600],
    letterSpacing: 0.4,
  },
  metricCardIcon: {
    fontSize: 13,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 4,
  },
  metricUnit: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: neutral[600],
  },
  metricLargeNumber: {
    fontFamily: fontFamily.sans,
    fontSize: 24,
    fontWeight: '800',
    color: brand.black,
    letterSpacing: -0.5,
  },
  metricCardSub: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[500],
  },
  trendBadge: {
    backgroundColor: semantic.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  trendText: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '800',
    color: semantic.successDark,
  },

  // 6. Reconciliation Equilibrium Banner
  equilibriumCard: {
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  equilibriumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  equilibriumTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '800',
    color: neutral[600],
    letterSpacing: 0.5,
  },
  equilibriumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eqCol: {
    alignItems: 'center',
    flex: 1,
  },
  eqLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '700',
    color: neutral[400],
  },
  eqValue: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    fontWeight: '800',
    color: brand.black,
    marginTop: 2,
  },
  eqOp: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '700',
    color: neutral[300],
  },
  eqCloseBox: {
    alignItems: 'center',
    flex: 1.1,
    backgroundColor: badges.gold.bg,
    borderRadius: radius.xs,
    paddingVertical: 4,
  },
  eqCloseLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '800',
    color: badges.gold.text,
  },
  eqCloseValue: {
    fontFamily: fontFamily.mono,
    fontSize: 15,
    fontWeight: '900',
    color: badges.gold.text,
    marginTop: 1,
  },

  // 7. Section Header & Sales Channels
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '700',
    color: brand.black,
  },
  sectionMetaRight: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[500],
  },
  channelsRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  channelCard: {
    flex: 1,
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  channelTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  channelStatLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  channelStatLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
  },
  channelStatValue: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '600',
    color: brand.black,
  },
  channelStatBold: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    fontWeight: '800',
    color: brand.black,
  },

  // 8. Variant Stock & Margins Section
  reconcileAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: badges.gold.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  reconcileAllText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: badges.gold.text,
  },
  variantItemCard: {
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    marginBottom: 10,
    ...shadows.sm,
  },
  variantHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variantItemName: {
    fontFamily: fontFamily.serif,
    fontSize: 15,
    fontWeight: '700',
    color: brand.black,
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  editPillText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '600',
    color: neutral[700],
  },
  variantPricingSub: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
    marginTop: 2,
    marginBottom: 8,
  },
  variantFlowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: neutral[50],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: neutral[200],
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    marginBottom: 8,
  },
  vFlowCol: {
    alignItems: 'center',
    flex: 1,
  },
  vFlowLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 8,
    fontWeight: '700',
    color: neutral[400],
  },
  vFlowValue: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
    marginTop: 1,
  },
  vFlowOp: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[400],
  },
  vFlowRemBadge: {
    backgroundColor: badges.gold.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  vFlowRemText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: badges.gold.text,
  },
  variantFinanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: neutral[150],
  },
  variantFinanceText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
  },
  boldText: {
    fontFamily: fontFamily.mono,
    fontWeight: '700',
    color: brand.black,
  },

  // 9. Bottom Ledger Lock Card
  ledgerLockCard: {
    backgroundColor: neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: neutral[200],
    marginTop: spacing.sm,
    marginBottom: spacing['2xl'],
    ...shadows.sm,
  },
  ledgerLockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ledgerStatusText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  ledgerRecId: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: neutral[600],
    fontWeight: '600',
  },
  lockButton: {
    backgroundColor: brand.gold,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...shadows.sm,
  },
  lockButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '800',
    color: brand.black,
  },
  lockFooterNote: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: neutral[500],
    textAlign: 'center',
  },

  // Loading & Error
  loadingBox: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[600],
  },
  errorCard: {
    backgroundColor: semantic.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: spacing.md,
  },
  errorTitle: {
    color: semantic.dangerDark,
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: semantic.dangerDark,
    fontSize: 11,
    marginTop: 2,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: semantic.dangerDark,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: 6,
  },
  retryButtonText: {
    color: neutral[0],
    fontWeight: '700',
    fontSize: 11,
  },

  // 10. Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: neutral[0],
    borderRadius: radius.lg,
    maxHeight: '88%',
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '700',
    color: brand.black,
  },
  modalSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 420,
  },
  modalVariantCard: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: neutral[50],
  },
  modalVCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalVCardTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 13,
    fontWeight: '700',
    color: brand.black,
  },
  modalVCardPill: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: neutral[600],
  },
  modalInputGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  mCol: {
    flex: 1,
  },
  mColLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '700',
    color: neutral[600],
    marginBottom: 3,
  },
  mInput: {
    backgroundColor: neutral[0],
    borderWidth: 1,
    borderColor: neutral[300],
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontFamily: fontFamily.mono,
    fontSize: 13,
    color: brand.black,
    textAlign: 'center',
  },
  highlightMInput: {
    borderColor: brand.gold,
    backgroundColor: brand.cream,
    fontWeight: '800',
  },
  soldMInput: {
    borderColor: semantic.danger,
    backgroundColor: semantic.dangerLight,
    color: semantic.dangerDark,
    fontWeight: '800',
  },
  modalCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: neutral[200],
  },
  modalCalcText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: neutral[700],
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: neutral[200],
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: neutral[100],
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: neutral[700],
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    ...shadows.sm,
  },
  modalSubmitText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '800',
    color: brand.black,
  },
});
