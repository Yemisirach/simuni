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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.mobileFrame}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      maxHeight: 950,
      overflow: 'hidden',
    } : {}),
  },
});
