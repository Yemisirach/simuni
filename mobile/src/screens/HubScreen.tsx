import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { brand, neutral, spacing, radius, colors, fontFamily } from '../theme';
import KPICard from '../components/KPICard';
import SectionHeader from '../components/SectionHeader';
import AgentRow from '../components/AgentRow';
import TelemetryIndicator from '../components/TelemetryIndicator';

export default function HubScreen() {
  const currentEAT = new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi' });

  return (
    <ScrollView style={styles.container}>
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', padding: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>ABYSSINIA BEVERAGES ⏷</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 }} />
              <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: 'bold', letterSpacing: 1 }}>SYNCED • ET-ADD</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
              <Text>🔔</Text>
            </View>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>AB</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={styles.overline}>LIVE TELEMETRY • ADDIS ABABA</Text>
          <Text style={styles.clock}>{currentEAT}</Text>
        </View>
        <Text style={styles.pageTitle}>Fleet Dispatch Ops</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiRow}>
        <KPICard
          label="COLLECTED REVENUE"
          value="384,520"
          unit="ETB"
          trend="+14.8%"
          subItems={[{ label: 'telebirr SuperApp', value: '312,000 ETB' }, { label: 'Physical Cash Vault', value: '72,520 ETB' }]}
        />
        <KPICard
          label="ACTIVE AGENTS"
          value="18"
          trend="Live + 1 Buffered"
        />
      </ScrollView>

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: fontFamily.serif, fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>Addis Urban Sector Matrix</Text>
          <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#4B5563', textTransform: 'uppercase' }}>Focus</Text>
          </View>
        </View>
        <View style={styles.mapPlaceholder}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>🗺️</Text>
          <Text style={styles.mapText}>4 Corridors:</Text>
          <Text style={styles.mapSubtext}>Mercato, Bole, Piazza, Kaliti</Text>
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>99.2% Uplink</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <Text style={{ fontFamily: fontFamily.serif, fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>Active Agent{'\n'}Operations</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', paddingBottom: 2 }}>Tap row to inspect{'\n'}telemetry</Text>
        </View>
        <View style={styles.agentList}>
          <AgentRow
            name="Dawit Kebede"
            vehicle="MB-04"
            routeInfo="📍 Stop 4 of 6 · Cinema Ras Mart"
            revenue="84,200 ETB coll."
            onCall={() => {}}
            onLocate={() => {}}
            isOnline={true}
          />
          <AgentRow
            name="Tigist Bekele"
            vehicle="VAN-02"
            routeInfo="📍 Stop 5 of 5 · Edna Mall Super"
            revenue="145,000 ETB coll."
            onCall={() => {}}
            onLocate={() => {}}
            isOnline={true}
          />
          <AgentRow
            name="Henok Mengistu"
            vehicle="TRK-01"
            routeInfo="⚠️ 3 OPS pings held offline (Syncing...)"
            revenue="62,000 ETB coll."
            onCall={() => {}}
            onLocate={() => {}}
            isOnline={false}
          />
        </View>
      </View>

      <View style={{ padding: 16, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 }}>Core Microservices Telemetry</Text>
          <Text style={{ fontSize: 10, color: '#9CA3AF', fontFamily: fontFamily.mono }}>NODE-ADD-01</Text>
        </View>
        <View style={styles.telemetryRow}>
          <TelemetryIndicator label="telebirr Fabric Verified" status="OK" />
          <TelemetryIndicator label="OSRM Routing" status="OK" />
          <TelemetryIndicator label="MinIO S3 Buck.. Synced" status="OK" />
          <TelemetryIndicator label="Better Auth V2 Active" status="OK" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100] },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  overline: { fontFamily: fontFamily.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1, color: neutral[500], marginBottom: spacing.xs },
  pageTitle: { fontFamily: fontFamily.serif, fontSize: 28, color: brand.black, fontWeight: '700' },
  clock: { fontFamily: fontFamily.mono, fontSize: 12, color: neutral[600], marginTop: spacing.xs },
  kpiRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  mapPlaceholder: {
    backgroundColor: neutral[200],
    height: 160,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  mapIcon: { fontSize: 32, marginBottom: spacing.xs },
  mapText: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: '600', color: neutral[700] },
  mapSubtext: { fontFamily: fontFamily.sans, fontSize: 12, color: neutral[500] },
  agentList: { marginTop: spacing.sm, gap: spacing.sm },
  footer: { padding: spacing.lg, backgroundColor: neutral[200], borderTopWidth: 1, borderColor: neutral[300] },
  footerLabel: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '600', color: neutral[600], marginBottom: spacing.md },
  telemetryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
