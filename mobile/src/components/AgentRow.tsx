import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, typeStyles, fontFamily } from '../theme';

export interface AgentRowProps {
  /** Two-character initials (derived from name if omitted). */
  initials?: string;
  name: string;
  /** Vehicle tag like 'MB-04' or 'VAN-02'. */
  vehicle?: string;
  /** Alias for vehicleTag — either works. */
  vehicleTag?: string;
  phone?: string;
  location?: string;
  /** Current route/stop info, e.g. 'Stop 4 of 6 · Cinema Ras Mart'. */
  stopInfo?: string;
  /** Alias for stopInfo. */
  routeInfo?: string;
  revenue?: string;
  syncStatus?: string;
  isOnline?: boolean;
  onCall?: () => void;
  onMessage?: () => void;
  onLocate?: () => void;
}

/**
 * Agent list item row component.
 */
export const AgentRow: React.FC<AgentRowProps> = ({
  initials: initProp, name, vehicle, vehicleTag, phone, location, stopInfo, routeInfo, revenue, syncStatus, isOnline = false, onCall, onMessage, onLocate
}) => {
  const displayInitials = initProp || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const displayVehicle = vehicle || vehicleTag;
  const displayStop = stopInfo || routeInfo;
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{displayInitials}</Text>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? (colors?.semantic?.success || 'green') : (colors?.semantic?.error || 'red') }]} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{name}</Text>
          {displayVehicle && <Text style={styles.vehicleTag}>{displayVehicle}</Text>}
        </View>
        {phone && <Text style={styles.phone}>{phone}</Text>}
        {displayStop && <Text style={styles.stopInfo}>{displayStop}</Text>}
        {revenue && <Text style={styles.revenue}>{revenue}</Text>}
        {syncStatus && <Text style={styles.syncStatus}>{syncStatus}</Text>}
      </View>
      <View style={styles.actions}>
        {onCall && <Pressable onPress={onCall} style={styles.actionBtn}><Text style={{ fontSize: 16 }}>📞</Text></Pressable>}
        {onLocate && <Pressable onPress={onLocate} style={styles.actionBtn}><Text style={{ fontSize: 16 }}>⇄</Text></Pressable>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing?.md || 16,
    backgroundColor: colors?.neutral?.[50] || '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors?.neutral?.[200] || '#E5E7EB',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius?.full || 24,
    backgroundColor: colors?.brand?.black || '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing?.md || 16,
    position: 'relative',
  },
  avatarText: {
    color: colors?.neutral?.[50] || '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors?.neutral?.[50] || '#FFF',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing?.xxs || 2,
  },
  name: {
    ...typeStyles?.body,
    fontWeight: 'bold',
    color: colors?.brand?.black || '#1A1A1A',
    marginRight: spacing?.xs || 4,
  },
  vehicleTag: {
    ...typeStyles?.overline,
    backgroundColor: colors?.neutral?.[200] || '#E5E7EB',
    paddingHorizontal: spacing?.xs || 4,
    borderRadius: radius?.xs || 4,
  },
  phone: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[500] || '#6B7280',
  },
  stopInfo: {
    ...typeStyles?.bodySmall,
    color: colors?.neutral?.[600] || '#4B5563',
    marginTop: spacing?.xxs || 2,
  },
  revenue: {
    ...typeStyles?.bodySmall,
    fontFamily: fontFamily?.mono,
    fontWeight: 'bold',
    marginTop: spacing?.xxs || 2,
  },
  syncStatus: {
    ...typeStyles?.overline,
    color: colors?.neutral?.[400] || '#9CA3AF',
    marginTop: spacing?.xxs || 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing?.xs || 8,
  },
  actionBtn: {
    padding: spacing?.xs || 8,
    backgroundColor: colors?.neutral?.[100] || '#F3F4F6',
    borderRadius: radius?.full || 999,
  }
});

export default AgentRow;
