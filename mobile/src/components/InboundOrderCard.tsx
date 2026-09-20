import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, shadows, typeStyles, fontFamily } from '../theme';

export interface InboundOrderCardProps {
  orderId: string;
  customerName: string;
  location: string;
  items: string;
  amount: string;
  timeAgo: string;
  assignLabel: string;
  onAssign?: () => void;
}

/**
 * Telegram order card component.
 */
export const InboundOrderCard: React.FC<InboundOrderCardProps> = ({
  orderId, customerName, location, items, amount, timeAgo, assignLabel, onAssign
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.orderId}>{orderId}</Text>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>

      <Text style={styles.customerName}>{customerName}</Text>
      <Text style={styles.location}>📍 {location}</Text>
      
      <View style={styles.detailsBox}>
        <Text style={styles.items}>{items}</Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.amount}>{amount}</Text>
        <Pressable style={styles.assignBtn} onPress={onAssign}>
          <Text style={styles.assignBtnText}>{assignLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors?.neutral?.[50] || '#FFF',
    borderRadius: radius?.lg || 12,
    padding: spacing?.md || 16,
    ...shadows?.sm,
    borderWidth: 1,
    borderColor: colors?.neutral?.[200] || '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing?.xs || 4,
  },
  orderId: {
    fontFamily: fontFamily?.mono,
    fontWeight: 'bold',
    color: colors?.brand?.black || '#1A1A1A',
  },
  timeAgo: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[500] || '#6B7280',
  },
  customerName: {
    ...typeStyles?.h3,
    color: colors?.brand?.black || '#1A1A1A',
    marginBottom: 2,
  },
  location: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[600] || '#4B5563',
    marginBottom: spacing?.sm || 12,
  },
  detailsBox: {
    backgroundColor: colors?.neutral?.[100] || '#F3F4F6',
    padding: spacing?.sm || 12,
    borderRadius: radius?.md || 8,
    marginBottom: spacing?.md || 16,
  },
  items: {
    ...typeStyles?.body,
    color: colors?.neutral?.[800] || '#1F2937',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontFamily: fontFamily?.mono,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors?.brand?.black || '#1A1A1A',
  },
  assignBtn: {
    backgroundColor: colors?.brand?.gold || '#C4A35A',
    paddingHorizontal: spacing?.md || 16,
    paddingVertical: spacing?.sm || 8,
    borderRadius: radius?.md || 8,
  },
  assignBtnText: {
    color: colors?.brand?.black || '#1A1A1A',
    fontWeight: 'bold',
  },
});

export default InboundOrderCard;
