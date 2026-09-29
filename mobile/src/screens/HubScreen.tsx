import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { brand, neutral, spacing, radius, colors, fontFamily } from '../theme';
import KPICard from '../components/KPICard';
import AgentRow from '../components/AgentRow';
import TelemetryIndicator from '../components/TelemetryIndicator';
import { api, rawRequest } from '../api/client';

export default function HubScreen({ navigation }: any) {
  const currentEAT = new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi' });
  const [workspaceName, setWorkspaceName] = useState('Topwater Ethiopia');
  const [activeAgents, setActiveAgents] = useState(0);
  const [activeRoutesList, setActiveRoutesList] = useState<any[]>([]);
  const [collectedRevenue, setCollectedRevenue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Fetch Workspace & Dashboard Stats in parallel
      const [ws, stats, routes] = await Promise.all([
        rawRequest('/workspace/me'),
        rawRequest('/workspace/dashboard'),
        rawRequest('/routes')
      ]);
      
      if (ws && ws.name) setWorkspaceName(ws.name);
      if (stats && typeof stats.collectedRevenue !== 'undefined') {
        setCollectedRevenue(stats.collectedRevenue);
      }
      
      // Filter Active Routes
      const inProgress = (routes as any[]).filter(r => r.status === 'IN_PROGRESS');
      
      // Unique agents count
      const uniqueAgents = new Set(inProgress.map(r => r.agentId));
      setActiveAgents(uniqueAgents.size);
      
      setActiveRoutesList(inProgress);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', padding: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{workspaceName.toUpperCase()} ⏷</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 }} />
              <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: 'bold', letterSpacing: 1 }}>SYNCED • ET-ADD</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
              <Text>🔔</Text>
            </View>
            <TouchableOpacity 
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => {
                Alert.alert('Account Settings', `Logged in to: ${workspaceName}`, [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Log Out', 
                    style: 'destructive', 
                    onPress: async () => {
                      await api.logout();
                      navigation.replace('Login');
                    } 
                  }
                ]);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{workspaceName.substring(0, 2).toUpperCase()}</Text>
            </TouchableOpacity>
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
          value={collectedRevenue.toLocaleString()}
          unit="ETB"
          trend="0%"
          subItems={[{ label: 'telebirr SuperApp', value: '0 ETB' }, { label: 'Physical Cash Vault', value: `${collectedRevenue.toLocaleString()} ETB` }]}
        />
        <KPICard
          label="ACTIVE AGENTS"
          value={activeAgents.toString()}
          trend={`${activeAgents} Live`}
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
          <Text style={styles.mapText}>{activeRoutesList.length > 0 ? `${activeRoutesList.length} Active Corridors` : 'No Active Corridors'}</Text>
          <Text style={styles.mapSubtext}>Assign routes to activate map</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <Text style={{ fontFamily: fontFamily.serif, fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>Active Agent{'\n'}Operations</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', paddingBottom: 2 }}>Tap row to inspect{'\n'}telemetry</Text>
        </View>
        <View style={styles.agentList}>
          {activeRoutesList.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>No agents currently active in the field.</Text>
          ) : (
            activeRoutesList.map((route, i) => {
              const agentName = route.agent?.user?.name || route.agent?.name || 'Agent';
              const agentPhone = route.agent?.user?.phoneNumber || route.agent?.user?.phone || route.agent?.phone || 'No phone';
              const initials = agentName.substring(0, 2).toUpperCase();
              return (
                <AgentRow 
                  key={route.id || i}
                  initials={initials}
                  name={agentName}
                  vehicleTag={route.name}
                  phone={agentPhone}
                  location="En Route"
                  stopInfo={`${route.stops?.filter((s: any) => s.status === 'VISITED').length || 0} of ${route.stops?.length || 0} stops visited`}
                  revenue="--"
                  syncStatus="Live"
                  isOnline={true}
                />
              );
            })
          )}
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
