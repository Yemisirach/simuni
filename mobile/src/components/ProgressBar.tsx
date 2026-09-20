import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typeStyles } from '../theme';

export interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}

/**
 * Thin horizontal progress indicator.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  percent, 
  color = colors?.brand?.gold || '#C4A35A', 
  height = 4, 
  showLabel = false 
}) => {
  const safePercent = Math.min(Math.max(percent, 0), 100);
  
  return (
    <View style={styles.container}>
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View style={[styles.fill, { width: `${safePercent}%`, backgroundColor: color, borderRadius: height / 2 }]} />
      </View>
      {showLabel && <Text style={styles.label}>{safePercent.toFixed(0)}%</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    backgroundColor: colors?.neutral?.[200] || '#E5E7EB',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  label: {
    ...typeStyles?.bodySmall,
    marginLeft: spacing?.sm || 8,
    color: colors?.neutral?.[600] || '#4B5563',
  }
});

export default ProgressBar;
