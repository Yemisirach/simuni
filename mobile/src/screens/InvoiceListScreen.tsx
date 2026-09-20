import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand, neutral, spacing, typeStyles, fontFamily } from '../theme';

export default function InvoiceListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invoices</Text>
      <Text style={styles.message}>Invoice list coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    color: brand.black,
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    color: neutral[600],
    textAlign: 'center',
  },
});
