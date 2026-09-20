import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, shadows, typeStyles, fontFamily } from '../theme';
import { StatusBadge } from './StatusBadge';

export interface ConsignmentItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface DeliveryCardProps {
  stopNumber: number;
  totalStops: number;
  priority?: string;
  orderId: string;
  customerName: string;
  address: string;
  storeManager?: { name: string; phone: string };
  isTelebirrVerified?: boolean;
  consignment: {
    skuCount: number;
    items: ConsignmentItem[];
    total: string;
  };
  onConfirmDelivery?: () => void;
  onReportDelay?: () => void;
  onPartialReturn?: () => void;
}

/**
 * Order/delivery details card.
 */
export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  stopNumber, totalStops, priority, orderId, customerName, address, storeManager,
  isTelebirrVerified, consignment, onConfirmDelivery, onReportDelay, onPartialReturn
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.stopBadge}>
          <Text style={styles.stopBadgeText}>STOP {stopNumber}/{totalStops}</Text>
        </View>
        {priority && <StatusBadge variant="priority" label={priority} />}
      </View>
      
      <Text style={styles.orderId}>{orderId}</Text>
      <Text style={styles.customerName}>{customerName}</Text>
      <Text style={styles.address}>{address}</Text>

      {storeManager && (
        <View style={styles.managerSection}>
          <Text style={styles.managerName}>👤 {storeManager.name}</Text>
          <Text style={styles.managerPhone}>{storeManager.phone}</Text>
        </View>
      )}

      {isTelebirrVerified && (
        <View style={styles.telebirrBadge}>
          <Text style={styles.telebirrText}>✓ telebirr verified</Text>
        </View>
      )}

      <View style={styles.consignmentSection}>
        <Text style={styles.consignmentHeader}>{consignment.skuCount} SKUs</Text>
        {consignment.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{consignment.total}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.btnConfirm} onPress={onConfirmDelivery}>
          <Text style={styles.btnConfirmText}>Confirm Delivery</Text>
        </Pressable>
        <View style={styles.secondaryActions}>
          <Pressable style={styles.btnOutline} onPress={onReportDelay}>
            <Text style={styles.btnOutlineText}>Report Delay</Text>
          </Pressable>
          <Pressable style={styles.btnOutline} onPress={onPartialReturn}>
            <Text style={styles.btnOutlineText}>Partial Return</Text>
          </Pressable>
        </View>
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
    marginBottom: spacing?.sm || 8,
  },
  stopBadge: {
    backgroundColor: colors?.neutral?.[800] || '#1F2937',
    paddingHorizontal: spacing?.sm || 8,
    paddingVertical: spacing?.xxs || 2,
    borderRadius: radius?.sm || 4,
  },
  stopBadgeText: {
    color: '#FFF',
    ...typeStyles?.overline,
  },
  orderId: {
    ...typeStyles?.overline,
    color: colors?.neutral?.[500] || '#6B7280',
    marginBottom: spacing?.xxs || 2,
  },
  customerName: {
    fontFamily: fontFamily?.serif,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors?.brand?.black || '#1A1A1A',
    marginBottom: spacing?.xxs || 4,
  },
  address: {
    ...typeStyles?.body,
    color: colors?.neutral?.[600] || '#4B5563',
    marginBottom: spacing?.md || 16,
  },
  managerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors?.neutral?.[100] || '#F3F4F6',
    padding: spacing?.sm || 12,
    borderRadius: radius?.md || 8,
    marginBottom: spacing?.sm || 12,
  },
  managerName: {
    ...typeStyles?.bodySmall,
    fontWeight: 'bold',
  },
  managerPhone: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[600] || '#4B5563',
  },
  telebirrBadge: {
    backgroundColor: colors?.partners?.telebirr || '#5E2A8C',
    padding: spacing?.xs || 4,
    borderRadius: radius?.sm || 4,
    alignSelf: 'flex-start',
    marginBottom: spacing?.md || 16,
  },
  telebirrText: {
    color: '#FFF',
    ...typeStyles?.overline,
  },
  consignmentSection: {
    borderTopWidth: 1,
    borderTopColor: colors?.neutral?.[200] || '#E5E7EB',
    paddingTop: spacing?.md || 16,
    marginBottom: spacing?.lg || 24,
  },
  consignmentHeader: {
    ...typeStyles?.overline,
    color: colors?.neutral?.[500] || '#6B7280',
    marginBottom: spacing?.sm || 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing?.xs || 4,
  },
  itemName: {
    ...typeStyles?.body,
    color: colors?.brand?.black || '#1A1A1A',
    flex: 1,
  },
  itemQty: {
    ...typeStyles?.body,
    fontWeight: 'bold',
    color: colors?.brand?.black || '#1A1A1A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing?.md || 16,
    paddingTop: spacing?.sm || 8,
    borderTopWidth: 1,
    borderTopColor: colors?.neutral?.[200] || '#E5E7EB',
  },
  totalLabel: {
    ...typeStyles?.h3,
    color: colors?.brand?.black || '#1A1A1A',
  },
  totalValue: {
    fontFamily: fontFamily?.mono,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors?.brand?.black || '#1A1A1A',
  },
  actions: {
    gap: spacing?.sm || 12,
  },
  btnConfirm: {
    backgroundColor: colors?.brand?.gold || '#C4A35A',
    padding: spacing?.md || 16,
    borderRadius: radius?.md || 8,
    alignItems: 'center',
  },
  btnConfirmText: {
    color: colors?.brand?.black || '#1A1A1A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing?.sm || 12,
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors?.neutral?.[300] || '#D1D5DB',
    padding: spacing?.sm || 12,
    borderRadius: radius?.md || 8,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: colors?.brand?.black || '#1A1A1A',
    fontWeight: 'bold',
  },
});

export default DeliveryCard;
