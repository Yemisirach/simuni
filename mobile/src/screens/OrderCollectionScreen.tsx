import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { api, isNetworkError } from '../api/client';
import { queueOrder } from '../offline/queue';
import { brand, neutral, spacing, radius, fontFamily, colors, shadows } from '../theme';

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculator state
  const [targetAmount, setTargetAmount] = useState('');
  const [excludedProducts, setExcludedProducts] = useState<Set<string>>(new Set());

  // Custom product flow state
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    api.products()
      .then(setProducts)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const calculateAssortment = () => {
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) return Alert.alert('Enter a valid target amount (ETB)');

    const available = products.filter(p => !excludedProducts.has(p.id));
    if (available.length === 0) return Alert.alert('No products available for calculation');

    // Shuffle products to get a random variety
    const shuffled = [...available].sort(() => 0.5 - Math.random());

    let remaining = target;
    const newQuantities: Record<string, number> = {};

    // Try to fit random quantities (up to 3 to ensure variety)
    for (const p of shuffled) {
      const price = Number(p.price);
      if (price > 0 && price <= remaining) {
        const maxPossible = Math.floor(remaining / price);
        const qty = Math.min(maxPossible, Math.floor(Math.random() * 3) + 1);
        if (qty > 0) {
          newQuantities[p.id] = qty;
          remaining -= (qty * price);
        }
      }
    }

    // Fill remaining budget with cheapest products
    const sortedByPrice = [...available].sort((a, b) => Number(a.price) - Number(b.price));
    while (remaining >= Number(sortedByPrice[0].price)) {
      for (const p of sortedByPrice) {
        const price = Number(p.price);
        if (price <= remaining) {
          newQuantities[p.id] = (newQuantities[p.id] || 0) + 1;
          remaining -= price;
          break;
        }
      }
    }
    
    setQuantities(newQuantities);
    if (remaining > 0) {
      Alert.alert('Calculation Complete', `Assortment calculated. Remaining change: ${remaining.toFixed(2)} ETB`);
    } else {
      Alert.alert('Calculation Complete', `Assortment calculated successfully!`);
    }
  };

  const toggleExclude = (productId: string) => {
    setExcludedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    // Optional: if it was excluded, zero out its quantity
    if (!excludedProducts.has(productId)) {
      setQuantities(prev => ({ ...prev, [productId]: 0 }));
    }
  };

  const changeQty = (productId: string, delta: number) => {
    setQuantities((q) => {
      const next = Math.max(0, (q[productId] || 0) + delta);
      return { ...q, [productId]: next };
    });
  };

  const setQtyFromText = (productId: string, text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setQuantities((q) => ({ 
      ...q, 
      [productId]: digitsOnly === '' ? ('' as unknown as number) : parseInt(digitsOnly, 10) 
    }));
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

      <View style={styles.calculatorBox}>
        <Text style={styles.calcLabel}>🎯 Smart Assortment Calculator</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={styles.calcInput}
            placeholder="Target ETB (e.g. 2000)"
            keyboardType="decimal-pad"
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholderTextColor={neutral[400]}
          />
          <TouchableOpacity style={styles.calcButton} onPress={calculateAssortment}>
            <Text style={styles.calcButtonText}>Auto-Fill</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.calcSubtext}>Agent: Tap 🚫 to exclude out-of-stock items.</Text>
      </View>

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
                    <Text style={styles.smallButtonPrimaryText}>{savingCustom ? 'Adding...' : 'Add to Order'}</Text>
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
        renderItem={({ item }) => {
          const isExcluded = excludedProducts.has(item.id);
          return (
            <View style={[styles.productRow, isExcluded && styles.productRowExcluded]}>
              <TouchableOpacity style={styles.excludeButton} onPress={() => toggleExclude(item.id)}>
                <Text style={styles.excludeButtonText}>{isExcluded ? '✅' : '🚫'}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 8, opacity: isExcluded ? 0.5 : 1 }}>
                <Text style={[styles.productName, isExcluded && { textDecorationLine: 'line-through' }]}>{item.name}</Text>
                <Text style={styles.productPrice}>ETB {Number(item.price).toFixed(2)} / {item.unit}</Text>
              </View>
              {!isExcluded && (
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepperButton} onPress={() => changeQty(item.id, -1)}>
                    <Text style={styles.stepperButtonText}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.stepperInput}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={neutral[400]}
                    value={!quantities[item.id] ? '' : String(quantities[item.id])}
                    onChangeText={(text) => setQtyFromText(item.id, text)}
                  />
                  <TouchableOpacity style={styles.stepperButton} onPress={() => changeQty(item.id, 1)}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
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
  calculatorBox: { backgroundColor: '#FFFFFF', padding: spacing.md, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: brand.gold, ...shadows.sm },
  calcLabel: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: '700', color: brand.black, marginBottom: spacing.sm },
  calcInput: { flex: 1, borderWidth: 1, borderColor: neutral[200], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: neutral[100] },
  calcButton: { backgroundColor: brand.gold, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  calcButtonText: { fontWeight: '700', color: brand.black },
  calcSubtext: { fontSize: 11, color: neutral[500], marginTop: spacing.xs, fontStyle: 'italic' },
  excludeButton: { padding: 4 },
  excludeButtonText: { fontSize: 18 },
  productRowExcluded: { backgroundColor: neutral[100], borderColor: neutral[200], borderWidth: 1 },
});
