import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api, isNetworkError } from '../api/client';
import { queueOrder } from '../offline/queue';
import { brand, neutral, spacing, radius, fontFamily, colors } from '../theme';

interface Product {
  id: string;
  name: string;
  unit: string;
  price: string | number;
}

export default function OrderCollectionScreen({ route, navigation }: any) {
  const { customerId, customerName, routeId } = route.params;
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    api.products().then(setProducts);
  }, []);

  const changeQty = (productId: string, delta: number) => {
    setQuantities((q) => {
      const next = Math.max(0, (q[productId] || 0) + delta);
      return { ...q, [productId]: next };
    });
  };

  const setQtyFromText = (productId: string, text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setQuantities((q) => ({ ...q, [productId]: digitsOnly === '' ? 0 : parseInt(digitsOnly, 10) }));
  };

  const total = products.reduce((sum, p) => sum + Number(p.price) * (quantities[p.id] || 0), 0);
  const hasItems = Object.values(quantities).some((q) => q > 0);

  const confirmCustomProduct = async () => {
    const name = customName.trim();
    const price = Number(customPrice);
    const qty = Math.max(1, parseInt(customQty, 10) || 1);

    if (!name) {
      Alert.alert('Missing name', 'Enter a product name.');
      return;
    }
    if (!(price >= 0)) {
      Alert.alert('Invalid price', 'Enter a valid unit price.');
      return;
    }

    setSavingCustom(true);
    try {
      const product = await api.createProduct(name, 'pcs', price);
      setProducts((p) => [...p, product]);
      setQuantities((q) => ({ ...q, [product.id]: qty }));
      setAddingCustom(false);
      setCustomName('');
      setCustomPrice('');
      setCustomQty('1');
    } catch (e: any) {
      Alert.alert('Could not add product', e.message || 'Check your connection and try again.');
    } finally {
      setSavingCustom(false);
    }
  };

  const submit = async () => {
    const items = products
      .filter((p) => (quantities[p.id] || 0) > 0)
      .map((p) => ({ productId: p.id, quantity: quantities[p.id] }));

    if (items.length === 0) {
      Alert.alert('No items', 'Add at least one product to the order.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await api.createOrder(customerId, items, routeId);
      navigation.navigate('DeliveryConfirm', { orderId: order.id, customerName });
    } catch (e: any) {
      if (isNetworkError(e)) {
        await queueOrder({ customerId, items, routeId });
        Alert.alert(
          'Order saved offline',
          'No connection right now — this order will be submitted automatically once you\'re back online.',
        );
        navigation.goBack();
      } else {
        Alert.alert('Could not submit order', e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.customerLabel}>Order for</Text>
      <Text style={styles.customerName}>{customerName}</Text>

      <FlatList
        style={{ flex: 1 }}
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md }}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          <View>
            {addingCustom ? (
              <View style={styles.customCard}>
                <Text style={styles.customCardTitle}>Add a custom product</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="Product name (e.g. Habesha Beer 330ml)"
                  value={customName}
                  onChangeText={setCustomName}
                  placeholderTextColor={neutral[400]}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TextInput
                    style={[styles.customInput, { flex: 1 }]}
                    placeholder="Unit price"
                    keyboardType="decimal-pad"
                    value={customPrice}
                    onChangeText={setCustomPrice}
                    placeholderTextColor={neutral[400]}
                  />
                  <TextInput
                    style={[styles.customInput, { width: 80 }]}
                    placeholder="Qty"
                    keyboardType="number-pad"
                    value={customQty}
                    onChangeText={setCustomQty}
                    placeholderTextColor={neutral[400]}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <TouchableOpacity
                    style={[styles.smallButton, styles.smallButtonPrimary]}
                    onPress={confirmCustomProduct}
                    disabled={savingCustom}
                  >
                    <Text style={styles.smallButtonPrimaryText}>{savingCustom ? 'Adding…' : 'Add to Order'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallButton} onPress={() => setAddingCustom(false)}>
                    <Text style={styles.smallButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setAddingCustom(true)} style={styles.addCustomLink}>
                <Text style={styles.addCustomLinkText}>+ Add a custom product not in the catalog</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.productRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>ETB {Number(item.price).toFixed(2)} / {item.unit}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperButton} onPress={() => changeQty(item.id, -1)}>
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.stepperInput}
                keyboardType="number-pad"
                value={String(quantities[item.id] || 0)}
                onChangeText={(text) => setQtyFromText(item.id, text)}
                selectTextOnFocus
              />
              <TouchableOpacity style={styles.stepperButton} onPress={() => changeQty(item.id, 1)}>
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>ETB {total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, !hasItems && styles.primaryButtonDisabled]}
          onPress={submit}
          disabled={!hasItems || submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Submitting…' : 'Submit Order'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100] },
  customerLabel: { fontFamily: fontFamily.sans, fontSize: 12, color: neutral[600], textAlign: 'center', marginTop: spacing.md },
  customerName: { fontFamily: fontFamily.serif, fontSize: 22, fontWeight: '700', color: brand.black, textAlign: 'center' },
  productRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  productName: { fontFamily: fontFamily.sans, fontSize: 16, fontWeight: '600', color: brand.black },
  productPrice: { fontFamily: fontFamily.sans, fontSize: 13, color: neutral[600], marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: brand.gold, alignItems: 'center', justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 20, fontWeight: '700', color: brand.black },
  stepperInput: {
    width: 48, textAlign: 'center', fontSize: 18, fontWeight: '700', color: brand.black, fontFamily: fontFamily.mono,
    marginHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: neutral[200], borderRadius: 8,
  },
  addCustomLink: { paddingVertical: spacing.md, alignItems: 'center' },
  addCustomLinkText: { color: brand.black, fontWeight: '700', fontSize: 14 },
  customCard: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderStyle: 'dashed', borderColor: brand.gold,
    borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm,
  },
  customCardTitle: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: '700', color: brand.black, marginBottom: spacing.sm },
  customInput: {
    borderWidth: 1, borderColor: neutral[200], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 14, color: brand.black, marginBottom: spacing.sm, backgroundColor: '#FFFFFF',
  },
  smallButton: {
    flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: neutral[200], backgroundColor: '#FFFFFF',
  },
  smallButtonText: { color: brand.black, fontWeight: '600', fontSize: 13 },
  smallButtonPrimary: { backgroundColor: brand.gold, borderColor: brand.gold },
  smallButtonPrimaryText: { color: brand.black, fontWeight: '700', fontSize: 13 },
  footer: { padding: spacing.md, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: -2 } },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  totalLabel: { fontFamily: fontFamily.sans, fontSize: 16, color: neutral[600], fontWeight: '600' },
  totalValue: { fontFamily: fontFamily.mono, fontSize: 22, fontWeight: '800', color: brand.black },
  primaryButton: { backgroundColor: brand.gold, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: brand.black, fontWeight: '700', fontSize: 16 },
});
