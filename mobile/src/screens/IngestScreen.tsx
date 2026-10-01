import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { brand, neutral, semantic, spacing, radius, fontFamily, shadows } from '../theme';

interface DailySalesVariant {
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

interface DailySalesReport {
  date: string;
  summary: {
    orders: number;
    packQty: number;
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

export default function IngestScreen() {
  const [date, setDate] = useState(todayKey());
  const [report, setReport] = useState<DailySalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err: any) {
      setError(err?.message || 'Failed to load daily sales report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReport(date, true)} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Data Ingest</Text>
          <Text style={styles.title}>Daily Sales Report</Text>
          <Text style={styles.subtitle}>Auto and manual sales by bottle variant</Text>
        </View>
        <Pressable style={styles.todayButton} onPress={() => setDate(todayKey())}>
          <Text style={styles.todayButtonText}>{isToday ? 'Today' : 'Go Today'}</Text>
        </Pressable>
      </View>

      <View style={styles.dateBar}>
        <Pressable style={styles.dateButton} onPress={() => setDate(shiftDate(date, -1))}>
          <Text style={styles.dateButtonText}>Prev</Text>
        </Pressable>
        <View style={styles.datePill}>
          <Text style={styles.dateLabel}>{date}</Text>
        </View>
        <Pressable style={styles.dateButton} onPress={() => setDate(shiftDate(date, 1))}>
          <Text style={styles.dateButtonText}>Next</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={brand.green} />
          <Text style={styles.loadingText}>Loading report...</Text>
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
          <View style={styles.summaryGrid}>
            <MetricCard label="Sales" value={money(report.summary.salesAmount)} />
            <MetricCard label="Margin" value={money(report.summary.marginAmount)} tone="success" />
            <MetricCard label="Pack Qty" value={String(report.summary.packQty)} />
            <MetricCard label="Orders" value={String(report.summary.orders)} />
          </View>

          <View style={styles.sourceRow}>
            <SourceCard title="Manual" source={report.sources.manual} />
            <SourceCard title="Auto" source={report.sources.auto} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sales Pack Qty Per Variant</Text>
            <Text style={styles.sectionMeta}>{report.variants.length} variants</Text>
          </View>

          {report.variants.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No sales for this day</Text>
              <Text style={styles.emptyText}>Manual and auto orders will appear here after they sync.</Text>
            </View>
          ) : (
            report.variants.map((variant) => <VariantRow key={variant.productId} item={variant} />)
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <View style={[styles.metricCard, tone === 'success' && styles.metricCardSuccess]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function SourceCard({
  title,
  source,
}: {
  title: string;
  source: { orders: number; packQty: number; salesAmount: number; marginAmount: number };
}) {
  return (
    <View style={styles.sourceCard}>
      <Text style={styles.sourceTitle}>{title}</Text>
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>Orders</Text>
        <Text style={styles.sourceValue}>{source.orders}</Text>
      </View>
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>Pack Qty</Text>
        <Text style={styles.sourceValue}>{source.packQty}</Text>
      </View>
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>Sales</Text>
        <Text style={styles.sourceValue}>{money(source.salesAmount)}</Text>
      </View>
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>Margin</Text>
        <Text style={[styles.sourceValue, styles.marginText]}>{money(source.marginAmount)}</Text>
      </View>
    </View>
  );
}

function VariantRow({ item }: { item: DailySalesVariant }) {
  return (
    <View style={styles.variantCard}>
      <View style={styles.variantTop}>
        <View style={styles.variantNameWrap}>
          <Text style={styles.variantName}>{item.variant}</Text>
          <Text style={styles.variantUnit}>{item.unit}</Text>
        </View>
        <View style={styles.packPill}>
          <Text style={styles.packPillLabel}>Pack Qty</Text>
          <Text style={styles.packPillValue}>{item.packQty}</Text>
        </View>
      </View>

      <View style={styles.splitRow}>
        <SmallStat label="Manual" value={String(item.manualPackQty)} />
        <SmallStat label="Auto" value={String(item.autoPackQty)} />
        <SmallStat label="Sell Price" value={money(item.sellingPrice)} />
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Sales</Text>
          <Text style={styles.amountValue}>{money(item.salesAmount)}</Text>
        </View>
        <View style={styles.amountRight}>
          <Text style={styles.amountLabel}>Margin</Text>
          <Text style={[styles.amountValue, styles.marginText]}>
            {money(item.marginAmount)} ({item.marginPercent}%)
          </Text>
        </View>
      </View>

      <View style={styles.stockRow}>
        <Text style={styles.stockLabel}>Remaining Pack</Text>
        <Text style={styles.stockValue}>
          {item.remainingPack !== null ? item.remainingPack : '—'}
        </Text>
      </View>
    </View>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatLabel}>{label}</Text>
      <Text style={styles.smallStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutral[100],
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: brand.green,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    color: brand.black,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: neutral[600],
    marginTop: 4,
  },
  todayButton: {
    backgroundColor: brand.green,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  todayButtonText: {
    fontFamily: fontFamily.sans,
    color: brand.white,
    fontWeight: '800',
    fontSize: 12,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateButton: {
    minWidth: 76,
    alignItems: 'center',
    backgroundColor: brand.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral[300],
    paddingVertical: spacing.sm,
  },
  dateButtonText: {
    fontFamily: fontFamily.sans,
    color: brand.black,
    fontWeight: '700',
  },
  datePill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: neutral[900],
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  dateLabel: {
    fontFamily: fontFamily.sans,
    color: brand.white,
    fontWeight: '800',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: brand.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: neutral[600],
    fontFamily: fontFamily.sans,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    color: '#991B1B',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  errorText: {
    color: '#7F1D1D',
    marginBottom: spacing.md,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#991B1B',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    color: brand.white,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    width: '48%',
    backgroundColor: brand.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  metricCardSuccess: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  metricLabel: {
    fontFamily: fontFamily.sans,
    color: neutral[600],
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    fontFamily: fontFamily.sans,
    color: brand.black,
    fontSize: 18,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sourceCard: {
    flex: 1,
    backgroundColor: brand.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
  },
  sourceTitle: {
    fontFamily: fontFamily.sans,
    color: brand.black,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  sourceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sourceLabel: {
    color: neutral[600],
    fontSize: 12,
  },
  sourceValue: {
    color: brand.black,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.sans,
    color: brand.black,
    fontWeight: '900',
    fontSize: 17,
  },
  sectionMeta: {
    fontFamily: fontFamily.sans,
    color: neutral[500],
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: brand.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: neutral[200],
  },
  emptyTitle: {
    fontWeight: '900',
    color: brand.black,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: neutral[600],
  },
  variantCard: {
    backgroundColor: brand.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  variantTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  variantNameWrap: {
    flex: 1,
  },
  variantName: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    color: brand.black,
    fontWeight: '900',
  },
  variantUnit: {
    color: neutral[500],
    marginTop: 2,
    fontSize: 12,
  },
  packPill: {
    minWidth: 76,
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  packPillLabel: {
    color: semantic.success,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  packPillValue: {
    color: semantic.success,
    fontSize: 18,
    fontWeight: '900',
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  smallStat: {
    flex: 1,
    backgroundColor: neutral[100],
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  smallStatLabel: {
    color: neutral[500],
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  smallStatValue: {
    color: brand.black,
    marginTop: 2,
    fontWeight: '900',
    fontSize: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: neutral[200],
  },
  amountRight: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  amountLabel: {
    color: neutral[500],
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  amountValue: {
    color: brand.black,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  marginText: {
    color: semantic.success,
  },
  stockRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  stockLabel: {
    color: neutral[500],
    fontSize: 12,
    fontWeight: '700',
  },
  stockValue: {
    color: brand.black,
    fontWeight: '900',
    fontSize: 15,
  },
});
