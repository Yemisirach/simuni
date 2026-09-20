import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadows, typeStyles, fontFamily } from '../theme';

export interface KPICardProps {
  /** Uppercase overline label like 'COLLECTED REVENUE' */
  label: string;
  /** The big number like '384,520' */
  value: string;
  unit?: string;
  /** Trend indicator — pass a string ('+14.8%') or object with direction. */
  trend?: string | { value: string; direction: 'up' | 'down' };
  icon?: string;
  subItems?: Array<{ label: string; value: string }>;
}

/**
 * Large metric card for dashboards.
 */
export const KPICard: React.FC<KPICardProps> = ({ label, value, unit, trend, icon, subItems }) => {
  const trendText = typeof trend === 'string' ? trend : trend?.value;
  const trendColor = typeof trend === 'string'
    ? (trend.startsWith('+') ? '#1F9D55' : trend.startsWith('-') ? '#D64545' : '#6B6B6B')
    : (trend?.direction === 'up' ? '#1F9D55' : '#D64545');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{label}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>

      {trendText && (
        <Text style={[styles.trend, { color: trendColor }]}>
          {trendText}
        </Text>
      )}

      {subItems && subItems.length > 0 && (
        <View style={styles.subItemsContainer}>
          {subItems.map((item, index) => (
            <View key={index} style={styles.subItemRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.dot, { backgroundColor: item.label.toLowerCase().includes('telebirr') ? '#9D4EDD' : '#D1D5DB' }]} />
                <Text style={styles.subItemLabel}>{item.label}</Text>
              </View>
              <Text style={styles.subItemValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  icon: {
    fontSize: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: fontFamily?.mono,
    color: '#111827',
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  trend: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  subItemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 4,
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  subItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  subItemValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamily?.mono,
    color: '#111827',
  },
});

export default KPICard;
