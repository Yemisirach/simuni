import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typeStyles } from '../theme';

export interface StopTimelineItemProps {
  sequence: number;
  customerName: string;
  address?: string;
  status: 'completed' | 'inTransit' | 'approaching' | 'pending';
  time?: string;
  deliveryInfo?: string;
  isLast?: boolean;
  outstandingBalance?: number;
}

/**
 * Itinerary timeline item component.
 */
export const StopTimelineItem: React.FC<StopTimelineItemProps> = ({
  sequence, customerName, address, status, time, deliveryInfo, isLast = false, outstandingBalance
}) => {
  let indicatorColor = colors?.neutral?.[300] || '#D1D5DB';
  let indicatorTextColor = colors?.neutral?.[600] || '#4B5563';
  
  if (status === 'completed') {
    indicatorColor = colors?.semantic?.success || 'green';
    indicatorTextColor = '#FFF';
  } else if (status === 'inTransit' || status === 'approaching') {
    indicatorColor = colors?.brand?.gold || '#C4A35A';
    indicatorTextColor = '#FFF';
  }

  return (
    <View style={styles.container}>
      <View style={styles.leftColumn}>
        <View style={[styles.sequenceCircle, { backgroundColor: indicatorColor }]}>
          <Text style={[styles.sequenceText, { color: indicatorTextColor }]}>{sequence}</Text>
        </View>
        {!isLast && <View style={[styles.connector, { backgroundColor: status === 'completed' ? (colors?.semantic?.success || 'green') : (colors?.neutral?.[300] || '#D1D5DB') }]} />}
      </View>
      <View style={styles.rightColumn}>
        <View style={styles.headerRow}>
          <Text style={styles.customerName}>{customerName}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        {address && <Text style={styles.address}>{address}</Text>}
        <Text style={styles.deliveryInfo}>{deliveryInfo}</Text>
        
        {outstandingBalance != null && outstandingBalance > 0 && (
          <View style={styles.loanBadge}>
            <Text style={styles.loanBadgeText}>⚠️ Collect Loan: ETB {outstandingBalance.toFixed(2)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: 80,
  },
  leftColumn: {
    width: 40,
    alignItems: 'center',
  },
  sequenceCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  sequenceText: {
    ...typeStyles?.bodySmall,
    fontWeight: 'bold',
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  rightColumn: {
    flex: 1,
    paddingBottom: spacing?.lg || 24,
    paddingLeft: spacing?.sm || 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing?.xxs || 2,
  },
  customerName: {
    ...typeStyles?.body,
    fontWeight: 'bold',
    color: colors?.brand?.black || '#1A1A1A',
    flex: 1,
  },
  time: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[500] || '#6B7280',
    marginLeft: spacing?.sm || 8,
  },
  address: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[500] || '#6B7280',
    marginBottom: spacing?.xxs || 2,
  },
  deliveryInfo: {
    ...typeStyles?.bodySmall,
    color: colors?.brand?.black || '#1A1A1A',
  },
  loanBadge: {
    marginTop: spacing?.sm || 8,
    backgroundColor: '#FEE2E2', // light red
    paddingHorizontal: spacing?.sm || 8,
    paddingVertical: 4,
    borderRadius: radius?.sm || 4,
    alignSelf: 'flex-start',
  },
  loanBadgeText: {
    color: '#B91C1C', // dark red
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default StopTimelineItem;
