import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../api/client';
import { brand, neutral, spacing, radius, fontFamily } from '../theme';

export default function CreateCustomerScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name || !phone) return Alert.alert('Error', 'Name and Phone are required.');
    setLoading(true);
    try {
      let lat, lng;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
      
      const newCustomer = await api.createCustomer({ name, phone, address, lat, lng });
      Alert.alert('Success', 'Customer added!');
      // Navigate straight to taking their order!
      navigation.replace('OrderCollection', { customerId: newCustomer.id, customerName: newCustomer.name });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save customer');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Shop / Customer Name *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Abdi Kiosk" />
      
      <Text style={styles.label}>Phone Number *</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0911..." />
      
      <Text style={styles.label}>Address / Area</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="e.g. Bole Medhanialem" />

      <Text style={styles.gpsNote}>📍 GPS location will be captured automatically</Text>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color={brand.black} /> : <Text style={styles.buttonText}>Save & Start Order</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100], padding: spacing.lg },
  label: { fontFamily: fontFamily.sans, fontWeight: '700', fontSize: 13, marginBottom: 6, color: neutral[700] },
  input: { fontFamily: fontFamily.sans, backgroundColor: '#FFF', borderWidth: 1, borderColor: neutral[200], padding: 14, borderRadius: radius.md, marginBottom: spacing.md, fontSize: 15, color: brand.black },
  gpsNote: { fontFamily: fontFamily.sans, color: neutral[500], fontSize: 12, marginBottom: spacing.xl, textAlign: 'center' },
  button: { backgroundColor: brand.gold, padding: 16, borderRadius: radius.md, alignItems: 'center' },
  buttonText: { fontFamily: fontFamily.sans, fontWeight: '700', fontSize: 15, color: brand.black },
});
