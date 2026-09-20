import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, shadows, typeStyles, fontFamily } from '../theme';
import { StatusBadge, StatusVariant } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

export interface RouteManifestCardProps {
  routeId: string;
  status: StatusVariant;
  title: string;
  agentName: string;
  stopsCompleted: number;
  totalStops: number;
  revenue: string;
  revenueSource: string;
  progressPercent: number;
  onViewTurnByTurn?: () => void;
  onViewInvoice?: () => void;
}

/**
 * Route summary card.
 */
export const RouteManifestCard: React.FC<RouteManifestCardProps> = ({
  routeId, status, title, agentName, stopsCompleted, totalStops, revenue, revenueSource, progressPercent, onViewTurnByTurn, onViewInvoice
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.routeId}>{routeId}</Text>
        <StatusBadge variant={status} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.agentName}>Agent: {agentName}</Text>
      
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.stopsText}>Stops: {stopsCompleted}/{totalStops}</Text>
          <Text style={styles.percentText}>{progressPercent}%</Text>
        </View>
        <ProgressBar percent={progressPercent} />
      </View>

      <View style={styles.revenueSection}>
        <Text style={styles.revenueLabel}>Est. Revenue</Text>
        <Text style={styles.revenueValue}>{revenue}</Text>
        <Text style={styles.revenueSource}>{revenueSource}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onViewTurnByTurn}>
          <Text style={styles.btnPrimaryText}>Turn-by-Turn</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onViewInvoice}>
          <Text style={styles.btnSecondaryText}>View Invoice</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors?.neutral?.[50] || '#FFF',
    padding: spacing?.md || 16,
    borderRadius: radius?.lg || 12,
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
  routeId: {
    ...typeStyles?.overline,
    color: colors?.neutral?.[500] || '#6B7280',
  },
  title: {
    ...typeStyles?.h3,
    fontFamily: fontFamily?.serif,
    color: colors?.brand?.black || '#1A1A1A',
    marginBottom: spacing?.xxs || 2,
  },
  agentName: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[600] || '#4B5563',
    marginBottom: spacing?.md || 16,
  },
  progressSection: {
    marginBottom: spacing?.md || 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing?.xxs || 4,
  },
  stopsText: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[700] || '#374151',
  },
  percentText: {
    ...typeStyles?.bodySmall,
    fontWeight: 'bold',
  },
  revenueSection: {
    backgroundColor: colors?.neutral?.[100] || '#F3F4F6',
    padding: spacing?.sm || 12,
    borderRadius: radius?.md || 8,
    marginBottom: spacing?.md || 16,
  },
  revenueLabel: {
    ...typeStyles?.overline,
    color: colors?.neutral?.[500] || '#6B7280',
  },
  revenueValue: {
    ...typeStyles?.displayMono,
    fontFamily: fontFamily?.mono,
    color: colors?.brand?.black || '#1A1A1A',
    marginVertical: spacing?.xxs || 2,
  },
  revenueSource: {
    ...typeStyles?.bodySmall,
    color: colors?.brand?.gold || '#C4A35A',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing?.sm || 12,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing?.sm || 12,
    borderRadius: radius?.md || 8,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: colors?.brand?.black || '#1A1A1A',
  },
  btnPrimaryText: {
    color: colors?.neutral?.[50] || '#FFF',
    fontWeight: 'bold',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors?.neutral?.[300] || '#D1D5DB',
  },
  btnSecondaryText: {
    color: colors?.brand?.black || '#1A1A1A',
    fontWeight: 'bold',
  },
});

export default RouteManifestCard;
