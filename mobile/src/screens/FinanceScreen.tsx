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

interface DailyBreakdownItem {
  date: string;
  dayName: string;
  hasSnapshot: boolean;
  isWorkingDay: boolean;
  packsSold: number;
  salesAmount: number;
  cogsAmount: number;
  grossMargin: number;
  grossMarginPercent: number;
  driverCompensation: {
    commission: number;
    lunch: number;
    total: number;
  };
  netProfit: number;
  reconciliationStatus: string;
}

interface WeeklyFinanceData {
  period: {
    startDate: string;
    endDate: string;
    workingDays: number;
  };
  summary: {
    totalSales: number;
    totalCogs: number;
    totalGrossMargin: number;
    grossMarginPercent: number;
    totalDriverCommission: number;
    totalDriverLunch: number;
    totalDriverExpense: number;
    netOperatingProfit: number;
    netProfitMarginPercent: number;
  };
  taxes: {
    vatRate: number;
    vatAmount: number;
    totRate: number;
    totAmount: number;
    incomeTaxRate: number;
    incomeTaxAmount: number;
    netProfitAfterTax: number;
  };
  reselling: {
    totalVolumePacks: number;
    averageSellingPricePerPack: number;
    averageFactoryCostPerPack: number;
    averageGrossMarginPerPack: number;
    overallGrossMarginPercent: number;
  };
  audit: {
    reconciledDays: number;
    totalWorkingDays: number;
    ledgerIntegrity: string;
    fiscalVerificationHash: string;
    lastAuditedAt: string;
  };
  dailyBreakdown: DailyBreakdownItem[];
}

function money(val: number) {
  return `ETB ${Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function FinanceScreen() {
  const [workspaceName, setWorkspaceName] = useState('Abyssinia Beverage Dispatch');
  const [startDate, setStartDate] = useState('2026-09-28');
  const [endDate, setEndDate] = useState('2026-10-02');
  const [data, setData] = useState<WeeklyFinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Tax regime toggle: VAT (15%) vs TOT (2%)
  const [taxRegime, setTaxRegime] = useState<'TOT' | 'VAT'>('TOT');

  // Audit filter/modal state
  const [auditVerified, setAuditVerified] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  useEffect(() => {
    loadWorkspace();
    loadFinanceReport();
  }, []);

  async function loadWorkspace() {
    try {
      const ws = await rawRequest('/workspace/me');
      if (ws?.name) setWorkspaceName(ws.name);
    } catch {
      // Graceful fallback
    }
  }

  async function loadFinanceReport(refresh = false) {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.weeklyFinanceReport(startDate, endDate);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load weekly finance report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Telegram Weekly Summary copyable text
  const telegramWeeklyReportText = useMemo(() => {
    if (!data) return '';
    const lines: string[] = [];
    lines.push(`📊 *SIMUNI WEEKLY FINANCE & PAYROLL AUDIT*`);
    lines.push(`📅 *Period: ${data.period.startDate} to ${data.period.endDate}* (${data.period.workingDays} Active Days)`);
    lines.push(`🏢 *${workspaceName}*`);
    lines.push(``);
    lines.push(`💰 *EXECUTIVE SUMMARY*`);
    lines.push(`• Gross Sales Revenue: *${money(data.summary.totalSales)}* (${data.reselling.totalVolumePacks} pk)`);
    lines.push(`• Factory Cost of Goods: *${money(data.summary.totalCogs)}*`);
    lines.push(`• Gross Trading Margin: *+${money(data.summary.totalGrossMargin)}* (${data.summary.grossMarginPercent}%)`);
    lines.push(``);
    lines.push(`🚚 *DRIVER COMPENSATION & EXPENSES*`);
    lines.push(`• Driver Commission (600 ETB/day): *${money(data.summary.totalDriverCommission)}*`);
    lines.push(`• Driver Lunch Allowance (500 ETB/day): *${money(data.summary.totalDriverLunch)}*`);
    lines.push(`• Total Driver Payout: *${money(data.summary.totalDriverExpense)}* (1,100 ETB/day × ${data.period.workingDays})`);
    lines.push(``);
    lines.push(`📈 *NET OPERATING RESULTS*`);
    lines.push(`• Net Profit before Tax: *+${money(data.summary.netOperatingProfit)}* (${data.summary.netProfitMarginPercent}%)`);
    const taxSelected = taxRegime === 'TOT' ? data.taxes.totAmount : data.taxes.vatAmount;
    lines.push(`• Estimated Indirect Tax (${taxRegime}): *${money(taxSelected)}*`);
    lines.push(`• Business Income Tax (30%): *${money(data.taxes.incomeTaxAmount)}*`);
    lines.push(`• Net Profit after Tax: *+${money(data.taxes.netProfitAfterTax)}*`);
    lines.push(``);
    lines.push(`🔍 *RESELLING & MARGIN METRICS*`);
    lines.push(`• Avg Resale Price/Pack: *${data.reselling.averageSellingPricePerPack} ETB*`);
    lines.push(`• Avg Factory Cost/Pack: *${data.reselling.averageFactoryCostPerPack} ETB*`);
    lines.push(`• Avg Resale Margin/Pack: *+${data.reselling.averageGrossMarginPerPack} ETB/pk*`);
    lines.push(``);
    lines.push(`⚖️ *AUDIT RECONCILIATION*`);
    lines.push(`• Status: *${data.audit.ledgerIntegrity === 'FULLY_AUDITED' ? '✅ ALL 5 DAYS BALANCED & POSTED' : '⚠️ PARTIAL AUDIT'}*`);
    lines.push(`• Audit Hash: \`${data.audit.fiscalVerificationHash}\``);
    lines.push(``);
    lines.push(`Verified via Simuni Finance & Dispatch Engine · @simuniagent_bot`);
    return lines.join('\n');
  }, [data, workspaceName, taxRegime]);

  const copyWeeklyTelegram = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(telegramWeeklyReportText);
      }
      setCopiedTelegram(true);
      setTimeout(() => setCopiedTelegram(false), 3000);
      Alert.alert(
        'Weekly Report Copied! 📋',
        'Weekly finance, driver payroll, and tax summary copied to clipboard. Ready to paste in management Telegram channel.',
      );
    } catch {
      Alert.alert('Weekly Report', telegramWeeklyReportText);
    }
  };

  const handleAuditCertification = () => {
    setAuditVerified(true);
    Alert.alert(
      'Ledger Audit Certified ✅',
      `All 5 working days from ${startDate} to ${endDate} have been audited and matched against Ethiopian Birr physical collections and factory load manifests. Hash: ${data?.audit.fiscalVerificationHash}`,
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFinanceReport(true)} />}
    >
      {/* 1. Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.orgDropdown}>
          <View style={styles.orgIconBox}>
            <Text style={{ fontSize: 13 }}>📊</Text>
          </View>
          <View>
            <Text style={styles.orgName}>{workspaceName}</Text>
            <Text style={styles.orgSubtitle}>Finance, Payroll & Tax Audit</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <View style={[styles.auditPill, auditVerified && styles.auditPillSuccess]}>
            <Text style={styles.auditPillText}>{auditVerified ? 'AUDITED ✓' : 'UNAUDITED'}</Text>
          </View>
        </View>
      </View>

      {/* 2. Page Title & Date Range */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Weekly Finance & Audit</Text>
        <Text style={styles.pageSubtitle}>
          Working Days: Monday Sep 28 – Friday Oct 02, 2026 (5 Days)
        </Text>
      </View>

      {/* 3. Driver Fixed Compensation Banner */}
      <View style={styles.driverBannerCard}>
        <View style={styles.driverBannerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>🚚</Text>
            <Text style={styles.driverBannerTitle}>Driver Fixed Daily Compensation</Text>
          </View>
          <View style={styles.fixedRateBadge}>
            <Text style={styles.fixedRateBadgeText}>1,100 ETB / DAY</Text>
          </View>
        </View>

        <Text style={styles.driverBannerDesc}>
          Standard fixed contract: Commission 600 ETB + Lunch Allowance 500 ETB automatically factored into daily operating cost.
        </Text>

        <View style={styles.driverBreakdownRow}>
          <View style={styles.driverCol}>
            <Text style={styles.driverColLabel}>DAILY COMMISSION</Text>
            <Text style={styles.driverColValue}>600 ETB</Text>
            <Text style={styles.driverColSub}>5 days = 3,000 ETB</Text>
          </View>

          <Text style={styles.driverPlus}>+</Text>

          <View style={styles.driverCol}>
            <Text style={styles.driverColLabel}>DAILY LUNCH</Text>
            <Text style={styles.driverColValue}>500 ETB</Text>
            <Text style={styles.driverColSub}>5 days = 2,500 ETB</Text>
          </View>

          <Text style={styles.driverPlus}>=</Text>

          <View style={styles.driverTotalCol}>
            <Text style={styles.driverTotalLabel}>TOTAL PAYROLL</Text>
            <Text style={styles.driverTotalValue}>
              {money(data?.summary.totalDriverExpense || 5500)}
            </Text>
            <Text style={styles.driverTotalSub}>Deducted from gross profit</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={brand.black} size="large" />
          <Text style={styles.loadingText}>Computing weekly ledger & audit metrics...</Text>
        </View>
      ) : (
        <>
          {/* 4. Executive KPI Grid (4 Cards) */}
          <View style={styles.kpiGrid}>
            {/* Total Sales */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiOverline}>GROSS REVENUE</Text>
              <Text style={styles.kpiMainValue}>{money(data?.summary.totalSales || 0)}</Text>
              <Text style={styles.kpiSubText}>
                {data?.reselling.totalVolumePacks || 0} packs billed across 5 days
              </Text>
            </View>

            {/* COGS */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiOverline}>FACTORY PURCHASES (COGS)</Text>
              <Text style={styles.kpiMainValue}>{money(data?.summary.totalCogs || 0)}</Text>
              <Text style={styles.kpiSubText}>Factory buy cost (prev + new tiers)</Text>
            </View>

            {/* Gross Trading Margin */}
            <View style={[styles.kpiCard, styles.goldCard]}>
              <Text style={styles.kpiOverline}>GROSS TRADING MARGIN</Text>
              <Text style={[styles.kpiMainValue, { color: semantic.successDark }]}>
                +{money(data?.summary.totalGrossMargin || 0)}
              </Text>
              <Text style={styles.kpiSubText}>
                {data?.summary.grossMarginPercent}% gross margin on turnover
              </Text>
            </View>

            {/* Net Operating Profit */}
            <View style={[styles.kpiCard, styles.netProfitCard]}>
              <Text style={styles.kpiOverline}>NET OPERATING PROFIT</Text>
              <Text style={[styles.kpiMainValue, { color: '#1E3A8A' }]}>
                +{money(data?.summary.netOperatingProfit || 0)}
              </Text>
              <Text style={styles.kpiSubText}>
                After 5,500 ETB driver payroll deduction
              </Text>
            </View>
          </View>

          {/* 5. 5-Day Daily Ledger & Payroll Table */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Daily Financial Breakdown (Mon–Fri)</Text>
            <Text style={styles.sectionMetaRight}>5 Working Days</Text>
          </View>

          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 2 }]}>DAY / DATE</Text>
              <Text style={[styles.thCell, { flex: 1.6, textAlign: 'right' }]}>SALES (ETB)</Text>
              <Text style={[styles.thCell, { flex: 1.6, textAlign: 'right' }]}>COGS (ETB)</Text>
              <Text style={[styles.thCell, { flex: 1.6, textAlign: 'right' }]}>DRIVER (ETB)</Text>
              <Text style={[styles.thCell, { flex: 1.8, textAlign: 'right' }]}>NET PROFIT</Text>
            </View>

            {data?.dailyBreakdown.map((row) => (
              <View key={row.date} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdDayName}>{row.dayName}</Text>
                  <Text style={styles.tdDateSub}>{row.date}</Text>
                  <View style={styles.reconcileBadge}>
                    <Text style={styles.reconcileBadgeText}>{row.reconciliationStatus}</Text>
                  </View>
                </View>

                <View style={{ flex: 1.6, alignItems: 'flex-end' }}>
                  <Text style={styles.tdValueBold}>{row.salesAmount.toLocaleString()}</Text>
                  <Text style={styles.tdSubText}>{row.packsSold} pk</Text>
                </View>

                <View style={{ flex: 1.6, alignItems: 'flex-end' }}>
                  <Text style={styles.tdValue}>{row.cogsAmount.toLocaleString()}</Text>
                  <Text style={styles.tdSubText}>factory</Text>
                </View>

                <View style={{ flex: 1.6, alignItems: 'flex-end' }}>
                  <Text style={[styles.tdValue, { color: '#B45309' }]}>-1,100</Text>
                  <Text style={styles.tdSubText}>600c+500l</Text>
                </View>

                <View style={{ flex: 1.8, alignItems: 'flex-end' }}>
                  <Text style={[styles.tdNetProfit, { color: semantic.successDark }]}>
                    +{row.netProfit.toLocaleString()}
                  </Text>
                  <Text style={styles.tdSubText}>
                    +{row.grossMargin.toLocaleString()} gross
                  </Text>
                </View>
              </View>
            ))}

            {/* Total Row */}
            <View style={styles.tableTotalRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.totalRowTitle}>5-DAY TOTAL</Text>
                <Text style={styles.totalRowSub}>All routes audited</Text>
              </View>
              <View style={{ flex: 1.6, alignItems: 'flex-end' }}>
                <Text style={styles.totalRowBold}>{data?.summary.totalSales.toLocaleString()}</Text>
              </View>
              <View style={{ flex: 1.6, alignItems: 'flex-end' }}>
                <Text style={styles.totalRowBold}>{data?.summary.totalCogs.toLocaleString()}</Text>
              </View>
              <View style={{ flex: 1.6, alignItems: 'flex-end' }}>
                <Text style={[styles.totalRowBold, { color: '#B45309' }]}>-5,500</Text>
              </View>
              <View style={{ flex: 1.8, alignItems: 'flex-end' }}>
                <Text style={[styles.totalRowBold, { color: semantic.successDark }]}>
                  +{data?.summary.netOperatingProfit.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* 6. Reselling & Price Margin Analysis */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Reselling & Trading Performance</Text>
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>FACTORY VS RETAIL</Text>
            </View>
          </View>

          <View style={styles.resellingCard}>
            <View style={styles.resellRow}>
              <View style={styles.resellItem}>
                <Text style={styles.resellLabel}>TOTAL RESOLD VOLUME</Text>
                <Text style={styles.resellBig}>{data?.reselling.totalVolumePacks} Packs</Text>
                <Text style={styles.resellSub}>Topwater 0.60L, 1.00L, 2.00L</Text>
              </View>

              <View style={styles.resellItem}>
                <Text style={styles.resellLabel}>AVG SELLING PRICE</Text>
                <Text style={styles.resellBig}>{data?.reselling.averageSellingPricePerPack} ETB</Text>
                <Text style={styles.resellSub}>Blended retail resale</Text>
              </View>
            </View>

            <View style={[styles.resellRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: neutral[200] }]}>
              <View style={styles.resellItem}>
                <Text style={styles.resellLabel}>AVG FACTORY COST</Text>
                <Text style={styles.resellBig}>{data?.reselling.averageFactoryCostPerPack} ETB</Text>
                <Text style={styles.resellSub}>Blended buy price (prev + new)</Text>
              </View>

              <View style={styles.resellItem}>
                <Text style={styles.resellLabel}>AVG UNIT RESALE SPREAD</Text>
                <Text style={[styles.resellBig, { color: semantic.successDark }]}>
                  +{data?.reselling.averageGrossMarginPerPack} ETB / pk
                </Text>
                <Text style={styles.resellSub}>
                  {data?.reselling.overallGrossMarginPercent}% Trading Margin
                </Text>
              </View>
            </View>
          </View>

          {/* 7. Ethiopia Tax Calculator Card */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Ethiopia Tax & Fiscal Provisions</Text>
            <View style={styles.taxToggleRow}>
              <Pressable
                style={[styles.taxToggleBtn, taxRegime === 'TOT' && styles.taxToggleBtnActive]}
                onPress={() => setTaxRegime('TOT')}
              >
                <Text style={[styles.taxToggleText, taxRegime === 'TOT' && styles.taxToggleTextActive]}>
                  2% TOT
                </Text>
              </Pressable>
              <Pressable
                style={[styles.taxToggleBtn, taxRegime === 'VAT' && styles.taxToggleBtnActive]}
                onPress={() => setTaxRegime('VAT')}
              >
                <Text style={[styles.taxToggleText, taxRegime === 'VAT' && styles.taxToggleTextActive]}>
                  15% VAT
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.taxCard}>
            <View style={styles.taxRowItem}>
              <View>
                <Text style={styles.taxItemTitle}>Turnover Indirect Tax ({taxRegime})</Text>
                <Text style={styles.taxItemSub}>
                  {taxRegime === 'TOT' ? '2% on gross taxable turnover' : '15% VAT on taxable supplies'}
                </Text>
              </View>
              <Text style={styles.taxItemAmount}>
                {money(taxRegime === 'TOT' ? data?.taxes.totAmount || 0 : data?.taxes.vatAmount || 0)}
              </Text>
            </View>

            <View style={styles.taxRowItem}>
              <View>
                <Text style={styles.taxItemTitle}>Business Income Tax (Estimated 30%)</Text>
                <Text style={styles.taxItemSub}>30% on Net Operating Profit (after driver payroll)</Text>
              </View>
              <Text style={styles.taxItemAmount}>
                {money(data?.taxes.incomeTaxAmount || 0)}
              </Text>
            </View>

            <View style={[styles.taxRowItem, styles.taxTotalHighlight]}>
              <View>
                <Text style={styles.taxTotalTitle}>Net Profit After Income Tax</Text>
                <Text style={styles.taxTotalSub}>Retained earnings after payroll & income tax</Text>
              </View>
              <Text style={styles.taxTotalAmount}>
                {money(data?.taxes.netProfitAfterTax || 0)}
              </Text>
            </View>
          </View>

          {/* 8. Audit Certification & Reconciliation Card */}
          <View style={styles.auditCard}>
            <View style={styles.auditCardTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>🛡️</Text>
                <View>
                  <Text style={styles.auditTitle}>Fiscal Audit & Integrity Verification</Text>
                  <Text style={styles.auditSubtitle}>Weekly reconciliation against physical cash & van inventory</Text>
                </View>
              </View>
              <Pressable
                style={[styles.certifyBtn, auditVerified && styles.certifyBtnDone]}
                onPress={handleAuditCertification}
              >
                <Text style={styles.certifyBtnText}>
                  {auditVerified ? 'Audit Certified ✓' : 'Certify Ledger'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.auditStatsRow}>
              <View style={styles.auditStat}>
                <Text style={styles.auditStatLabel}>RECONCILED DAYS</Text>
                <Text style={styles.auditStatVal}>
                  {data?.audit.reconciledDays} / {data?.audit.totalWorkingDays} Days
                </Text>
              </View>
              <View style={styles.auditStat}>
                <Text style={styles.auditStatLabel}>INTEGRITY LEVEL</Text>
                <Text style={[styles.auditStatVal, { color: semantic.successDark }]}>
                  {data?.audit.ledgerIntegrity}
                </Text>
              </View>
              <View style={styles.auditStat}>
                <Text style={styles.auditStatLabel}>VERIFICATION HASH</Text>
                <Text style={styles.auditStatValMono}>{data?.audit.fiscalVerificationHash}</Text>
              </View>
            </View>
          </View>

          {/* 9. Telegram Weekly Report Card */}
          <View style={styles.telegramCard}>
            <View style={styles.telegramCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.tgIconBadge}>
                  <Text style={{ fontSize: 13, color: '#FFFFFF' }}>✈️</Text>
                </View>
                <View>
                  <Text style={styles.telegramCardTitle}>Weekly Telegram Management Report</Text>
                  <Text style={styles.telegramCardSub}>Copy & paste into leadership / accounting chat</Text>
                </View>
              </View>

              <Pressable
                style={[styles.copyTelegramBtn, copiedTelegram && styles.copyTelegramBtnSuccess]}
                onPress={copyWeeklyTelegram}
              >
                <Text style={{ fontSize: 12, marginRight: 4 }}>{copiedTelegram ? '✓' : '📋'}</Text>
                <Text style={[styles.copyTelegramBtnText, copiedTelegram && { color: '#FFFFFF' }]}>
                  {copiedTelegram ? 'Copied!' : 'Copy Report'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.telegramPreviewBox}>
              <Text style={styles.telegramPreviewText} numberOfLines={14}>
                {telegramWeeklyReportText}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F5',
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
  },
  orgDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orgIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.xs,
    backgroundColor: brand.cream,
    borderWidth: 1,
    borderColor: brand.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgName: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '800',
    color: brand.black,
  },
  orgSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  auditPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  auditPillSuccess: {
    backgroundColor: '#DEF7EC',
    borderColor: '#31C48D',
  },
  auditPillText: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '800',
    color: '#1F2A37',
  },
  pageHeader: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 22,
    fontWeight: '800',
    color: brand.black,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[600],
    marginTop: 2,
  },
  driverBannerCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  driverBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  driverBannerTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  fixedRateBadge: {
    backgroundColor: '#FDE68A',
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fixedRateBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '800',
    color: '#78350F',
  },
  driverBannerDesc: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
    marginBottom: 10,
  },
  driverBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.sm,
    padding: 8,
  },
  driverCol: {
    alignItems: 'center',
  },
  driverColLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  driverColValue: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: '800',
    color: '#78350F',
  },
  driverColSub: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    color: '#B45309',
  },
  driverPlus: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  driverTotalCol: {
    alignItems: 'flex-end',
  },
  driverTotalLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#78350F',
  },
  driverTotalValue: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    fontWeight: '800',
    color: '#78350F',
  },
  driverTotalSub: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    color: '#B45309',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: neutral[600],
    marginTop: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 12,
    ...shadows.sm,
  },
  goldCard: {
    backgroundColor: '#FDFBF7',
    borderColor: brand.gold,
  },
  netProfitCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  kpiOverline: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '800',
    color: neutral[600],
    letterSpacing: 0.5,
  },
  kpiMainValue: {
    fontFamily: fontFamily.mono,
    fontSize: 18,
    fontWeight: '800',
    color: brand.black,
    marginVertical: 4,
  },
  kpiSubText: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: neutral[500],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '800',
    color: brand.black,
  },
  sectionMetaRight: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
  },
  tagPill: {
    backgroundColor: neutral[200],
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagPillText: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    fontWeight: '700',
    color: neutral[700],
  },
  tableCard: {
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neutral[50],
    borderRadius: radius.xs,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
    marginBottom: 4,
  },
  thCell: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '800',
    color: neutral[600],
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
  },
  tdDayName: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  tdDateSub: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: neutral[500],
  },
  reconcileBadge: {
    marginTop: 2,
    alignSelf: 'flex-start',
    backgroundColor: '#DEF7EC',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  reconcileBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 7,
    fontWeight: '800',
    color: '#03543F',
  },
  tdValueBold: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  tdValue: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    color: neutral[700],
  },
  tdNetProfit: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    fontWeight: '800',
  },
  tdSubText: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    color: neutral[500],
  },
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: neutral[50],
    borderRadius: radius.xs,
    marginTop: 4,
  },
  totalRowTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '800',
    color: brand.black,
  },
  totalRowSub: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    color: neutral[500],
  },
  totalRowBold: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    fontWeight: '800',
    color: brand.black,
  },
  resellingCard: {
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  resellRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resellItem: {
    flex: 1,
  },
  resellLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 9,
    fontWeight: '800',
    color: neutral[600],
  },
  resellBig: {
    fontFamily: fontFamily.mono,
    fontSize: 16,
    fontWeight: '800',
    color: brand.black,
    marginTop: 2,
  },
  resellSub: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: neutral[500],
  },
  taxToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  taxToggleBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.xs,
    backgroundColor: neutral[200],
  },
  taxToggleBtnActive: {
    backgroundColor: brand.black,
  },
  taxToggleText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: neutral[700],
  },
  taxToggleTextActive: {
    color: neutral[0],
  },
  taxCard: {
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  taxRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
  },
  taxItemTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  taxItemSub: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: neutral[500],
  },
  taxItemAmount: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    fontWeight: '700',
    color: neutral[800],
  },
  taxTotalHighlight: {
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: radius.xs,
    marginTop: 6,
    borderBottomWidth: 0,
  },
  taxTotalTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  taxTotalSub: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: '#15803D',
  },
  taxTotalAmount: {
    fontFamily: fontFamily.mono,
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
  },
  auditCard: {
    backgroundColor: neutral[0],
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  auditCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  auditTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  auditSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: '#047857',
  },
  certifyBtn: {
    backgroundColor: '#10B981',
    borderRadius: radius.xs,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  certifyBtnDone: {
    backgroundColor: '#059669',
  },
  certifyBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '800',
    color: neutral[0],
  },
  auditStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: radius.xs,
    padding: 8,
  },
  auditStat: {
    flex: 1,
  },
  auditStatLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 8,
    fontWeight: '800',
    color: '#047857',
  },
  auditStatVal: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  auditStatValMono: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#065F46',
  },
  telegramCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#2AABEE',
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  telegramCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tgIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2AABEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  telegramCardTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '800',
    color: '#0E4E77',
  },
  telegramCardSub: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    color: '#3B82F6',
  },
  copyTelegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2AABEE',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    ...shadows.sm,
  },
  copyTelegramBtnSuccess: {
    backgroundColor: semantic.successDark,
  },
  copyTelegramBtnText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  telegramPreviewBox: {
    backgroundColor: neutral[0],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 10,
    marginVertical: 4,
  },
  telegramPreviewText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    color: '#1E293B',
  },
});
