import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { brand, neutral, spacing, radius, shadows, fontFamily } from '../theme';

export default function CustomerListScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.customers();
      setCustomers(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search customers..." 
          value={search} 
          onChangeText={setSearch} 
        />
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateCustomer')}>
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: '#1A1A1A', marginLeft: 6 }]} 
          onPress={() => navigation.navigate('FieldSurvey')}
        >
          <Text style={[styles.addButtonText, { color: '#C4A35A' }]}>📍 Survey</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={<Text style={styles.empty}>No customers found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.phone}>{item.phone} • {item.address || 'No address'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.orderButton} 
              onPress={() => navigation.navigate('OrderCollection', { customerId: item.id, customerName: item.name })}
            >
              <Text style={styles.orderButtonText}>Take Order</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100] },
  header: { flexDirection: 'row', padding: spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: neutral[200], gap: spacing.sm },
  searchInput: { flex: 1, backgroundColor: neutral[100], borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  addButton: { backgroundColor: brand.gold, justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md },
  addButtonText: { fontWeight: 'bold', color: brand.black },
  empty: { textAlign: 'center', marginTop: 20, color: neutral[500] },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, alignItems: 'center', ...shadows.sm },
  name: { fontSize: 16, fontWeight: 'bold', color: brand.black },
  phone: { fontSize: 13, color: neutral[600], marginTop: 4 },
  orderButton: { backgroundColor: brand.black, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  orderButtonText: { color: brand.gold, fontWeight: 'bold', fontSize: 12 }
});
