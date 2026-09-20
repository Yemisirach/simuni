import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typeStyles, fontFamily } from '../theme';

export interface NavigationBannerProps {
  instruction: string;
  approachWaypoint: string;
  distance: string;
  remainingDist: string;
  estimatedEta: string;
  gpsSpeed: string;
  accuracy: string;
}

/**
 * OSRM turn-by-turn banner.
 */
export const NavigationBanner: React.FC<NavigationBannerProps> = ({
  instruction, approachWaypoint, distance, remainingDist, estimatedEta, gpsSpeed, accuracy
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.accuracyPill}>
        <Text style={styles.accuracyText}>{accuracy}</Text>
      </View>
      <View style={styles.mainInfo}>
        <Text style={styles.distance}>{distance}</Text>
        <Text style={styles.instruction}>{instruction}</Text>
        <Text style={styles.waypoint}>Toward {approachWaypoint}</Text>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>REM. DIST</Text>
          <Text style={styles.statValue}>{remainingDist}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>ESTIMATED ETA</Text>
          <Text style={styles.statValue}>{estimatedEta}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>GPS SPEED</Text>
          <Text style={styles.statValue}>{gpsSpeed}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors?.partners?.osrm || '#0F7A5C',
    padding: spacing?.md || 16,
    borderRadius: radius?.md || 8,
    position: 'relative',
  },
  accuracyPill: {
    position: 'absolute',
    top: spacing?.sm || 8,
    right: spacing?.sm || 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: spacing?.sm || 8,
    paddingVertical: spacing?.xxs || 2,
    borderRadius: radius?.full || 999,
  },
  accuracyText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fontFamily?.mono,
  },
  mainInfo: {
    alignItems: 'center',
    marginBottom: spacing?.lg || 24,
    marginTop: spacing?.sm || 8,
  },
  distance: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: fontFamily?.mono,
  },
  instruction: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: spacing?.xs || 4,
  },
  waypoint: {
    color: 'rgba(255,255,255,0.8)',
    ...typeStyles?.bodySmall,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: spacing?.sm || 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...typeStyles?.overline,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing?.xxs || 2,
  },
  statValue: {
    color: '#FFF',
    fontFamily: fontFamily?.mono,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default NavigationBanner;
