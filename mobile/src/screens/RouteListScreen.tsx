import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { brand, neutral, semantic, spacing, radius, shadows, fontFamily, badges } from '../theme';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

interface RouteSummary {
  id: string;
  name: string;
  date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  stops: { id: string; status: string; customer?: { name: string } }[];
}

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function RouteListScreen({ navigation }: any) {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const storedActiveId = await AsyncStorage.getItem('simuni_active_route_id');
      setActiveRouteId(storedActiveId);
      const data = await api.myRoutes();
      setRoutes(data);
    } catch {
      // Fall back to empty state
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await AsyncStorage.removeItem('simuni_cache_/routes');
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectActiveRoute = async (item: RouteSummary) => {
    await AsyncStorage.setItem('simuni_active_route_id', item.id);
    await AsyncStorage.setItem('simuni_active_route_name', item.name);
    setActiveRouteId(item.id);
    setShowSwitchModal(false);
    navigation.navigate('RouteDetail', { routeId: item.id, routeName: item.name });
  };

  const activeRoute = routes.find((r) => r.id === activeRouteId);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Assigned Corridors</Text>
          <Text style={styles.headerSub}>{routes.length} Available Routes</Text>
        </View>
        <TouchableOpacity style={styles.switchButton} onPress={() => setShowSwitchModal(true)}>
          <Text style={styles.switchButtonText}>⇄ Switch Corridor</Text>
        </TouchableOpacity>
      </View>

      {/* Active Route Highlight Banner */}
      {activeRoute && (
        <View style={styles.activeBanner}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={styles.activeBadge}>⭐ SELECTED ACTIVE ROUTE</Text>
            </View>
            <Text style={styles.activeRouteTitle}>{activeRoute.name}</Text>
            <Text style={styles.activeRouteSub}>
              {activeRoute.stops.filter((s) => s.status === 'VISITED').length}/
              {activeRoute.stops.length} stops completed
            </Text>
          </View>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('RouteDetail', { routeId: activeRoute.id, routeName: activeRoute.name })}
          >
            <Text style={styles.continueButtonText}>Open Route →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* All Corridors List */}
      <FlatList
        data={routes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No routes assigned yet. Pull down to refresh.</Text>
        }
        renderItem={({ item }) => {
          const visited = item.stops.filter((s) => s.status === 'VISITED').length;
          const total = item.stops.length;
          const progress = total > 0 ? visited / total : 0;
          const isCurrentActive = item.id === activeRouteId;

          let badgeVariant: 'gray' | 'amber' | 'green' | 'red' = 'gray';
          if (item.status === 'IN_PROGRESS') badgeVariant = 'amber';
          else if (item.status === 'COMPLETED') badgeVariant = 'green';
          else if (item.status === 'CANCELLED') badgeVariant = 'red';

          const stopNames = item.stops
            .map((s) => s.customer?.name || 'Shop')
            .filter(Boolean)
            .join(' ➔ ');

          return (
            <TouchableOpacity
              style={[styles.card, isCurrentActive && styles.cardActive]}
              onPress={() => handleSelectActiveRoute(item)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {isCurrentActive && (
                    <Text style={styles.activeTag}>● Driving This Route</Text>
                  )}
                </View>
                <StatusBadge variant={badgeVariant} label={STATUS_LABEL[item.status]} />
              </View>

              {stopNames ? (
                <Text style={styles.stopChain} numberOfLines={2}>
                  📍 {stopNames}
                </Text>
              ) : null}

              <Text style={styles.cardSub}>
                {visited}/{total} stops visited
              </Text>
              <View style={styles.progressContainer}>
                <ProgressBar progress={progress} />
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardActionText}>
                  {isCurrentActive ? 'Continue Driving →' : 'Select & Start This Route →'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal to Switch / Pick Route */}
      <Modal visible={showSwitchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>📍</Text>
              <Text style={styles.modalTitle}>Choose Delivery Corridor</Text>
              <Text style={styles.modalSubtitle}>
                Select the corridor you want to drive today:
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {routes.map((r) => {
                const stopCount = r.stops.length;
                const isSelected = r.id === activeRouteId;
                const stopNames = r.stops
                  .map((s) => s.customer?.name || 'Shop')
                  .slice(0, 3)
                  .join(', ');

                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.modalRouteCard, isSelected && styles.modalRouteCardSelected]}
                    onPress={() => handleSelectActiveRoute(r)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalRouteName}>{r.name}</Text>
                      <Text style={styles.modalRouteStops}>
                        {stopCount} stops {stopNames ? `· ${stopNames}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.selectBadge, isSelected && { backgroundColor: brand.black }]}>
                      <Text style={[styles.selectBadgeText, isSelected && { color: brand.gold }]}>
                        {isSelected ? 'Active ✓' : 'Select'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowSwitchModal(false)}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100] },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '700',
    color: brand.black,
  },
  headerSub: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[500],
  },
  switchButton: {
    backgroundColor: brand.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  switchButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  activeBanner: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: brand.gold,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  activeBadge: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '800',
    color: '#9E7412',
    letterSpacing: 0.5,
  },
  activeRouteTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: '700',
    color: brand.black,
    letterSpacing: -0.16,
    marginTop: 2,
  },
  activeRouteSub: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[600],
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: brand.gold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  continueButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  empty: { fontFamily: fontFamily.sans, textAlign: 'center', marginTop: spacing.xl, color: neutral[600] },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  cardActive: {
    borderColor: brand.gold,
    borderWidth: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: fontFamily.sans, fontSize: 16, fontWeight: '700', color: brand.black, letterSpacing: -0.16 },
  activeTag: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F7A5C',
    marginTop: 2,
  },
  stopChain: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[700],
    marginTop: spacing.xs,
    backgroundColor: neutral[50],
    padding: 6,
    borderRadius: radius.sm,
  },
  cardSub: { fontFamily: fontFamily.sans, fontSize: 13, color: neutral[600], marginTop: spacing.xs },
  progressContainer: { marginTop: spacing.sm },
  cardFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: neutral[100],
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardActionText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    color: brand.gold,
  },

  // Switch Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 440,
    padding: spacing.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalEmoji: { fontSize: 32, marginBottom: 4 },
  modalTitle: { fontFamily: fontFamily.sans, fontSize: 20, fontWeight: '800', color: brand.black, letterSpacing: -0.3 },
  modalSubtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: neutral[600], marginTop: 2, textAlign: 'center' },
  modalRouteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neutral[50],
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: neutral[200],
  },
  modalRouteCardSelected: {
    borderColor: brand.gold,
    backgroundColor: '#FDFBF4',
  },
  modalRouteName: { fontFamily: fontFamily.sans, fontSize: 15, fontWeight: '700', color: brand.black, letterSpacing: -0.1 },
  modalRouteStops: { fontFamily: fontFamily.sans, fontSize: 12, color: neutral[600], marginTop: 2 },
  selectBadge: {
    backgroundColor: brand.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginLeft: 8,
  },
  selectBadgeText: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '700', color: brand.black },
  closeModalButton: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '600',
    color: neutral[600],
  },
});
