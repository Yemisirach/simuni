import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { badges, neutral, spacing, radius, typeStyles } from '../theme';

export type StatusVariant = 'onTrack' | 'approaching' | 'inTransit' | 'pending' | 'completed' | 'cancelled' | 'offline' | 'priority' | 'telebirr' | 'dispatched' | 'online';

export interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
}

/** Map component variant names to badge palette keys. */
const variantMap: Record<StatusVariant, keyof typeof badges> = {
  onTrack: 'green',
  completed: 'green',
  online: 'green',
  approaching: 'amber',
  inTransit: 'amber',
  dispatched: 'amber',
  pending: 'gray',
  offline: 'gray',
  cancelled: 'red',
  priority: 'gold',
  telebirr: 'purple',
};

/** Default display labels per variant. */
const defaultLabels: Record<StatusVariant, string> = {
  onTrack: 'ON TRACK',
  approaching: 'APPROACHING',
  inTransit: 'IN TRANSIT',
  pending: 'PENDING',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  offline: 'OFFLINE',
  priority: 'PRIORITY',
  telebirr: 'TELEBIRR VERIFIED',
  dispatched: 'DISPATCHED',
  online: 'ONLINE',
};

/**
 * A pill-shaped badge showing status labels with color-coded backgrounds.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label }) => {
  const palette = badges[variantMap[variant]] ?? badges.gray;

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.text }]}>
        {label || defaultLabels[variant]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typeStyles.overline,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default StatusBadge;
