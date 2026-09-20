import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { brand, neutral, semantic, spacing, radius, shadows, fontFamily, badges } from '../theme';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

interface RouteSummary {
  id: string;
  name: string;
  date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  stops: { id: string; status: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function RouteListScreen({ navigation }: any) {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.myRoutes();
      setRoutes(data);
    } catch {
      // Fall back to empty state
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const activeRoutesCount = routes.filter(r => r.status === 'IN_PROGRESS').length;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerText}>{activeRoutesCount} Active Routes</Text>
      </View>
      <FlatList
        data={routes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No routes assigned yet. Pull down to refresh.</Text>
        }
        renderItem={({ item }) => {
          const visited = item.stops.filter((s) => s.status === 'VISITED').length;
          const total = item.stops.length;
          const progress = total > 0 ? visited / total : 0;
          let badgeVariant: 'gray' | 'amber' | 'green' | 'red' = 'gray';
          if (item.status === 'IN_PROGRESS') badgeVariant = 'amber';
          else if (item.status === 'COMPLETED') badgeVariant = 'green';
          else if (item.status === 'CANCELLED') badgeVariant = 'red';

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('RouteDetail', { routeId: item.id, routeName: item.name })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <StatusBadge variant={badgeVariant} label={STATUS_LABEL[item.status]} />
              </View>
              <Text style={styles.cardSub}>
                {visited}/{total} stops visited
              </Text>
              <View style={styles.progressContainer}>
                <ProgressBar progress={progress} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neutral[100] },
  headerBar: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: neutral[200],
  },
  headerText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '600',
    color: neutral[700],
  },
  empty: { textAlign: 'center', marginTop: spacing.xl, color: neutral[600] },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: neutral[200],
    ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: fontFamily.serif, fontSize: 18, fontWeight: '700', color: brand.black },
  cardSub: { fontFamily: fontFamily.sans, fontSize: 13, color: neutral[600], marginTop: spacing.xs },
  progressContainer: { marginTop: spacing.sm },
});
