import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, AppState, Alert } from 'react-native';
import { api } from '../api/client';
import { brand, neutral, spacing, radius, fontFamily, badges, partners } from '../theme';
import StatusBadge from '../components/StatusBadge';

export default function InvoiceScreen({ route, navigation }: any) {
  const { orderId, customerName } = route.params;
  const [invoice, setInvoice] = useState<any>(null);
  const [payingViaTelebirr, setPayingViaTelebirr] = useState(false);
  const awaitingReturnRef = useRef(false);

  const loadInvoice = () => api.invoice(orderId).then(setInvoice);

  useEffect(() => {
    loadInvoice();
  }, [orderId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && awaitingReturnRef.current) {
        awaitingReturnRef.current = false;
        loadInvoice();
      }
    });
    return () => sub.remove();
  }, [orderId]);

  const payWithTelebirr = async () => {
    setPayingViaTelebirr(true);
    try {
      const { checkoutUrl } = await api.payWithTelebirr(orderId);
      awaitingReturnRef.current = true;
      await Linking.openURL(checkoutUrl);
    } catch (e: any) {
      Alert.alert('Could not start telebirr checkout', e.message || 'Try again in a moment.');
    } finally {
      setPayingViaTelebirr(false);
    }
  };

  const payWithCash = async () => {
    try {
      await api.markInvoicePaid(invoice.id);
      Alert.alert('Success', 'Loan has been cleared (Paid with Cash)!');
      loadInvoice();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not clear loan.');
    }
  };

  if (!invoice) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={brand.black} />
      </View>
    );
  }

  const isPaid = invoice.paymentStatus === 'PAID';
  const badgeVariant = isPaid ? 'green' : 'amber';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>Invoice</Text>
          <Text style={styles.shareIcon}>📤</Text>
        </View>
        <Text style={styles.customer}>{customerName}</Text>
        <Text style={styles.date}>{new Date(invoice.createdAt).toLocaleDateString()}</Text>

        <View style={styles.divider} />

        {invoice.order?.items?.map((item: any) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.product.name} × {item.quantity}</Text>
            <Text style={styles.itemPrice}>ETB {(Number(item.price) * item.quantity).toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>ETB {Number(invoice.total).toFixed(2)}</Text>
        </View>

        <TouchableOpacity onPress={loadInvoice} style={styles.statusBadgeContainer}>
          <StatusBadge variant={badgeVariant} label={`${invoice.paymentStatus} · tap to refresh`} />
        </TouchableOpacity>
      </View>

      {!isPaid && (
        <View>
          <TouchableOpacity style={styles.telebirrButton} onPress={payWithTelebirr} disabled={payingViaTelebirr}>
            <Text style={styles.telebirrButtonText}>
              {payingViaTelebirr ? 'Opening telebirr…' : '📱 Pay with telebirr'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cashButton} onPress={payWithCash}>
            <Text style={styles.cashButtonText}>💵 Collect Cash / Clean Loan</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.doneButton} onPress={() => navigation.popToTop()}>
        <Text style={styles.doneButtonText}>Done — Back to Routes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100], padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: radius.sm, padding: spacing.lg, borderWidth: 1, borderColor: neutral[200] },
  cardHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  title: { fontFamily: fontFamily.serif, fontSize: 24, fontWeight: '800', color: brand.black, textAlign: 'center' },
  shareIcon: { position: 'absolute', right: 0, fontSize: 20 },
  customer: { fontFamily: fontFamily.sans, fontSize: 16, fontWeight: '600', color: brand.black, textAlign: 'center', marginTop: spacing.sm },
  date: { fontFamily: fontFamily.mono, fontSize: 12, color: neutral[600], textAlign: 'center', marginTop: 4 },
  divider: { height: 1, backgroundColor: neutral[300], marginVertical: spacing.lg, borderStyle: 'dashed', borderWidth: 1, borderColor: neutral[300] },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  itemName: { fontFamily: fontFamily.sans, fontSize: 15, color: neutral[800] },
  itemPrice: { fontFamily: fontFamily.mono, fontSize: 15, color: brand.black },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: fontFamily.sans, fontSize: 18, fontWeight: '700', color: brand.black },
  totalValue: { fontFamily: fontFamily.mono, fontSize: 24, fontWeight: '800', color: brand.black },
  statusBadgeContainer: { alignSelf: 'center', marginTop: spacing.lg },
  telebirrButton: {
    marginTop: spacing.xl, backgroundColor: partners.telebirr, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center',
  },
  telebirrButtonText: { fontFamily: fontFamily.sans, color: '#fff', fontWeight: '700', fontSize: 16 },
  cashButton: {
    marginTop: spacing.md, backgroundColor: '#10B981', borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center',
  },
  cashButtonText: { fontFamily: fontFamily.sans, color: '#fff', fontWeight: '700', fontSize: 16 },
  doneButton: { marginTop: spacing.md, backgroundColor: brand.black, borderRadius: radius.sm, paddingVertical: 16, alignItems: 'center' },
  doneButtonText: { fontFamily: fontFamily.sans, color: '#fff', fontWeight: '700', fontSize: 16 },
});
