import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { rawRequest } from '../api/client';
import { brand, neutral, semantic, spacing, radius, fontFamily, shadows } from '../theme';

// Official Factory Pricing Matrix from Company Specification
interface PriceInfo {
  size: string;
  name: string;
  addis: { prev: number; new: number; margin: number; retail: number };
  regional: { prev: number; new: number };
}

const FACTORY_PRICING_CATALOG: PriceInfo[] = [
  {
    size: '0.35L',
    name: 'Topwater 0.35L',
    addis: { prev: 172, new: 220, margin: 30, retail: 250 },
    regional: { prev: 165.5, new: 215.5 },
  },
  {
    size: '0.60L',
    name: 'Topwater 0.60L',
    addis: { prev: 220, new: 270, margin: 30, retail: 300 },
    regional: { prev: 201.5, new: 251.5 },
  },
  {
    size: '1.00L',
    name: 'Topwater 1.00L',
    addis: { prev: 174, new: 220, margin: 30, retail: 250 },
    regional: { prev: 161.5, new: 211.5 },
  },
  {
    size: '2.00L',
    name: 'Topwater 2.00L',
    addis: { prev: 220, new: 270, margin: 30, retail: 300 },
    regional: { prev: 203.5, new: 253.5 },
  },
];

function matchProductPricing(prodNameOrSku: string): PriceInfo | undefined {
  const s = (prodNameOrSku || '').toLowerCase();
  if (s.includes('0.35')) return FACTORY_PRICING_CATALOG[0];
  if (s.includes('0.6')) return FACTORY_PRICING_CATALOG[1];
  if (s.includes('1') && !s.includes('0.35') && !s.includes('0.6')) return FACTORY_PRICING_CATALOG[2];
  if (s.includes('2')) return FACTORY_PRICING_CATALOG[3];
  return undefined;
}

export default function FactoryOrdersScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Market & Pricing Tier Selection
  const [market, setMarket] = useState<'addis' | 'regional'>('addis');
  const [priceTier, setPriceTier] = useState<'new' | 'previous'>('new');
  const [showPriceReference, setShowPriceReference] = useState(true);

  // Form State
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [buyPrice, setBuyPrice] = useState('220');
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
        rawRequest('/products').catch(() => []),
        rawRequest('/factory-orders').catch(() => []),
        rawRequest('/factory-orders/balance').catch(() => ({ balance: 0 })),
      ]);

      const loadedProds = (prods as any[]) || [];
      setProducts(loadedProds);
      setHistory((hist as any[]) || []);
      setBalance(Number((bal as any)?.balance || 0));

      if (loadedProds.length > 0) {
        const firstProd = loadedProds[0];
        setSelectedProductId(firstProd.id);
        const pricing = matchProductPricing(firstProd.name || firstProd.sku);
        if (pricing) {
          const defaultPrice = pricing.addis.new;
          setBuyPrice(String(defaultPrice));
        } else if (firstProd.factoryPrice) {
          setBuyPrice(String(firstProd.factoryPrice));
        }
      }
    } catch (e) {
      console.error('Failed to load factory data', e);
    } finally {
      setLoading(false);
    }
  }

  const handleProductSelect = (id: string, customPrice?: number) => {
    setSelectedProductId(id);
    const prod = products.find((p) => p.id === id);
    if (!prod) return;

    if (customPrice !== undefined) {
      setBuyPrice(String(customPrice));
      return;
    }

    const pricing = matchProductPricing(prod.name || prod.sku);
    if (pricing) {
      if (market === 'addis') {
        const p = priceTier === 'new' ? pricing.addis.new : pricing.addis.prev;
        setBuyPrice(String(p));
      } else {
        const p = priceTier === 'new' ? pricing.regional.new : pricing.regional.prev;
        setBuyPrice(String(p));
      }
    } else if (prod.factoryPrice) {
      setBuyPrice(String(prod.factoryPrice));
    }
  };

  const handleMarketChange = (newMarket: 'addis' | 'regional') => {
    setMarket(newMarket);
    const prod = products.find((p) => p.id === selectedProductId);
    if (prod) {
      const pricing = matchProductPricing(prod.name || prod.sku);
      if (pricing) {
        const p = newMarket === 'addis'
          ? (priceTier === 'new' ? pricing.addis.new : pricing.addis.prev)
          : (priceTier === 'new' ? pricing.regional.new : pricing.regional.prev);
        setBuyPrice(String(p));
      }
    }
  };

  const handlePriceTierChange = (newTier: 'new' | 'previous') => {
    setPriceTier(newTier);
    const prod = products.find((p) => p.id === selectedProductId);
    if (prod) {
      const pricing = matchProductPricing(prod.name || prod.sku);
      if (pricing) {
        const p = market === 'addis'
          ? (newTier === 'new' ? pricing.addis.new : pricing.addis.prev)
          : (newTier === 'new' ? pricing.regional.new : pricing.regional.prev);
        setBuyPrice(String(p));
      }
    }
  };

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) {
      Alert.alert('Error', 'Please select a product.');
      return;
    }

    const qty = Number(quantity);
    const price = Number(buyPrice);

    if (!qty || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid buy price.');
      return;
    }

    const pricing = matchProductPricing(product.name || product.sku);
    const retailPrice = market === 'addis' && pricing ? pricing.addis.retail : Number(product.price || 0);

    setCart([
      ...cart,
      {
        productId: product.id,
        name: product.name,
        quantity: qty,
        buyPrice: price,
        market: market === 'addis' ? 'Addis Ababa' : 'Regional',
        priceTier: priceTier === 'new' ? 'New Price' : 'Previous Price',
        retailPrice,
      },
    ]);

    setQuantity('10');
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleTopUp = async () => {
    if (!topUpAmount || Number(topUpAmount) <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive amount to top up.');
      return;
    }
    try {
      await rawRequest('/factory-orders/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(topUpAmount) }),
      });
      setTopUpAmount('');
      loadData();
      Alert.alert('Success', `Successfully topped up ${Number(topUpAmount).toLocaleString()} ETB`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to top up ledger balance.');
    }
  };

  const totalBudget = cart.reduce((sum, item) => sum + item.quantity * item.buyPrice, 0);
  const totalRetail = cart.reduce((sum, item) => sum + item.quantity * (item.retailPrice || item.buyPrice), 0);
  const projectedProfit = totalRetail - totalBudget;

  const submitOrder = async () => {
    if (cart.length === 0) return;
    if (balance < totalBudget) {
      Alert.alert(
        'Insufficient Balance',
        `Required budget is ${totalBudget.toLocaleString()} ETB, but your current balance is ${balance.toLocaleString()} ETB. Please top up first.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await rawRequest('/factory-orders', {
        method: 'POST',
        body: JSON.stringify({ items: cart, date: orderDate }),
      });
      setCart([]);
      loadData();
      Alert.alert('Order Confirmed', 'Factory purchase order has been logged and balance updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit factory order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedPricing = selectedProduct ? matchProductPricing(selectedProduct.name || selectedProduct.sku) : undefined;

  if (loading && products.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={brand.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. FACTORY LEDGER BALANCE CARD */}
      <View style={styles.balanceCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.balanceLabel}>AVAILABLE LEDGER BALANCE</Text>
            <Text style={styles.balanceAmount}>{Number(balance).toLocaleString()} ETB</Text>
          </View>
          <View style={[styles.balancePill, { backgroundColor: balance >= totalBudget ? '#E4F6E9' : '#FFF3DC' }]}>
            <Text style={{ color: balance >= totalBudget ? semantic.success : semantic.warningDark, fontWeight: '800', fontSize: 11 }}>
              {balance >= totalBudget ? '✓ SUFFICIENT' : '⚠️ TOP UP NEEDED'}
            </Text>
          </View>
        </View>

        <View style={styles.topUpRow}>
          <TextInput
            style={styles.topUpInput}
            placeholder="Top up amount (ETB)"
            keyboardType="numeric"
            value={topUpAmount}
            onChangeText={setTopUpAmount}
            placeholderTextColor={neutral[400]}
          />
          <TouchableOpacity style={styles.topUpButton} onPress={handleTopUp}>
            <Text style={styles.topUpButtonText}>+ Top Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. OFFICIAL FACTORY PRICING REFERENCE CARD */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <View>
            <Text style={styles.cardTitle}>Official Factory Pricing Matrix</Text>
            <Text style={styles.cardSubtitle}>Verified factory get price vs retail sales price</Text>
          </View>
          <TouchableOpacity onPress={() => setShowPriceReference(!showPriceReference)}>
            <Text style={styles.toggleReferenceText}>{showPriceReference ? 'Hide ▲' : 'Show ▼'}</Text>
          </TouchableOpacity>
        </View>

        {showPriceReference && (
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Product</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.4, textAlign: 'right' }]}>Prev Factory</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.4, textAlign: 'right', color: brand.gold }]}>New Factory</Text>
              {market === 'addis' && <Text style={[styles.tableHeaderCell, { flex: 1.1, textAlign: 'right', color: semantic.success }]}>Margin</Text>}
              {market === 'addis' && <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Retail</Text>}
            </View>

            {/* Table Rows */}
            {FACTORY_PRICING_CATALOG.map((item, idx) => {
              const isSelected = selectedPricing?.size === item.size;
              const prevPrice = market === 'addis' ? item.addis.prev : item.regional.prev;
              const newPrice = market === 'addis' ? item.addis.new : item.regional.new;

              return (
                <View key={item.size} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt, isSelected && styles.tableRowSelected]}>
                  <Text style={[styles.tableCell, { flex: 1.2, fontWeight: '700' }]}>{item.size}</Text>
                  <Text style={[styles.tableCell, { flex: 1.4, textAlign: 'right', color: neutral[600], textDecorationLine: 'line-through' }]}>
                    {prevPrice} ETB
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.4, textAlign: 'right', fontWeight: '800', color: brand.black }]}>
                    {newPrice} ETB
                  </Text>
                  {market === 'addis' && (
                    <Text style={[styles.tableCell, { flex: 1.1, textAlign: 'right', fontWeight: '700', color: semantic.success }]}>
                      +{item.addis.margin}
                    </Text>
                  )}
                  {market === 'addis' && (
                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: '700', color: brand.black }]}>
                      {item.addis.retail} ETB
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 3. ADD PRODUCT TO FACTORY ORDER FORM */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Product to Factory Order</Text>

        {/* Market Tier Selection */}
        <Text style={styles.fieldLabel}>SELECT MARKET CORRIDOR</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentButton, market === 'addis' && styles.segmentButtonActive]}
            onPress={() => handleMarketChange('addis')}
          >
            <Text style={[styles.segmentButtonText, market === 'addis' && styles.segmentButtonTextActive]}>
              📍 Addis Ababa Market
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, market === 'regional' && styles.segmentButtonActive]}
            onPress={() => handleMarketChange('regional')}
          >
            <Text style={[styles.segmentButtonText, market === 'regional' && styles.segmentButtonTextActive]}>
              🌍 Regional Market
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pricing Tier Selection */}
        <Text style={styles.fieldLabel}>PRICING TIER</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentButton, priceTier === 'new' && styles.segmentButtonActive]}
            onPress={() => handlePriceTierChange('new')}
          >
            <Text style={[styles.segmentButtonText, priceTier === 'new' && styles.segmentButtonTextActive]}>
              🆕 New Factory Get Price
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, priceTier === 'previous' && styles.segmentButtonActive]}
            onPress={() => handlePriceTierChange('previous')}
          >
            <Text style={[styles.segmentButtonText, priceTier === 'previous' && styles.segmentButtonTextActive]}>
              ⏮️ Previous Factory Price
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product Selection */}
        <Text style={styles.fieldLabel}>SELECT BOTTLED WATER SIZE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productPillsContainer}>
          {products.map((p) => {
            const isSelected = selectedProductId === p.id;
            const pricing = matchProductPricing(p.name || p.sku);
            const prevP = pricing ? (market === 'addis' ? pricing.addis.prev : pricing.regional.prev) : 0;
            const newP = pricing ? (market === 'addis' ? pricing.addis.new : pricing.regional.new) : p.factoryPrice;

            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.productPillCard, isSelected && styles.productPillCardSelected]}
                onPress={() => handleProductSelect(p.id)}
              >
                <Text style={[styles.productPillTitle, isSelected && styles.productPillTitleSelected]}>
                  {pricing?.size || p.name}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Text style={styles.productPillPrev}>Prev: {prevP}</Text>
                  <Text style={[styles.productPillNew, isSelected && { color: brand.black, fontWeight: '800' }]}>
                    New: {newP}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Product Details & Quick Price Chips */}
        {selectedPricing && (
          <View style={styles.pricingBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pricingBannerTitle}>
                {selectedProduct?.name} ({market === 'addis' ? 'Addis Ababa' : 'Regional'})
              </Text>
              <Text style={styles.pricingBannerSub}>
                {market === 'addis' ? `Profit: +${selectedPricing.addis.margin} ETB/unit · Retail: ${selectedPricing.addis.retail} ETB` : 'Regional supply pricing'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.quickChip, buyPrice === String(market === 'addis' ? selectedPricing.addis.prev : selectedPricing.regional.prev) && styles.quickChipActive]}
                onPress={() => setBuyPrice(String(market === 'addis' ? selectedPricing.addis.prev : selectedPricing.regional.prev))}
              >
                <Text style={styles.quickChipText}>
                  Prev: {market === 'addis' ? selectedPricing.addis.prev : selectedPricing.regional.prev} ETB
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickChip, buyPrice === String(market === 'addis' ? selectedPricing.addis.new : selectedPricing.regional.new) && styles.quickChipActive]}
                onPress={() => setBuyPrice(String(market === 'addis' ? selectedPricing.addis.new : selectedPricing.regional.new))}
              >
                <Text style={[styles.quickChipText, { fontWeight: '800' }]}>
                  New: {market === 'addis' ? selectedPricing.addis.new : selectedPricing.regional.new} ETB
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Inputs: Quantity & Buy Price */}
        <View style={styles.inputRow}>
          <View style={[styles.inputCol, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>QUANTITY (PACKS)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
            {/* Quick Quantity Buttons */}
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
              {[10, 50, 100, 200].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.qtyBadge}
                  onPress={() => setQuantity(String(q))}
                >
                  <Text style={styles.qtyBadgeText}>+{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputCol, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>BUY PRICE (ETB / UNIT)</Text>
            <TextInput
              style={[styles.textInput, { fontFamily: fontFamily.mono, fontWeight: '700' }]}
              keyboardType="numeric"
              value={buyPrice}
              onChangeText={setBuyPrice}
            />
            <Text style={styles.lineSubtotalText}>
              Subtotal: {(Number(quantity || 0) * Number(buyPrice || 0)).toLocaleString()} ETB
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addToCartButton} onPress={addToCart}>
          <Text style={styles.addToCartButtonText}>+ Add to Factory Calculation</Text>
        </TouchableOpacity>
      </View>

      {/* 4. CURRENT ORDER CALCULATION & CART */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Order Calculation</Text>

        {/* Purchase Date for past backfill or today */}
        <View style={{ marginBottom: spacing.md, padding: spacing.sm, backgroundColor: neutral[100], borderRadius: radius.md, borderWidth: 1, borderColor: neutral[200] }}>
          <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
            📅 FACTORY PURCHASE DATE ({orderDate === new Date().toISOString().slice(0, 10) ? 'TODAY' : 'PAST BACKFILL'})
          </Text>
          <TextInput
            style={[styles.textInput, { fontFamily: fontFamily.mono, fontWeight: '700', backgroundColor: '#FFFFFF' }]}
            value={orderDate}
            onChangeText={setOrderDate}
            placeholder="YYYY-MM-DD"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {['2026-10-01', '2026-09-30', '2026-09-29', '2026-09-28', '2026-09-27'].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setOrderDate(d)}
                style={[
                  styles.qtyBadge,
                  orderDate === d ? { backgroundColor: brand.black, borderColor: brand.black } : {},
                ]}
              >
                <Text
                  style={[
                    styles.qtyBadgeText,
                    orderDate === d ? { color: '#FFFFFF', fontWeight: '800' } : {},
                  ]}
                >
                  {d === new Date().toISOString().slice(0, 10) ? 'Today' : d.slice(5)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {cart.length === 0 ? (
          <Text style={styles.emptyText}>No products added yet. Select a product above to calculate.</Text>
        ) : (
          cart.map((item, i) => (
            <View key={i} style={styles.cartRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemTitle}>{item.name}</Text>
                <Text style={styles.cartItemDetails}>
                  {item.quantity} packs × {item.buyPrice} ETB ({item.priceTier} · {item.market})
                </Text>
              </View>
              <Text style={styles.cartItemTotal}>{(item.quantity * item.buyPrice).toLocaleString()} ETB</Text>
              <TouchableOpacity onPress={() => removeFromCart(i)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {cart.length > 0 && (
          <View style={styles.calculationSummaryBox}>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Total Budget Needed:</Text>
              <Text style={styles.summaryValue}>{totalBudget.toLocaleString()} ETB</Text>
            </View>
            {projectedProfit > 0 && (
              <View style={styles.summaryLine}>
                <Text style={[styles.summaryLabel, { color: semantic.success }]}>Projected Net Profit:</Text>
                <Text style={[styles.summaryValue, { color: semantic.success }]}>+{projectedProfit.toLocaleString()} ETB</Text>
              </View>
            )}
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Ledger Balance Remaining:</Text>
              <Text style={[styles.summaryValue, { color: balance >= totalBudget ? brand.black : semantic.danger }]}>
                {(balance - totalBudget).toLocaleString()} ETB
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, (cart.length === 0 || isSubmitting) && styles.submitButtonDisabled]}
          onPress={submitOrder}
          disabled={cart.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={brand.black} />
          ) : (
            <Text style={styles.submitButtonText}>
              {balance >= totalBudget ? 'Confirm Factory Order' : 'Insufficient Balance — Top Up First'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 5. PAST FACTORY ORDERS HISTORY */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Past Factory Purchases</Text>
        {history.map((order) => (
          <View key={order.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>{new Date(order.date).toLocaleDateString()}</Text>
              <View style={styles.historyStatusBadge}>
                <Text style={styles.historyStatusText}>{order.status}</Text>
              </View>
            </View>
            {order.items?.map((item: any) => (
              <Text key={item.id} style={styles.historyItemLine}>
                • {item.quantity}× {item.product?.name} @ {item.buyPrice} ETB
              </Text>
            ))}
            <Text style={styles.historyTotalAmount}>{Number(order.totalBudget).toLocaleString()} ETB</Text>
          </View>
        ))}
        {history.length === 0 && <Text style={styles.emptyText}>No past factory purchases found.</Text>}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100], padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Balance Card
  balanceCard: {
    backgroundColor: '#FAF8F2',
    borderWidth: 2,
    borderColor: brand.gold,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  balanceLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontFamily: fontFamily.mono,
    fontSize: 32,
    fontWeight: '800',
    color: brand.black,
    letterSpacing: -1.0,
    marginTop: 2,
  },
  balancePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  topUpRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  topUpInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: brand.black,
    fontFamily: fontFamily.mono,
  },
  topUpButton: {
    backgroundColor: brand.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topUpButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    color: brand.black,
  },

  // Base Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  cardTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: '700',
    color: brand.black,
    letterSpacing: -0.16,
  },
  cardSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[500],
    marginTop: 2,
  },
  toggleReferenceText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: brand.gold,
  },

  // Reference Table
  tableContainer: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: neutral[100],
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
  },
  tableHeaderCell: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '800',
    color: neutral[700],
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: neutral[150],
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: neutral[50],
  },
  tableRowSelected: {
    backgroundColor: '#FDFBF4',
    borderLeftWidth: 3,
    borderLeftColor: brand.gold,
  },
  tableCell: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    color: brand.black,
  },

  // Form Controls
  fieldLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '800',
    color: neutral[600],
    marginTop: spacing.sm,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: neutral[100],
    borderRadius: radius.sm,
    padding: 3,
    marginBottom: spacing.xs,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  segmentButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: neutral[500],
  },
  segmentButtonTextActive: {
    color: brand.black,
    fontWeight: '700',
  },

  // Product Pills
  productPillsContainer: {
    gap: spacing.sm,
    paddingBottom: 4,
  },
  productPillCard: {
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  productPillCardSelected: {
    borderColor: brand.gold,
    backgroundColor: '#FDFBF4',
    borderWidth: 2,
  },
  productPillTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '700',
    color: brand.black,
    letterSpacing: -0.1,
  },
  productPillTitleSelected: {
    color: '#9E7412',
  },
  productPillPrev: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: neutral[500],
    textDecorationLine: 'line-through',
  },
  productPillNew: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: brand.black,
    fontWeight: '700',
  },

  // Pricing Banner
  pricingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F2',
    borderWidth: 1,
    borderColor: brand.gold,
    borderRadius: radius.sm,
    padding: 10,
    marginTop: spacing.sm,
  },
  pricingBannerTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    color: brand.black,
  },
  pricingBannerSub: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
    marginTop: 2,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: neutral[300],
    borderRadius: radius.sm,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  quickChipActive: {
    borderColor: brand.gold,
    backgroundColor: brand.gold,
  },
  quickChipText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: brand.black,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  inputCol: {},
  textInput: {
    backgroundColor: neutral[50],
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: brand.black,
  },
  qtyBadge: {
    backgroundColor: neutral[200],
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  qtyBadgeText: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: '700',
    color: brand.black,
  },
  lineSubtotalText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: neutral[600],
    marginTop: 4,
  },
  addToCartButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addToCartButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '700',
    color: brand.black,
  },

  // Cart
  emptyText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: neutral[400],
    textAlign: 'center',
    marginVertical: spacing.md,
    fontStyle: 'italic',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neutral[50],
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: neutral[200],
  },
  cartItemTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '700',
    color: brand.black,
    letterSpacing: -0.1,
  },
  cartItemDetails: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: neutral[600],
    marginTop: 2,
  },
  cartItemTotal: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    fontWeight: '800',
    color: brand.black,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    color: semantic.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  calculationSummaryBox: {
    backgroundColor: '#FAF8F2',
    borderTopWidth: 1,
    borderTopColor: neutral[200],
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    gap: 6,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '600',
    color: neutral[700],
  },
  summaryValue: {
    fontFamily: fontFamily.mono,
    fontSize: 15,
    fontWeight: '800',
    color: brand.black,
  },
  submitButton: {
    backgroundColor: brand.gold,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '700',
    color: brand.black,
  },

  // History
  historyCard: {
    borderBottomWidth: 1,
    borderBottomColor: neutral[150],
    paddingVertical: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyDate: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    color: brand.black,
  },
  historyStatusBadge: {
    backgroundColor: '#E4F6E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: semantic.successDark,
  },
  historyItemLine: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: neutral[600],
    marginTop: 1,
  },
  historyTotalAmount: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    fontWeight: '800',
    color: brand.black,
    textAlign: 'right',
    marginTop: 4,
  },
});
