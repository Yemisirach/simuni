import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { brand, neutral, spacing, radius, fontFamily, semantic } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Route selection prompt state
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [showRoutePicker, setShowRoutePicker] = useState(false);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const token = await AsyncStorage.getItem('simuni_token');
        if (token) {
          const activeRouteId = await AsyncStorage.getItem('simuni_active_route_id');
          if (!activeRouteId) {
            try {
              const routes = await api.myRoutes();
              if (routes && routes.length > 0) {
                setAvailableRoutes(routes);
                setShowRoutePicker(true);
                setCheckingSession(false);
                return;
              }
            } catch (err) {
              console.log('Routes fetch error during session restore:', err);
            }
          }
          navigation.replace('MainTabs');
          return;
        }
        const savedPhone = await AsyncStorage.getItem('simuni_saved_phone');
        if (savedPhone) {
          setPhone(savedPhone);
        }
      } catch (e) {
        console.error('Session restore error:', e);
      } finally {
        setCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [navigation]);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Missing info', 'Enter your phone number and password.');
      return;
    }
    setLoading(true);
    try {
      await api.login(phone, password);
      // Ask user to pick their route immediately after login
      try {
        const routes = await api.myRoutes();
        if (routes && routes.length > 0) {
          setAvailableRoutes(routes);
          setShowRoutePicker(true);
          return;
        }
      } catch (rErr) {
        console.log('Routes load error post-login:', rErr);
      }
      navigation.replace('MainTabs');
    } catch (e: any) {
      Alert.alert('Login failed', e.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoute = async (route: any) => {
    try {
      await AsyncStorage.setItem('simuni_active_route_id', route.id);
      await AsyncStorage.setItem('simuni_active_route_name', route.name);
    } catch (e) {
      console.error('Failed to save selected route:', e);
    }
    setShowRoutePicker(false);
    navigation.replace('MainTabs', {
      screen: 'Routes',
      params: {
        screen: 'RouteDetail',
        params: { routeId: route.id, routeName: route.name },
      },
    });
  };

  const handleSkipRoutePicker = () => {
    setShowRoutePicker(false);
    navigation.replace('MainTabs');
  };

  if (checkingSession) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={brand.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image
            source={require('../../assets/logo.jpg')}
            style={{ width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 16 }}
          />
          <Text style={styles.brandTitle}>Simuni</Text>
          <Text style={styles.brandSubtitle}>Field Agent</Text>
          <View style={styles.decorativeLine} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="09XXXXXXXX"
            placeholderTextColor={neutral[400]}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={neutral[400]}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={brand.black} /> : <Text style={styles.buttonText}>Log In</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Prompt user to pick route on login */}
      <Modal visible={showRoutePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEmoji}>🚚</Text>
              <Text style={styles.modalTitle}>Select Today's Route</Text>
              <Text style={styles.modalSubtitle}>
                Which corridor are you delivering today?
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {availableRoutes.map((r) => {
                const stopCount = r.stops?.length || 0;
                const stopNames = r.stops
                  ?.map((s: any) => s.customer?.name || 'Shop')
                  .slice(0, 3)
                  .join(', ');
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.routeCard}
                    onPress={() => handleSelectRoute(r)}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.routeCardName} numberOfLines={1}>{r.name}</Text>
                      </View>
                      <Text style={styles.routeCardStops}>
                        📍 {stopCount} stops {stopNames ? `(${stopNames})` : ''}
                      </Text>
                    </View>
                    <View style={styles.selectBadge}>
                      <Text style={styles.selectBadgeText}>Drive →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkipRoutePicker}>
              <Text style={styles.skipButtonText}>Browse All Routes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.black },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  brandTitle: { fontFamily: fontFamily.serif, fontSize: 40, fontWeight: '800', color: '#FFFFFF' },
  brandSubtitle: { fontFamily: fontFamily.sans, fontSize: 16, color: neutral[400], marginTop: spacing.xs },
  decorativeLine: {
    width: 40,
    height: 2,
    backgroundColor: brand.gold,
    marginTop: spacing.md,
  },
  form: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: { fontFamily: fontFamily.sans, fontSize: 13, color: neutral[600], marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: brand.black,
  },
  button: {
    backgroundColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: { fontFamily: fontFamily.sans, color: brand.black, fontSize: 16, fontWeight: '700' },

  // Modal styles for Route Picker
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalEmoji: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '800',
    color: brand.black,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: neutral[600],
    marginTop: 4,
    textAlign: 'center',
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: neutral[50],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: neutral[200],
  },
  routeCardName: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '700',
    color: brand.black,
  },
  routeCardStops: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[600],
    marginTop: 2,
  },
  selectBadge: {
    backgroundColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectBadgeText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    color: brand.black,
  },
  skipButton: {
    marginTop: spacing.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '600',
    color: neutral[600],
  },
});
