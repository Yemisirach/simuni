import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, typeStyles, fontFamily } from '../theme';

export interface SectionHeaderProps {
  title: string;
  count?: number;
  actionLabel?: string;
  rightElement?: React.ReactNode;
}

/**
 * Section title with optional badge and action.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title, count, actionLabel, rightElement
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {count !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </View>
      <View style={styles.right}>
        {actionLabel && (
          <Pressable>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        )}
        {rightElement}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing?.sm || 12,
    paddingHorizontal: spacing?.md || 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily?.serif,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors?.brand?.black || '#1A1A1A',
  },
  badge: {
    backgroundColor: colors?.neutral?.[200] || '#E5E7EB',
    paddingHorizontal: spacing?.sm || 8,
    paddingVertical: 2,
    borderRadius: radius?.full || 999,
    marginLeft: spacing?.sm || 8,
  },
  badgeText: {
    ...typeStyles?.bodySmall,
    fontWeight: 'bold',
    color: colors?.neutral?.[700] || '#374151',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[500] || '#6B7280',
  },
});

export default SectionHeader;
