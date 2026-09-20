import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typeStyles, fontFamily } from '../theme';

export interface TelemetryIndicatorProps {
  label: string;
  value: string;
  status: 'ok' | 'warning' | 'error' | 'offline';
  icon?: string;
}

/**
 * Microservice/diagnostic status dot component.
 */
export const TelemetryIndicator: React.FC<TelemetryIndicatorProps> = ({
  label, value, status, icon
}) => {
  let statusColor = colors?.neutral?.[400] || '#9CA3AF';
  if (status === 'ok') statusColor = colors?.semantic?.success || 'green';
  else if (status === 'warning') statusColor = colors?.semantic?.warning || 'orange';
  else if (status === 'error') statusColor = colors?.semantic?.error || 'red';

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <View style={styles.labelRow}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors?.neutral?.[100] || '#F3F4F6',
    padding: spacing?.sm || 8,
    borderRadius: radius?.md || 8,
    borderWidth: 1,
    borderColor: colors?.neutral?.[200] || '#E5E7EB',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing?.sm || 8,
  },
  content: {
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 10,
    marginRight: spacing?.xxs || 4,
  },
  label: {
    ...typeStyles?.caption,
    color: colors?.neutral?.[500] || '#6B7280',
  },
  value: {
    fontFamily: fontFamily?.mono,
    fontSize: 12,
    color: colors?.brand?.black || '#1A1A1A',
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default TelemetryIndicator;
