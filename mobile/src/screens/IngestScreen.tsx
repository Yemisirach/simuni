import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand, neutral, spacing, fontFamily } from '../theme';

export default function IngestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Data Ingest</Text>
      <Text style={styles.subtitle}>Product catalog sync, customer imports, and bulk operations</Text>
      <Text style={styles.icon}>📥</Text>
      <Text style={styles.message}>Ingest features coming soon. Use the web console for bulk operations.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    color: brand.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: neutral[600],
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  message: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    color: neutral[700],
    textAlign: 'center',
  },
});
