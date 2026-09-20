import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, typeStyles } from '../theme';

export interface HeaderBarProps {
  businessName: string;
  syncStatus: string;
  onNotification?: () => void;
  onProfile?: () => void;
}

/**
 * Top header bar component.
 */
export const HeaderBar: React.FC<HeaderBarProps> = ({
  businessName, syncStatus, onNotification, onProfile
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Pressable style={styles.iconBtn}>
          <Text style={styles.iconText}>☰</Text>
        </Pressable>
        <View style={styles.titleSection}>
          <Text style={styles.businessName}>{businessName}</Text>
          <View style={styles.syncRow}>
            <View style={styles.syncDot} />
            <Text style={styles.syncStatus}>{syncStatus}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <Pressable style={styles.iconBtn} onPress={onNotification}>
          <Text style={styles.iconText}>🔔</Text>
        </Pressable>
        <Pressable style={styles.avatar} onPress={onProfile}>
          <Text style={styles.avatarText}>U</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors?.brand?.darkGray || '#333333',
    paddingHorizontal: spacing?.md || 16,
    paddingVertical: spacing?.sm || 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: spacing?.xs || 8,
  },
  iconText: {
    color: '#FFF',
    fontSize: 18,
  },
  titleSection: {
    marginLeft: spacing?.sm || 8,
  },
  businessName: {
    ...typeStyles?.body,
    fontWeight: 'bold',
    color: '#FFF',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors?.semantic?.success || '#10B981',
    marginRight: spacing?.xxs || 4,
  },
  syncStatus: {
    ...typeStyles?.overline,
    color: 'rgba(255,255,255,0.7)',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing?.sm || 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors?.brand?.gold || '#C4A35A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors?.brand?.black || '#1A1A1A',
    fontWeight: 'bold',
  },
});

export default HeaderBar;
