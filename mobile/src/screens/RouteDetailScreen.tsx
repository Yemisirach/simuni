import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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
  customer: { id: string; name: string; address?: string; lat?: number; lng?: number };
}

interface Directions {
  stopId: string;
  customerName: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][]; // [lng, lat]
  steps: { instruction: string; distanceMeters: number }[];
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

  const load = async () => {
    const data = await api.routeDetail(routeId);
    setStops(data.stops);
    setStatus(data.status);
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

  const withCoords = stops.filter((s) => s.customer.lat && s.customer.lng);
  
  // Find current stop
  const pendingStops = stops.filter(s => s.status === 'PENDING');
  const currentStop = pendingStops.length > 0 ? pendingStops[0] : null;

  return (
    <View style={styles.container}>
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

      {directions && directions.steps.length > 0 && (
        <NavigationBanner directions={directions} />
      )}
      
      {currentStop && (
        <View style={styles.currentStopCard}>
          <View style={styles.currentStopHeader}>
            <Text style={styles.currentStopLabel}>STOP {currentStop.sequence} OF {stops.length}</Text>
            <StatusBadge variant="gold" label="PRIORITY" />
          </View>
          <Text style={styles.currentStopName}>{currentStop.customer.name}</Text>
          <Text style={styles.currentStopAddress}>{currentStop.customer.address}</Text>
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
  currentStopName: { fontFamily: fontFamily.serif, fontSize: 18, color: brand.black, fontWeight: '700' },
  currentStopAddress: { fontFamily: fontFamily.sans, fontSize: 14, color: neutral[600], marginTop: 2 },
  footer: { padding: spacing.md, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: neutral[200] },
  secondaryButton: {
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: brand.gold,
    borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center', marginBottom: spacing.sm,
  },
  secondaryButtonText: { color: brand.gold, fontWeight: '700', fontSize: 15, fontFamily: fontFamily.sans },
  primaryButton: { backgroundColor: brand.gold, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: brand.black, fontWeight: '700', fontSize: 16, fontFamily: fontFamily.sans },
});
