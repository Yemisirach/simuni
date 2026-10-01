import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MapView, Marker, Polyline } from '../components/MapComponent';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { api, API_BASE_URL } from '../api/client';
import { pushGpsPing } from '../offline/queue';
import { brand, neutral, semantic, spacing, radius, fontFamily, partners } from '../theme';
import NavigationBanner from '../components/NavigationBanner';
import StopTimelineItem from '../components/StopTimelineItem';
import StatusBadge from '../components/StatusBadge';

interface Stop {
  id: string;
  sequence: number;
  status: 'PENDING' | 'VISITED' | 'SKIPPED';
  customer: { id: string; name: string; address?: string; lat?: number; lng?: number; category?: string };
}

interface Directions {
  stopId: string;
  customerName: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][]; // [lng, lat]
  steps: { instruction: string; distanceMeters: number }[];
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function RouteDetailScreen({ route, navigation }: any) {
  const { routeId } = route.params;
  const [stops, setStops] = useState<Stop[]>([]);
  const [status, setStatus] = useState<string>('PLANNED');
  const [agentPosition, setAgentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<Directions | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Two Tabs: 'preorder' | 'all_shops'
  const [activeTab, setActiveTab] = useState<'preorder' | 'all_shops'>('preorder');
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locatingSpot, setLocatingSpot] = useState(false);

  const load = async () => {
    try {
      const data = await api.routeDetail(routeId);
      setStops(data.stops);
      setStatus(data.status);
    } catch (e) {
      console.error(e);
    }
    try {
      const custs = await api.customers();
      setAllCustomers(custs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, [routeId]);

  useEffect(() => {
    if (status !== 'IN_PROGRESS') return;

    let watcher: Location.LocationSubscription | undefined;
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') return;

      const agentId = await api.currentUserId();
      const workspaceId = await api.ensureWorkspaceId();
      socketRef.current = io(`${API_BASE_URL.replace('/api/v1', '')}/gps`, { reconnectionDelay: 2000 });
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 15 },
        (loc) => {
          setAgentPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          setAccuracy(loc.coords.accuracy || null);
          const point = { routeId, agentId, workspaceId, lat: loc.coords.latitude, lng: loc.coords.longitude };
          if (socketRef.current?.connected) {
            socketRef.current.emit('location:update', point);
          } else if (agentId) {
            pushGpsPing(point as any);
          }
        },
      );
    })();

    return () => {
      watcher?.remove();
      socketRef.current?.disconnect();
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'IN_PROGRESS' || !agentPosition) return;

    let cancelled = false;
    const fetchDirections = async () => {
      try {
        const result = await api.directions(routeId, agentPosition.lat, agentPosition.lng);
        if (!cancelled) setDirections(result);
      } catch {
        if (!cancelled) setDirections(null);
      }
    };

    fetchDirections();
    const interval = setInterval(fetchDirections, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, agentPosition?.lat, agentPosition?.lng]);

  const handleStartRoute = async () => {
    await api.startRoute(routeId);
    setStatus('IN_PROGRESS');
  };

  const handleOptimizeRoute = async () => {
    if (!agentPosition) {
      Alert.alert('Location needed', 'Waiting for your GPS position — try again in a moment.');
      return;
    }
    setOptimizing(true);
    try {
      await api.optimizeRoute(routeId, agentPosition.lat, agentPosition.lng);
      await load();
      Alert.alert('Route updated', 'Stops have been re-ordered for the shortest overall trip.');
    } catch (e: any) {
      Alert.alert('Could not optimize route', e.message || 'Is OSRM running?');
    } finally {
      setOptimizing(false);
    }
  };

  const handleCompleteRoute = async () => {
    const remaining = stops.filter((s) => s.status === 'PENDING').length;
    if (remaining > 0) {
      Alert.alert('Stops remaining', `${remaining} stop(s) haven't been visited yet. Complete anyway?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: async () => { await api.completeRoute(routeId); navigation.goBack(); } },
      ]);
      return;
    }
    await api.completeRoute(routeId);
    navigation.goBack();
  };

  const visitAndOrder = async (stop: Stop) => {
    try {
      await api.visitStop(routeId, stop.id);
      load();
    } catch (e) {
      // Offline queue handled
    }
    navigation.navigate('OrderCollection', {
      customerId: stop.customer.id,
      customerName: stop.customer.name,
      routeId,
    });
  };

  // Instant Live Delivery without Pre-order
  const handleSpotDelivery = async () => {
    setLocatingSpot(true);
    try {
      let lat: number | undefined = agentPosition?.lat;
      let lng: number | undefined = agentPosition?.lng;

      if (!lat || !lng) {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      }

      navigation.navigate('OrderCollection', {
        customerId: 'new_spot',
        customerName: 'Spot Delivery (Auto GPS)',
        routeId,
        isSpotSale: true,
        spotLat: lat,
        spotLng: lng,
      });
    } catch (e: any) {
      navigation.navigate('OrderCollection', {
        customerId: 'new_spot',
        customerName: 'Spot Delivery',
        routeId,
        isSpotSale: true,
      });
    } finally {
      setLocatingSpot(false);
    }
  };

  const withCoords = stops.filter((s) => s.customer.lat && s.customer.lng);
  const pendingStops = stops.filter((s) => s.status === 'PENDING');
  const currentStop = pendingStops.length > 0 ? pendingStops[0] : null;

  // Filter available shops
  const filteredCustomers = useMemo(() => {
    let list = allCustomers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q));
    }
    if (agentPosition) {
      return [...list].sort((a, b) => {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        const da = calculateDistance(agentPosition.lat, agentPosition.lng, a.lat, a.lng);
        const db = calculateDistance(agentPosition.lat, agentPosition.lng, b.lat, b.lng);
        return da - db;
      });
    }
    return list;
  }, [allCustomers, searchQuery, agentPosition]);

  return (
    <View style={styles.container}>
      {/* Interactive Map (Web & Mobile) */}
      {withCoords.length > 0 && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: withCoords[0].customer.lat!,
              longitude: withCoords[0].customer.lng!,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
          >
            {withCoords.map((s) => (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.customer.lat!, longitude: s.customer.lng! }}
                title={s.customer.name}
                pinColor={s.status === 'VISITED' ? semantic.success : brand.gold}
              />
            ))}
            {agentPosition && (
              <Marker
                coordinate={{ latitude: agentPosition.lat, longitude: agentPosition.lng }}
                title="You"
                pinColor={brand.black}
              />
            )}
            {directions && directions.geometry.length > 1 && (
              <Polyline
                coordinates={directions.geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))}
                strokeColor={partners.osrm}
                strokeWidth={4}
              />
            )}
          </MapView>
          {accuracy !== null && (
            <View style={styles.accuracyOverlay}>
              <Text style={styles.accuracyText}>GPS ±{Math.round(accuracy)}m</Text>
            </View>
          )}
        </View>
      )}

      {/* OSRM Navigation Banner */}
      {directions && directions.steps.length > 0 && <NavigationBanner directions={directions} />}

      {/* Segmented Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'preorder' && styles.tabButtonActive]}
          onPress={() => setActiveTab('preorder')}
        >
          <Text style={[styles.tabText, activeTab === 'preorder' && styles.tabTextActive]}>
            📋 Pre-order Route ({stops.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all_shops' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all_shops')}
        >
          <Text style={[styles.tabText, activeTab === 'all_shops' && styles.tabTextActive]}>
            🏪 All Available Shops ({allCustomers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: PRE-ORDER ROUTE */}
      {activeTab === 'preorder' && (
        <View style={{ flex: 1 }}>
          {currentStop && (
            <View style={styles.currentStopCard}>
              <View style={styles.currentStopHeader}>
                <Text style={styles.currentStopLabel}>
                  STOP {currentStop.sequence} OF {stops.length}
                </Text>
                <StatusBadge variant="gold" label="PRIORITY" />
              </View>
              <Text style={styles.currentStopName}>{currentStop.customer.name}</Text>
              <Text style={styles.currentStopAddress}>{currentStop.customer.address || 'GPS Tagged'}</Text>
            </View>
          )}

          <FlatList
            style={styles.list}
            data={stops}
            keyExtractor={(s) => s.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity onPress={() => visitAndOrder(item)} disabled={item.status === 'VISITED'}>
                <StopTimelineItem
                  sequence={item.sequence}
                  customerName={item.customer.name}
                  address={item.customer.address}
                  status={item.status}
                  isCurrent={currentStop?.id === item.id}
                  isLast={index === stops.length - 1}
                  outstandingBalance={(item.customer as any).outstandingBalance}
                />
              </TouchableOpacity>
            )}
          />

          <View style={styles.footer}>
            {status === 'IN_PROGRESS' && stops.some((s) => s.status === 'PENDING') && (
              <TouchableOpacity
                style={[styles.secondaryButton, optimizing && styles.primaryButtonDisabled]}
                onPress={handleOptimizeRoute}
                disabled={optimizing}
              >
                <Text style={styles.secondaryButtonText}>{optimizing ? 'Optimizing…' : '📍 Suggest Best Route'}</Text>
              </TouchableOpacity>
            )}
            {status === 'PLANNED' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleStartRoute}>
                <Text style={styles.primaryButtonText}>Start Route</Text>
              </TouchableOpacity>
            )}
            {status === 'IN_PROGRESS' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleCompleteRoute}>
                <Text style={styles.primaryButtonText}>Complete Route</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* TAB 2: ALL AVAILABLE SHOPS & LIVE ORDERS */}
      {activeTab === 'all_shops' && (
        <View style={{ flex: 1 }}>
          {/* Direct Live Spot Delivery Button */}
          <View style={styles.spotActionCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.spotActionTitle}>⚡ Live Delivery (No Pre-order)</Text>
              <Text style={styles.spotActionSubtitle}>Auto-captures live GPS. Deliver & invoice right now on the road.</Text>
            </View>
            <TouchableOpacity
              style={styles.spotActionButton}
              onPress={handleSpotDelivery}
              disabled={locatingSpot}
            >
              {locatingSpot ? (
                <ActivityIndicator color={brand.black} size="small" />
              ) : (
                <Text style={styles.spotActionButtonText}>+ Deliver Now</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search shops by name, category, or area..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={neutral[400]}
            />
          </View>

          {/* List of Available Shops */}
          <FlatList
            style={styles.list}
            data={filteredCustomers}
            keyExtractor={(c) => c.id}
            ListEmptyComponent={
              <View style={styles.emptyShopsContainer}>
                <Text style={styles.emptyShopsText}>No shops matching &quot;{searchQuery}&quot;</Text>
              </View>
            }
            renderItem={({ item }) => {
              const hasGps = item.lat && item.lng;
              const dist =
                hasGps && agentPosition
                  ? calculateDistance(agentPosition.lat, agentPosition.lng, item.lat, item.lng)
                  : null;

              return (
                <View style={styles.shopCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.shopHeaderRow}>
                      <Text style={styles.shopCardTitle}>{item.name}</Text>
                      {item.category && <Text style={styles.shopCategoryBadge}>{item.category}</Text>}
                    </View>
                    <Text style={styles.shopCardAddress}>
                      {item.address || (hasGps ? `GPS: ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}` : 'No GPS')}
                    </Text>
                    {dist !== null && (
                      <Text style={styles.shopDistanceText}>
                        📍 {dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.shopOrderButton}
                    onPress={() =>
                      navigation.navigate('OrderCollection', {
                        customerId: item.id,
                        customerName: item.name,
                        routeId,
                      })
                    }
                  >
                    <Text style={styles.shopOrderButtonText}>📦 Order</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100] },
  mapContainer: { width: '100%', height: 220, position: 'relative' },
  map: { width: '100%', height: '100%' },
  accuracyOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(26, 26, 26, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  accuracyText: { fontFamily: fontFamily.mono, color: '#FFF', fontSize: 10 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: brand.gold,
  },
  tabText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '600',
    color: neutral[500],
  },
  tabTextActive: {
    color: brand.black,
    fontWeight: '700',
  },

  list: { flex: 1, padding: spacing.md },
  currentStopCard: {
    backgroundColor: '#FFFFFF',
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: neutral[200],
  },
  currentStopHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  currentStopLabel: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '700', color: neutral[600] },
  currentStopName: { fontFamily: fontFamily.sans, fontSize: 18, color: brand.black, fontWeight: '700', letterSpacing: -0.3 },
  currentStopAddress: { fontFamily: fontFamily.sans, fontSize: 14, color: neutral[600], marginTop: 2 },
  footer: { padding: spacing.md, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: neutral[200] },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  secondaryButtonText: { color: brand.gold, fontWeight: '700', fontSize: 15, fontFamily: fontFamily.sans },
  primaryButton: { backgroundColor: brand.gold, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: brand.black, fontWeight: '700', fontSize: 16, fontFamily: fontFamily.sans },

  // Spot Delivery Card
  spotActionCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: brand.gold,
    borderRadius: radius.md,
    margin: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  spotActionTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  spotActionSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  spotActionButton: {
    backgroundColor: brand.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  spotActionButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '800',
    color: brand.black,
  },

  // Search
  searchBarContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: brand.black,
  },

  // Available Shop Row
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  shopCardTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '700',
    color: brand.black,
  },
  shopCategoryBadge: {
    backgroundColor: neutral[100],
    color: neutral[600],
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shopCardAddress: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[500],
    marginTop: 2,
  },
  shopDistanceText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: semantic.success,
    fontWeight: '700',
    marginTop: 3,
  },
  shopOrderButton: {
    backgroundColor: neutral[100],
    borderWidth: 1,
    borderColor: brand.gold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  shopOrderButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.black,
  },
  emptyShopsContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyShopsText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: neutral[400],
  },
});
