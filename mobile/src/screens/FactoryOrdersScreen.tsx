import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { fetchApi } from '../api/client';
import { colors } from '../theme/colors';

export default function FactoryOrdersScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [buyPrice, setBuyPrice] = useState('0');
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [prods, hist, bal] = await Promise.all([
        fetchApi('/products'),
        fetchApi('/factory-orders'),
        fetchApi('/factory-orders/balance')
      ]);
      setProducts(prods as any[]);
      setHistory(hist as any[]);
      setBalance((bal as any).balance);
      if ((prods as any).length > 0) {
        const firstProd = (prods as any)[0];
        setSelectedProductId(firstProd.id);
        setBuyPrice(firstProd.factoryPrice ? String(firstProd.factoryPrice) : '0');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setBuyPrice(prod.factoryPrice ? String(prod.factoryPrice) : '0');
    }
  };

  const addToCart = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    
    if (!quantity || !buyPrice) {
        Alert.alert("Error", "Please enter quantity and buy price.");
        return;
    }

    setCart([...cart, { 
      productId: product.id, 
      name: product.name,
      quantity: Number(quantity), 
      buyPrice: Number(buyPrice) 
    }]);
    
    setQuantity('1');
    setBuyPrice('0');
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleTopUp = async () => {
    if (!topUpAmount) return;
    try {
      await fetchApi('/factory-orders/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(topUpAmount) })
      });
      setTopUpAmount('');
      loadData();
      Alert.alert("Success", "Top up successful");
    } catch(e) {
      Alert.alert('Error', 'Failed to top up');
    }
  };

  const totalBudget = cart.reduce((sum, item) => sum + (item.quantity * item.buyPrice), 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await fetchApi('/factory-orders', {
        method: 'POST',
        body: JSON.stringify({ items: cart })
      });
      setCart([]);
      loadData(); // Refresh history
      Alert.alert("Success", "Factory order logged!");
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save factory order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* BALANCE CARD */}
      <View style={[styles.card, { backgroundColor: colors.accent, borderColor: colors.accent }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[styles.label, { color: colors.primary }]}>Available Ledger Balance</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>
              {Number(balance).toLocaleString()} ETB
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)' }]}
            placeholder="Top up amount"
            keyboardType="numeric"
            value={topUpAmount}
            onChangeText={setTopUpAmount}
          />
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={handleTopUp}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Top Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ADD ITEMS FORM */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Product to Order</Text>
        
        <Text style={styles.label}>Product</Text>
        <View style={styles.pickerContainer}>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productPills}>
             {products.map(p => (
                 <TouchableOpacity 
                   key={p.id} 
                   style={[styles.pill, selectedProductId === p.id && styles.pillActive]}
                   onPress={() => handleProductSelect(p.id)}
                 >
                     <Text style={[styles.pillText, selectedProductId === p.id && styles.pillTextActive]}>{p.name}</Text>
                 </TouchableOpacity>
             ))}
           </ScrollView>
        </View>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput 
              style={styles.input}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Buy Price (ETB)</Text>
            <TextInput 
              style={styles.input}
              keyboardType="numeric"
              value={buyPrice}
              onChangeText={setBuyPrice}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addToCart}>
          <Text style={styles.addButtonText}>Add to Calculation</Text>
        </TouchableOpacity>
      </View>

      {/* CART & CALCULATION */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Order Calculation</Text>
        
        {cart.length === 0 ? (
            <Text style={styles.emptyText}>No products added yet.</Text>
        ) : (
            cart.map((item, i) => (
                <View key={i} style={styles.cartItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemSub}>{item.quantity} x {item.buyPrice} ETB</Text>
                    </View>
                    <Text style={styles.cartItemTotal}>{(item.quantity * item.buyPrice).toLocaleString()} ETB</Text>
                    <TouchableOpacity onPress={() => removeFromCart(i)} style={styles.removeBtn}>
                        <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                </View>
            ))
        )}

        <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Budget Needed:</Text>
            <Text style={styles.totalValue}>{totalBudget.toLocaleString()} ETB</Text>
        </View>

        <TouchableOpacity 
           style={[styles.submitButton, cart.length === 0 && styles.submitButtonDisabled]} 
           onPress={submitOrder}
           disabled={cart.length === 0 || isSubmitting}
        >
          <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : 'Confirm Factory Order'}</Text>
        </TouchableOpacity>
      </View>

      {/* HISTORY TABLE */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Past Factory Orders</Text>
        {history.map(order => (
            <View key={order.id} style={styles.historyRow}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{new Date(order.date).toLocaleDateString()}</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{order.status}</Text>
                    </View>
                </View>
                {order.items.map((i: any) => (
                    <Text key={i.id} style={styles.historyItem}>• {i.quantity}x {i.product?.name}</Text>
                ))}
                <Text style={styles.historyTotal}>{Number(order.totalBudget).toLocaleString()} ETB</Text>
            </View>
        ))}
        {history.length === 0 && <Text style={styles.emptyText}>No past orders found.</Text>}
      </View>
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  label: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup: { flex: 1 },
  input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
  },
  pickerContainer: { marginBottom: 16 },
  productPills: { gap: 8, paddingBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 14, color: colors.textSecondary },
  pillTextActive: { color: colors.primary, fontWeight: 'bold' },
  addButton: { borderWidth: 2, borderColor: colors.primary, borderRadius: 8, padding: 12, alignItems: 'center' },
  addButtonText: { color: colors.primary, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, fontStyle: 'italic', marginVertical: 16 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  cartItemName: { fontWeight: 'bold', color: colors.text },
  cartItemSub: { fontSize: 12, color: colors.textSecondary },
  cartItemTotal: { fontWeight: 'bold', color: colors.primary, fontSize: 16, marginRight: 12 },
  removeBtn: { padding: 4 },
  removeBtnText: { color: 'red', fontWeight: 'bold', fontSize: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginBottom: 16 },
  totalLabel: { fontWeight: 'bold', fontSize: 16, color: colors.text },
  totalValue: { fontWeight: 'bold', fontSize: 20, color: colors.primary },
  submitButton: { backgroundColor: colors.accent, borderRadius: 8, padding: 14, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  historyRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyDate: { fontWeight: 'bold', color: colors.text },
  statusBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { color: '#0369a1', fontSize: 10, fontWeight: 'bold' },
  historyItem: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  historyTotal: { textAlign: 'right', fontWeight: 'bold', fontSize: 16, color: colors.primary, marginTop: 4 }
});
