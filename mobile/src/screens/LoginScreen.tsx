import React, { useState } from 'react';
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
} from 'react-native';
import { api } from '../api/client';
import { brand, neutral, spacing, radius, colors, fontFamily } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Missing info', 'Enter your phone number and password.');
      return;
    }
    setLoading(true);
    try {
      await api.login(phone, password);
      navigation.replace('MainTabs');
    } catch (e: any) {
      Alert.alert('Login failed', e.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <Image source={require('../../assets/logo.jpg')} style={{ width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 16 }} />
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.black, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  brandCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  brandLetter: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    fontWeight: '800',
    color: brand.black,
  },
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
});
