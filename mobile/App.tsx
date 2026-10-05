import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { initOfflineSync } from './src/offline/queue';

export default function App() {
  useEffect(() => {
    // Flushes any orders/GPS pings queued while offline, on launch and on
    // every reconnect. See src/offline/queue.ts.
    const unsubscribe = initOfflineSync();
    return () => unsubscribe();
  }, []);

  const content = (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
});
