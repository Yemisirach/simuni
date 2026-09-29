import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { api, isNetworkError } from '../api/client';
import { brand, neutral, spacing, radius, shadows, fontFamily } from '../theme';

interface SurveySpot {
  id: string;
  name: string;
  category: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  timestamp: number;
  status: 'PENDING_SYNC' | 'SYNCED';
  cloudId?: string;
}

const STORAGE_KEY = '@simuni_field_survey_spots';

const CATEGORIES = [
  { id: 'RETAIL_SHOP', label: '🏪 Retail Shop' },
  { id: 'KIOSK', label: '🛒 Kiosk / Kantina' },
  { id: 'SUPERMARKET', label: '🏬 Supermarket' },
  { id: 'WHOLESALER', label: '📦 Wholesaler' },
  { id: 'HORECA', label: '🍽️ Hotel / Cafe' },
  { id: 'OTHER', label: '📍 Other Location' },
];

export default function FieldSurveyScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('RETAIL_SHOP');
  const [phone, setPhone] = useState('');

  // Continuous Live GPS state
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Survey spots list
  const [spots, setSpots] = useState<SurveySpot[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Fetch current GPS position on-demand
  const refreshGPS = useCallback(async (): Promise<{ lat: number; lng: number; accuracy: number | null } | null> => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('GPS permission denied');
        setGpsLoading(false);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const updated = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ? Math.round(loc.coords.accuracy * 10) / 10 : null,
      };
      setCoords(updated);
      return updated;
    } catch (err: any) {
      console.warn('GPS lock failed:', err.message);
      setGpsError('Acquiring signal...');
      return null;
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // 2. Start continuous GPS tracking so coordinates are always live and ready
  const startLiveTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('GPS permission denied');
        return;
      }

      // Initial fast lock
      await refreshGPS();

      // Continuous watcher while surveyor walks
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 2, // update every 2 meters walked
          timeInterval: 3000,  // or every 3 seconds
        },
        (loc) => {
          setCoords({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            accuracy: loc.coords.accuracy ? Math.round(loc.coords.accuracy * 10) / 10 : null,
          });
          setGpsError(null);
        }
      );
    } catch (e: any) {
      console.warn('Continuous GPS watching error:', e.message);
    }
  }, [refreshGPS]);

  // 3. Load stored survey spots from offline storage
  const loadLocalSpots = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setSpots(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load local survey spots:', e);
    }
  }, []);

  useEffect(() => {
    startLiveTracking();
    loadLocalSpots();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [startLiveTracking, loadLocalSpots]);

  // 4. Save Spot with Auto-Captured GPS (Offline First)
  const handleSaveSpot = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a shop or location name.');
      return;
    }

    setSaving(true);
    try {
      // Auto-capture current GPS: use existing lock or force fresh acquisition
      let activeCoords = coords;
      if (!activeCoords) {
        activeCoords = await refreshGPS();
      }

      const newSpot: SurveySpot = {
        id: `survey_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: name.trim(),
        category: selectedCategory,
        phone: phone.trim(),
        lat: activeCoords?.lat ?? null,
        lng: activeCoords?.lng ?? null,
        accuracy: activeCoords?.accuracy ?? null,
        timestamp: Date.now(),
        status: 'PENDING_SYNC',
      };

      const updatedSpots = [newSpot, ...spots];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSpots));
      setSpots(updatedSpots);

      // Reset input fields immediately for the next stop
      setName('');
      setPhone('');

      const gpsNotice = newSpot.lat && newSpot.lng
        ? `\nGPS: ${newSpot.lat.toFixed(5)}, ${newSpot.lng.toFixed(5)} (±${newSpot.accuracy || '?'}m)`
        : '\n(No GPS locked yet)';

      Alert.alert('📍 Spot Tagged!', `"${newSpot.name}" saved with auto-GPS.${gpsNotice}`, [
        { text: 'OK' },
      ]);

      // Attempt background cloud sync if online
      trySyncToCloud(updatedSpots);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save offline: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 5. Cloud Sync Engine
  const trySyncToCloud = async (currentSpots?: SurveySpot[]) => {
    const listToSync = currentSpots || spots;
    const pending = listToSync.filter((s) => s.status === 'PENDING_SYNC');
    if (pending.length === 0) return;

    setSyncing(true);
    let syncedCount = 0;
    const updated = [...listToSync];

    for (const spot of pending) {
      try {
        const gpsAddress = spot.lat && spot.lng
          ? `GPS: ${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)}${spot.accuracy ? ` (±${spot.accuracy}m)` : ''}`
          : 'Survey Tagged Location';

        const created = await api.createCustomer({
          name: spot.name,
          phone: spot.phone || 'N/A',
          address: gpsAddress,
          category: spot.category,
          lat: spot.lat ?? undefined,
          lng: spot.lng ?? undefined,
        });

        const idx = updated.findIndex((s) => s.id === spot.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            status: 'SYNCED',
            cloudId: created.id,
          };
          syncedCount++;
        }
      } catch (e: any) {
        if (isNetworkError(e)) {
          // Device is offline, stop loop and keep in local queue
          console.log('[Survey Sync] Offline, remaining spots queued for later.');
          break;
        }
      }
    }

    if (syncedCount > 0) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSpots(updated);
    }
    setSyncing(false);
  };

  // Delete a local survey tag
  const handleDeleteSpot = (id: string) => {
    Alert.alert('Delete Spot', 'Remove this surveyed location from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const filtered = spots.filter((s) => s.id !== id);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
          setSpots(filtered);
        },
      },
    ]);
  };

  const pendingCount = spots.filter((s) => s.status === 'PENDING_SYNC').length;
  const syncedCount = spots.filter((s) => s.status === 'SYNCED').length;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header & Sync Status Bar */}
      <View style={styles.statusBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Field Survey & Tagging</Text>
          <Text style={styles.headerSubtitle}>
            GPS Auto-Tagging · Works 100% Offline
          </Text>
          <View style={styles.counterRow}>
            <View style={[styles.statusDot, { backgroundColor: pendingCount > 0 ? '#F59E0B' : '#10B981' }]} />
            <Text style={styles.counterText}>
              {pendingCount} Pending Sync · {syncedCount} In Cloud
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, pendingCount === 0 && { opacity: 0.6 }]}
          onPress={() => trySyncToCloud()}
          disabled={syncing || pendingCount === 0}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#1A1A1A" />
          ) : (
            <Text style={styles.syncButtonText}>☁️ Sync ({pendingCount})</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Live GPS Auto-Capture Card */}
      <View style={styles.gpsBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={styles.gpsDotOuter}>
            <View style={[styles.gpsDotInner, { backgroundColor: coords ? '#10B981' : '#F59E0B' }]} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.gpsLabel}>LIVE GPS AUTO-LOCK</Text>
              {coords && (
                <View style={styles.liveTag}>
                  <Text style={styles.liveTagText}>ACTIVE</Text>
                </View>
              )}
            </View>
            {gpsLoading ? (
              <Text style={styles.gpsSub}>Acquiring high-accuracy satellite fix...</Text>
            ) : coords ? (
              <Text style={styles.gpsValue}>
                {coords.lat.toFixed(6)}°, {coords.lng.toFixed(6)}°
                {coords.accuracy ? ` (±${coords.accuracy}m)` : ''}
              </Text>
            ) : (
              <Text style={[styles.gpsSub, { color: '#EF4444' }]}>{gpsError || 'Waiting for GPS...'}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.gpsRefreshBtn} onPress={() => refreshGPS()} disabled={gpsLoading}>
          {gpsLoading ? (
            <ActivityIndicator size="small" color={brand.black} />
          ) : (
            <Text style={styles.gpsRefreshText}>🔄 Re-Lock</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Fast Spot Tagging Form */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>TAG NEW LOCATION</Text>

        <Text style={styles.fieldLabel}>Shop / Location Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Selam Grocery, Abyssinia Mart"
          value={name}
          onChangeText={setName}
          placeholderTextColor={neutral[400]}
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catPill, isSelected && styles.catPillSelected]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Auto GPS Notice Box (Replaced manual building reference input) */}
        <View style={styles.autoGpsBox}>
          <Text style={styles.autoGpsBoxTitle}>📍 Auto GPS Coordinate Capture</Text>
          <Text style={styles.autoGpsBoxDesc}>
            {coords
              ? `Current location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}) will be auto-saved automatically. No manual address typing needed.`
              : 'Acquiring satellite lock. When you tap Save, coordinates are auto-recorded.'}
          </Text>
        </View>

        <Text style={styles.fieldLabel}>Owner Phone (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="09XXXXXXXX"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={neutral[400]}
        />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveSpot}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={brand.black} />
          ) : (
            <Text style={styles.saveBtnText}>📍 Tag & Auto-Save GPS (Offline First)</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Surveyed Spots Feed */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Surveyed Spots on Device ({spots.length})</Text>
      </View>

      {spots.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>📝</Text>
          <Text style={styles.emptyTitle}>No Survey Locations Yet</Text>
          <Text style={styles.emptySub}>
            Walk the corridor and tap "Tag & Auto-Save GPS" at every shop.
          </Text>
        </View>
      ) : (
        spots.map((item) => (
          <View key={item.id} style={styles.spotCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.spotName}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6, flexWrap: 'wrap' }}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.syncBadge,
                      { backgroundColor: item.status === 'SYNCED' ? '#D1FAE5' : '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.syncBadgeText,
                        { color: item.status === 'SYNCED' ? '#065F46' : '#92400E' },
                      ]}
                    >
                      {item.status === 'SYNCED' ? '✓ In Cloud' : '● Saved Offline'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={() => handleDeleteSpot(item.id)} style={{ padding: 4 }}>
                <Text style={{ color: '#EF4444', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Prominent Auto-Captured GPS Tag */}
            <View style={styles.spotCoordsBadge}>
              <Text style={styles.spotCoordsText}>
                {item.lat && item.lng
                  ? `📍 GPS: ${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}${item.accuracy ? ` (±${item.accuracy}m)` : ''}`
                  : '📍 GPS: No coordinate lock'}
              </Text>
            </View>

            {item.phone ? (
              <Text style={styles.spotPhone}>📞 {item.phone}</Text>
            ) : null}

            <View style={styles.spotFooter}>
              <Text style={styles.spotTime}>
                🕒 {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {item.cloudId ? (
              <TouchableOpacity
                style={styles.orderShortcutBtn}
                onPress={() =>
                  navigation.navigate('Customers', {
                    screen: 'OrderCollection',
                    params: { customerId: item.cloudId, customerName: item.name },
                  })
                }
              >
                <Text style={styles.orderShortcutText}>🛒 Take Order for this Shop →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F3',
  },
  statusBar: {
    backgroundColor: '#1A1A1A',
    padding: spacing.md,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  counterText: {
    fontSize: 11,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#C4A35A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  syncButtonText: {
    color: '#1A1A1A',
    fontWeight: '700',
    fontSize: 12,
  },
  gpsBanner: {
    backgroundColor: '#FFFFFF',
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gpsDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gpsLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#6B7280',
  },
  liveTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#065F46',
  },
  gpsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gpsSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  gpsRefreshBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  gpsRefreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#6B7280',
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 4,
    marginTop: 2,
  },
  catPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  catPillSelected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  catPillText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  catPillTextSelected: {
    color: '#C4A35A',
    fontWeight: '700',
  },
  autoGpsBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.sm,
    padding: 10,
    marginTop: spacing.sm,
  },
  autoGpsBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  autoGpsBoxDesc: {
    fontSize: 11,
    color: '#15803D',
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: '#C4A35A',
    paddingVertical: 14,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnText: {
    color: '#1A1A1A',
    fontWeight: '800',
    fontSize: 15,
  },
  sectionHeader: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#FFFFFF',
    margin: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  spotCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  spotName: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  spotCoordsBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
  },
  spotCoordsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  spotPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  spotFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  spotTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  orderShortcutBtn: {
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  orderShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
});
