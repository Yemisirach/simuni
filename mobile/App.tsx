import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { initOfflineSync } from './src/offline/queue';

export default function App() {
  useEffect(() => {
    // Flushes any orders/GPS pings queued while offline, on launch and on
    // every reconnect. See src/offline/queue.ts.
    const unsubscribe = initOfflineSync();
    return () => unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
