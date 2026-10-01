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
import { api } from '../api/client';
import { brand, neutral, semantic, spacing, radius, fontFamily, shadows } from '../theme';

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
  const [date, setDate] = useState(todayKey());
  const [report, setReport] = useState<DailySalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Inventory adjustment / previous report modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'previousReport' | 'quickEdit'>('previousReport');
  const [selectedVariant, setSelectedVariant] = useState<DailySalesVariant | null>(null);

  // Inputs for modal
  const [modalDate, setModalDate] = useState(shiftDate(todayKey(), -1));
  const [modalVariantInputs, setModalVariantInputs] = useState<Record<string, {
    openingStock: string;
    factoryReceived: string;
    soldQty: string;
    closingStock: string;
  }>>({});
  const [modalNotes, setModalNotes] = useState('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  const isToday = useMemo(() => date === todayKey(), [date]);

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

  // Clean computed variants using live DB pricing with the 2 ETB discount
  const variants = useMemo(() => {
    if (!report?.variants) return [];
    return report.variants.map((v) => {
      // Selling price and factory price directly from database
      const sellingPrice = Number(v.sellingPrice) || 250;
      const factoryPrice = Number(v.factoryPrice) || 220;
      const packQty = Number(v.packQty) || 0;
      const salesAmount = packQty * sellingPrice;
      const costAmount = packQty * factoryPrice;
      const marginAmount = salesAmount - costAmount;
      const marginPercent = salesAmount > 0 ? (marginAmount / salesAmount) * 100 : 0;
      const unitMargin = sellingPrice - factoryPrice; // e.g. 250 - 220 = 30 ETB, or 300 - 270 = 30 ETB
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

  // Open modal to add or adjust previous sales report
  const openPreviousReportModal = () => {
    setModalMode('previousReport');
    setModalDate(shiftDate(date, -1));
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

  // Input change inside modal:
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
      const targetDate = modalMode === 'previousReport' ? modalDate : date;

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
        'Inventory Saved',
        `Sales & inventory report for ${targetDate} saved successfully. Inventory updated in database.`,
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
          'Previous Stock Loaded',
          `Loaded report from ${yesterday}. Yesterday's ending inventory is now set as opening stock.`,
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReport(date, true)} />}
    >
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.eyebrow}>ETHIOPIA B2B DISPATCH · SALES & INVENTORY</Text>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SYNCED</Text>
          </View>
          <Text style={styles.title}>Daily Sales Report</Text>
          <Text style={styles.subtitle}>Sales, factory inflow & stock calculation from database</Text>
        </View>
        <Pressable
          style={[styles.todayButton, isToday && styles.todayButtonActive]}
          onPress={() => setDate(todayKey())}
        >
          <Text style={[styles.todayButtonText, isToday && styles.todayButtonTextActive]}>
            {isToday ? 'Today' : 'Go Today'}
          </Text>
        </Pressable>
      </View>

      {/* 2. Date Navigation Bar */}
      <View style={styles.dateBar}>
        <Pressable style={styles.dateNavBtn} onPress={() => setDate(shiftDate(date, -1))}>
          <Text style={styles.dateNavBtnText}>‹ Prev</Text>
        </Pressable>
        <View style={styles.datePill}>
          <Text style={styles.dateLabel}>{date}</Text>
          {report?.hasSnapshot && (
            <View style={styles.snapshotBadge}>
              <Text style={styles.snapshotBadgeText}>SAVED</Text>
            </View>
          )}
        </View>
        <Pressable style={styles.dateNavBtn} onPress={() => setDate(shiftDate(date, 1))}>
          <Text style={styles.dateNavBtnText}>Next ›</Text>
        </Pressable>
      </View>

      {/* 3. Action Buttons */}
      <View style={styles.actionBar}>
        <Pressable style={styles.primaryActionBtn} onPress={openPreviousReportModal}>
          <Text style={styles.primaryActionBtnText}>➕ Add / Input Previous Sales Report</Text>
        </Pressable>
        <Pressable style={styles.secondaryActionBtn} onPress={handleLoadPreviousDayReport}>
          <Text style={styles.secondaryActionBtnText}>⏮️ Pull Yesterday's Stock</Text>
        </Pressable>
      </View>

      {/* 4. Loading / Error / Data */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={brand.gold} size="large" />
          <Text style={styles.loadingText}>Loading daily sales & inventory report...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Report unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadReport(date)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : report ? (
        <>
          {/* 5. Summary KPI Cards */}
          <View style={styles.summaryGrid}>
            <MetricCard
              label="TOTAL SALES REVENUE"
              value={money(totals.salesAmount)}
              sub={`${totals.packQty} packs sold`}
            />
            <MetricCard
              label="GROSS MARGIN (+30 ETB/PK)"
              value={money(totals.marginAmount)}
              sub={`${totals.salesAmount > 0 ? ((totals.marginAmount / totals.salesAmount) * 100).toFixed(1) : 0}% net margin`}
              tone="gold"
            />
            <MetricCard
              label="FACTORY COGS"
              value={money(totals.costAmount)}
              sub="Factory buy price from DB"
            />
            <MetricCard
              label="REMAINING INVENTORY"
              value={`${totals.remainingPack} packs`}
              sub={`Opening: ${totals.openingStock} | Inflow: +${totals.factoryReceived}`}
              tone="stock"
            />
          </View>

          {/* 6. Clean Inventory Flow Banner */}
          <View style={styles.formulaBanner}>
            <Text style={styles.formulaTitle}>INVENTORY ACCOUNTING FLOW</Text>
            <View style={styles.formulaRow}>
              <View style={styles.formulaStep}>
                <Text style={styles.formulaLabel}>Opening Stock</Text>
                <Text style={styles.formulaValue}>{totals.openingStock} pk</Text>
              </View>
              <Text style={styles.formulaOp}>+</Text>
              <View style={styles.formulaStep}>
                <Text style={styles.formulaLabel}>Factory Inflow</Text>
                <Text style={styles.formulaValue}>+{totals.factoryReceived} pk</Text>
              </View>
              <Text style={styles.formulaOp}>-</Text>
              <View style={styles.formulaStep}>
                <Text style={styles.formulaLabel}>Sold Qty</Text>
                <Text style={[styles.formulaValue, { color: '#B91C1C' }]}>-{totals.packQty} pk</Text>
              </View>
              <Text style={styles.formulaOp}>=</Text>
              <View style={[styles.formulaStep, styles.formulaStepActive]}>
                <Text style={styles.formulaLabelActive}>Closing Stock</Text>
                <Text style={styles.formulaValueActive}>{totals.remainingPack} pk</Text>
              </View>
            </View>
          </View>

          {/* 7. Source Breakdown Cards */}
          <View style={styles.sourceRow}>
            <SourceCard
              title="Manual Agent Orders"
              orders={report.sources.manual.orders}
              packQty={report.sources.manual.packQty}
              salesAmount={report.sources.manual.salesAmount}
              marginAmount={report.sources.manual.marginAmount}
            />
            <SourceCard
              title="Auto Telegram Orders"
              orders={report.sources.auto.orders}
              packQty={report.sources.auto.packQty}
              salesAmount={report.sources.auto.salesAmount}
              marginAmount={report.sources.auto.marginAmount}
            />
          </View>

          {/* 8. Variant Inventory & Sales Table Header */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Variant Sales & Stock Summary</Text>
              <Text style={styles.sectionSubtitle}>
                Live prices from database with 2 ETB discount (250 / 300 ETB, +30 ETB margin)
              </Text>
            </View>
            <Pressable style={styles.reconcileBtn} onPress={openPreviousReportModal}>
              <Text style={styles.reconcileBtnText}>Reconcile</Text>
            </Pressable>
          </View>

          {/* 9. Product Variant Cards */}
          {variants.map((v) => (
            <View key={v.productId} style={styles.variantCard}>
              <View style={styles.variantTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.variantTitleRow}>
                    <Text style={styles.variantName}>{v.variant}</Text>
                    <View style={styles.variantSkuBadge}>
                      <Text style={styles.variantSkuText}>{v.packSize} bottles/pack</Text>
                    </View>
                  </View>
                  <Text style={styles.pricingSub}>
                    Sell: <Text style={styles.boldDark}>{v.sellingPrice} ETB</Text> · Buy: <Text style={styles.boldDark}>{v.factoryPrice} ETB</Text> · Unit Margin: <Text style={styles.marginText}>+{v.unitMargin} ETB</Text>
                  </Text>
                </View>

                <Pressable style={styles.quickEditBtn} onPress={() => openQuickEdit(v)}>
                  <Text style={styles.quickEditBtnText}>✏️ Edit Count</Text>
                </Pressable>
              </View>

              {/* Stock Flow Bar */}
              <View style={styles.flowBar}>
                <View style={styles.flowItem}>
                  <Text style={styles.flowLabel}>OPENING</Text>
                  <Text style={styles.flowVal}>{v.openingStock}</Text>
                </View>
                <Text style={styles.flowSym}>+</Text>
                <View style={styles.flowItem}>
                  <Text style={styles.flowLabel}>FACTORY</Text>
                  <Text style={styles.flowVal}>+{v.factoryReceived}</Text>
                </View>
                <Text style={styles.flowSym}>-</Text>
                <View style={styles.flowItem}>
                  <Text style={styles.flowLabel}>SOLD</Text>
                  <Text style={[styles.flowVal, { color: '#B91C1C' }]}>-{v.packQty}</Text>
                </View>
                <Text style={styles.flowSym}>=</Text>
                <View style={[styles.flowItem, styles.flowItemHighlight]}>
                  <Text style={styles.flowLabelHighlight}>REMAINING</Text>
                  <Text style={styles.flowValHighlight}>{v.remainingPack} pk</Text>
                </View>
              </View>

              {/* Financials Row */}
              <View style={styles.variantFinRow}>
                <View style={styles.finCol}>
                  <Text style={styles.finLabel}>TOTAL SALES</Text>
                  <Text style={styles.finVal}>{money(v.salesAmount)}</Text>
                </View>
                <View style={styles.finCol}>
                  <Text style={styles.finLabel}>FACTORY COST</Text>
                  <Text style={styles.finVal}>{money(v.costAmount)}</Text>
                </View>
                <View style={[styles.finCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.finLabel}>GROSS MARGIN</Text>
                  <Text style={[styles.finVal, { color: semantic.successDark, fontWeight: '900' }]}>
                    +{money(v.marginAmount)} ({v.marginPercent}%)
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* 10. Save Snapshot Button */}
          <Pressable style={styles.saveSnapshotFullBtn} onPress={openPreviousReportModal}>
            <Text style={styles.saveSnapshotFullBtnText}>
              💾 Save / Record Inventory Reconciliation for {date}
            </Text>
          </Pressable>
        </>
      ) : null}

      {/* 11. Modal for Adding / Adjusting Previous Sales Report & Stock */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {modalMode === 'previousReport'
                    ? 'Add / Input Previous Sales Report'
                    : `Stock Count: ${selectedVariant?.variant}`}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Formula: Sold = Opening + Factory Load - Physical Ending Count
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {modalMode === 'previousReport' && (
                <View style={styles.modalDateRow}>
                  <Text style={styles.modalDateLabel}>REPORT DATE (YYYY-MM-DD):</Text>
                  <TextInput
                    style={styles.modalDateInput}
                    value={modalDate}
                    onChangeText={setModalDate}
                    placeholder="YYYY-MM-DD"
                  />
                  <Pressable
                    style={styles.yesterdayBtn}
                    onPress={() => setModalDate(shiftDate(date, -1))}
                  >
                    <Text style={styles.yesterdayBtnText}>Set Yesterday</Text>
                  </Pressable>
                </View>
              )}

              {/* Items in modal */}
              {(modalMode === 'previousReport' ? variants : (selectedVariant ? [selectedVariant] : [])).map(
                (v) => {
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
                    <View key={v.productId} style={styles.modalItemCard}>
                      <View style={styles.modalItemHeader}>
                        <Text style={styles.modalItemTitle}>{v.variant}</Text>
                        <Text style={styles.modalItemBadge}>
                          Price: {v.sellingPrice} ETB · Margin: +{v.unitMargin} ETB
                        </Text>
                      </View>

                      <View style={styles.inputGrid}>
                        {/* Opening Stock */}
                        <View style={styles.inputCol}>
                          <Text style={styles.inputColLabel}>Opening Stock</Text>
                          <TextInput
                            style={styles.numberInput}
                            keyboardType="numeric"
                            value={input.openingStock}
                            onChangeText={(val) => handleModalInputChange(v.productId, 'openingStock', val)}
                          />
                        </View>

                        {/* Factory Inflow */}
                        <View style={styles.inputCol}>
                          <Text style={styles.inputColLabel}>+ Factory Load</Text>
                          <TextInput
                            style={styles.numberInput}
                            keyboardType="numeric"
                            value={input.factoryReceived}
                            onChangeText={(val) => handleModalInputChange(v.productId, 'factoryReceived', val)}
                          />
                        </View>

                        {/* Physical Closing Count */}
                        <View style={styles.inputCol}>
                          <Text style={[styles.inputColLabel, { color: brand.black, fontWeight: '800' }]}>
                            = Physical Count
                          </Text>
                          <TextInput
                            style={[styles.numberInput, styles.highlightInput]}
                            keyboardType="numeric"
                            value={input.closingStock}
                            onChangeText={(val) => handleModalInputChange(v.productId, 'closingStock', val)}
                          />
                        </View>

                        {/* Calculated Sold */}
                        <View style={styles.inputCol}>
                          <Text style={[styles.inputColLabel, { color: '#B91C1C' }]}>Calculated Sold</Text>
                          <TextInput
                            style={[styles.numberInput, styles.soldInput]}
                            keyboardType="numeric"
                            value={input.soldQty}
                            onChangeText={(val) => handleModalInputChange(v.productId, 'soldQty', val)}
                          />
                        </View>
                      </View>

                      {/* Calculations breakdown */}
                      <View style={styles.modalCalcRow}>
                        <Text style={styles.modalCalcText}>
                          Sales: <Text style={{ fontWeight: '800' }}>{money(calcSales)}</Text>
                        </Text>
                        <Text style={[styles.modalCalcText, { color: semantic.successDark }]}>
                          Net Margin (+30 ETB/pk): <Text style={{ fontWeight: '800' }}>+{money(calcMargin)}</Text>
                        </Text>
                      </View>
                    </View>
                  );
                }
              )}

              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.inputColLabel}>NOTES / RECONCILIATION REMARKS:</Text>
                <TextInput
                  style={[styles.numberInput, { height: 60, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="e.g. Daily field route closing count verified"
                  value={modalNotes}
                  onChangeText={setModalNotes}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={isSavingSnapshot}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, isSavingSnapshot && styles.submitBtnDisabled]}
                onPress={handleSaveSnapshot}
                disabled={isSavingSnapshot}
              >
                {isSavingSnapshot ? (
                  <ActivityIndicator color={brand.black} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>💾 Save & Update Inventory</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Subcomponents

function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'gold' | 'stock';
}) {
  return (
    <View
      style={[
        styles.metricCard,
        tone === 'gold' && styles.metricCardGold,
        tone === 'stock' && styles.metricCardStock,
      ]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === 'gold' && styles.metricValueGold]}>{value}</Text>
      {sub && <Text style={styles.metricSub}>{sub}</Text>}
    </View>
  );
}

function SourceCard({
  title,
  orders,
  packQty,
  salesAmount,
  marginAmount,
}: {
  title: string;
  orders: number;
  packQty: number;
  salesAmount: number;
  marginAmount: number;
}) {
  return (
    <View style={styles.sourceCard}>
      <Text style={styles.sourceTitle}>{title}</Text>
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>Orders Count</Text>
        <Text style={styles.sourceValue}>{orders}</Text>
      </View>
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>Packs Dispatched</Text>
        <Text style={styles.sourceValue}>{packQty} pk</Text>
      </View>
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>Gross Sales</Text>
        <Text style={styles.sourceValue}>{money(salesAmount)}</Text>
      </View>
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>Gross Margin</Text>
        <Text style={[styles.sourceValue, { color: semantic.successDark, fontWeight: '800' }]}>
          {money(marginAmount)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F3',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing['3xl'],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: '#8C702E',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: semantic.success,
  },
  liveText: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '800',
    color: semantic.success,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '700',
    color: brand.black,
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[600],
    marginTop: 2,
  },
  todayButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: neutral[300],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  todayButtonActive: {
    backgroundColor: brand.gold,
    borderColor: brand.gold,
  },
  todayButtonText: {
    fontFamily: fontFamily.sans,
    color: brand.black,
    fontWeight: '700',
    fontSize: 12,
  },
  todayButtonTextActive: {
    color: brand.black,
    fontWeight: '800',
  },

  // Date Bar
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateNavBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral[300],
    paddingVertical: 9,
    paddingHorizontal: 14,
    ...shadows.sm,
  },
  dateNavBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brand.black,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
  },
  dateLabel: {
    fontFamily: fontFamily.mono,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  snapshotBadge: {
    backgroundColor: brand.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  snapshotBadgeText: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '900',
    color: brand.black,
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  primaryActionBtn: {
    flex: 1.4,
    backgroundColor: brand.gold,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    ...shadows.sm,
  },
  primaryActionBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '800',
    color: brand.black,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: neutral[300],
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    ...shadows.sm,
  },
  secondaryActionBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },

  // KPI Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  metricCardGold: {
    backgroundColor: '#FDFBF4',
    borderColor: brand.gold,
  },
  metricCardStock: {
    backgroundColor: '#F6FBF7',
    borderColor: '#C7E8D0',
  },
  metricLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '800',
    color: neutral[500],
    letterSpacing: 0.5,
  },
  metricValue: {
    fontFamily: fontFamily.mono,
    fontSize: 18,
    fontWeight: '800',
    color: brand.black,
    marginTop: 4,
  },
  metricValueGold: {
    color: '#8C702E',
  },
  metricSub: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
    marginTop: 2,
  },

  // Formula Banner
  formulaBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  formulaTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '800',
    color: neutral[500],
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formulaStep: {
    alignItems: 'center',
    flex: 1,
  },
  formulaStepActive: {
    backgroundColor: '#FDFBF4',
    borderWidth: 1,
    borderColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 4,
  },
  formulaLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    color: neutral[500],
    fontWeight: '700',
  },
  formulaValue: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: '800',
    color: brand.black,
    marginTop: 2,
  },
  formulaLabelActive: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    color: '#8C702E',
    fontWeight: '800',
  },
  formulaValueActive: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    fontWeight: '900',
    color: '#8C702E',
    marginTop: 2,
  },
  formulaOp: {
    fontFamily: fontFamily.mono,
    fontSize: 15,
    fontWeight: '900',
    color: neutral[400],
    marginHorizontal: 2,
  },

  // Sources Row
  sourceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sourceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  sourceTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 13,
    fontWeight: '700',
    color: brand.black,
    marginBottom: 6,
  },
  sourceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  sourceLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
  },
  sourceValue: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: brand.black,
    fontWeight: '700',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '700',
    color: brand.black,
  },
  sectionSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[500],
    marginTop: 2,
  },
  reconcileBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  reconcileBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#8C702E',
  },

  // Variant Card
  variantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  variantTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  variantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variantName: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '700',
    color: brand.black,
  },
  variantSkuBadge: {
    backgroundColor: neutral[100],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  variantSkuText: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '700',
    color: neutral[600],
  },
  pricingSub: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
    marginTop: 3,
  },
  boldDark: {
    fontFamily: fontFamily.mono,
    fontWeight: '700',
    color: brand.black,
  },
  marginText: {
    fontFamily: fontFamily.mono,
    color: semantic.successDark,
    fontWeight: '800',
  },
  quickEditBtn: {
    backgroundColor: '#FDFBF4',
    borderWidth: 1,
    borderColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quickEditBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: brand.black,
  },

  // Flow Bar
  flowBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: neutral[50],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: neutral[200],
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: spacing.sm,
  },
  flowItem: {
    alignItems: 'center',
    flex: 1,
  },
  flowItemHighlight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: brand.gold,
    borderRadius: 4,
    paddingVertical: 2,
  },
  flowLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 8,
    fontWeight: '800',
    color: neutral[500],
  },
  flowVal: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: '800',
    color: brand.black,
    marginTop: 1,
  },
  flowLabelHighlight: {
    fontFamily: fontFamily.sans,
    fontSize: 8,
    fontWeight: '900',
    color: '#8C702E',
  },
  flowValHighlight: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: '900',
    color: '#8C702E',
    marginTop: 1,
  },
  flowSym: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    fontWeight: '800',
    color: neutral[400],
  },

  // Financials Row
  variantFinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: neutral[150],
    paddingTop: 8,
  },
  finCol: {
    flex: 1,
  },
  finLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '800',
    color: neutral[500],
  },
  finVal: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    fontWeight: '800',
    color: brand.black,
    marginTop: 2,
  },

  // Bottom Save Button
  saveSnapshotFullBtn: {
    backgroundColor: brand.gold,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.sm,
  },
  saveSnapshotFullBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '800',
    color: brand.black,
  },

  // Loading & Error
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.xl,
    ...shadows.sm,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: neutral[600],
    fontFamily: fontFamily.sans,
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: '#7F1D1D',
    fontSize: 12,
    marginTop: 4,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#991B1B',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    maxHeight: '90%',
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 17,
    fontWeight: '700',
    color: brand.black,
  },
  modalSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[500],
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: neutral[500],
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: 440,
  },
  modalDateRow: {
    backgroundColor: neutral[100],
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: spacing.sm,
  },
  modalDateLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '800',
    color: neutral[600],
    marginBottom: 4,
  },
  modalDateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: neutral[300],
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: fontFamily.mono,
    fontSize: 13,
    color: brand.black,
  },
  yesterdayBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  yesterdayBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: '#8C702E',
    fontWeight: '700',
  },
  modalItemCard: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: neutral[50],
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalItemTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 14,
    fontWeight: '700',
    color: brand.black,
  },
  modalItemBadge: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: neutral[600],
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  inputCol: {
    flex: 1,
  },
  inputColLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '700',
    color: neutral[600],
    marginBottom: 3,
  },
  numberInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: neutral[300],
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontFamily: fontFamily.mono,
    fontSize: 13,
    color: brand.black,
    textAlign: 'center',
  },
  highlightInput: {
    borderColor: brand.gold,
    backgroundColor: '#FDFBF4',
    fontWeight: '800',
  },
  soldInput: {
    borderColor: '#F87171',
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
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
    color: brand.black,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: neutral[200],
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: neutral[100],
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    color: neutral[700],
  },
  submitBtn: {
    flex: 2,
    backgroundColor: brand.gold,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '800',
    color: brand.black,
  },
});
