import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../api/client';
import { brand, neutral, semantic, spacing, radius, fontFamily } from '../theme';

type Stage = 'ready' | 'in_transit' | 'arrived' | 'delivered';

export default function DeliveryConfirmScreen({ route, navigation }: any) {
  const { orderId, customerName } = route.params;
  const [stage, setStage] = useState<Stage>('ready');
  const [loading, setLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const startDelivery = async () => {
    setLoading(true);
    try {
      await api.startDelivery(orderId);
      setStage('in_transit');
    } finally {
      setLoading(false);
    }
  };

  const markArrived = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 0, lng = 0;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
        setAccuracy(loc.coords.accuracy || null);
      }
      await api.arriveDelivery(orderId, lat, lng);
      setStage('arrived');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelivery = async () => {
    setLoading(true);
    try {
      await api.confirmDelivery(orderId);
      const invoice = await api.generateInvoice(orderId);
      setStage('delivered');
      // haptic placeholder
      console.log('[HAPTICS] Delivery Confirmed');
      navigation.replace('Invoice', { orderId: invoice.id, customerName });
    } catch (e: any) {
      Alert.alert('Could not confirm delivery', e.message);
    } finally {
      setLoading(false);
    }
  };

  const steps: { key: Stage; label: string; action: () => void }[] = [
    { key: 'ready', label: 'Start Delivery', action: startDelivery },
    { key: 'in_transit', label: 'Arrived at Customer', action: markArrived },
    { key: 'arrived', label: 'Confirm Delivery', action: confirmDelivery },
  ];

  const current = steps.find((s) => s.key === stage);

  return (
    <View style={styles.container}>
      <Text style={styles.customerName}>{customerName}</Text>
      <Text style={styles.subtitle}>Delivery workflow</Text>

      <View style={styles.timeline}>
        {['Start delivery', 'Navigate', 'Arrive customer', 'Confirm delivery'].map((label, i) => {
          const stageIndex = ['ready', 'in_transit', 'arrived', 'delivered'].indexOf(stage);
          const done = i < stageIndex + 1;
          const currentStage = i === stageIndex + 1;
          
          let dotColor = neutral[300];
          if (done) dotColor = semantic.success;
          if (currentStage) dotColor = brand.gold;

          return (
            <View key={label} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                {i < 3 && <View style={[styles.connector, done && styles.connectorDone]} />}
              </View>
              <Text style={[styles.timelineLabel, done && styles.timelineLabelDone, currentStage && styles.timelineLabelCurrent]}>{label}</Text>
            </View>
          );
        })}
      </View>

      {accuracy !== null && (
        <Text style={styles.accuracyText}>GPS Accuracy: ±{Math.round(accuracy)}m</Text>
      )}

      {current && (
        <TouchableOpacity style={styles.primaryButton} onPress={current.action} disabled={loading}>
          {loading ? <ActivityIndicator color={brand.black} /> : <Text style={styles.primaryButtonText}>{current.label}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100], padding: spacing.lg },
  customerName: { fontFamily: fontFamily.sans, fontSize: 24, fontWeight: '800', color: brand.black, textAlign: 'center', marginTop: spacing.lg, letterSpacing: -0.5 },
  subtitle: { fontFamily: fontFamily.sans, fontSize: 14, color: neutral[600], textAlign: 'center', marginBottom: spacing['2xl'] },
  timeline: { marginBottom: spacing.xl, marginLeft: spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', marginRight: spacing.lg, width: 20 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  connector: { width: 3, height: 40, backgroundColor: neutral[300], marginVertical: 4 },
  connectorDone: { backgroundColor: semantic.success },
  timelineLabel: { fontFamily: fontFamily.sans, fontSize: 16, color: neutral[600], paddingTop: 0 },
  timelineLabelDone: { color: brand.black, fontWeight: '700' },
  timelineLabelCurrent: { color: brand.black, fontWeight: '600' },
  accuracyText: { fontFamily: fontFamily.mono, fontSize: 12, color: neutral[500], textAlign: 'center', marginBottom: spacing.md },
  primaryButton: { backgroundColor: brand.gold, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: brand.black, fontWeight: '700', fontSize: 16, fontFamily: fontFamily.sans },
});
