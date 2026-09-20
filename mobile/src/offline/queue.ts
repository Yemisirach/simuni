import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL, rawRequest } from '../api/client';
import { QueuedAction, bumpAttempts, pushToQueue, readQueue, removeFromQueue } from './storage';

/**
 * Offline queue for the two write operations that most need to survive a
 * dead connection out in the field: order submissions and GPS pings (see
 * "Offline-First Considerations" in docs/Simuni_Product_Spec.md).
 *
 * Design:
 *  - Every queued item is persisted to AsyncStorage immediately, so it
 *    survives the app being killed, not just a screen navigation.
 *  - GPS pings are deliberately last-write-wins per route: only the most
 *    recent queued ping per route is kept (see `pushGpsPing`) so a phone
 *    that was offline for 10 minutes doesn't replay 100 stale points when
 *    it reconnects — the live map only cares about "where are they now".
 *  - Order submissions are never dropped or deduplicated; they flush in
 *    the order they were created, and a network failure stops the flush
 *    (rather than skipping ahead) so orders can't arrive out of order.
 */

type Listener = (pendingCount: number) => void;
const listeners = new Set<Listener>();
let flushing = false;

export function onQueueChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function notify() {
  const items = await readQueue();
  listeners.forEach((fn) => fn(items.length));
}

/** Call once at app startup (see App.tsx). Flushes on launch and on every reconnect. */
export function initOfflineSync() {
  flushQueue();
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      flushQueue();
    }
  });
}

export async function queueOrder(orderPayload: { customerId: string; items: any[]; routeId?: string }) {
  const item = await pushToQueue('order', orderPayload);
  notify();
  flushQueue();
  return item;
}

/** Keeps only the latest ping per route so the queue can't balloon. */
export async function pushGpsPing(ping: { routeId: string; lat: number; lng: number; agentId: string }) {
  const queue = await readQueue();
  const stale = queue.filter((i) => i.kind === 'gps-ping' && i.payload.routeId === ping.routeId);
  for (const s of stale) await removeFromQueue(s.id);
  await pushToQueue('gps-ping', ping);
  notify();
  flushQueue();
}

export async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    let queue = await readQueue();
    for (const item of queue) {
      const ok = await trySend(item);
      if (ok) {
        await removeFromQueue(item.id);
      } else {
        await bumpAttempts(item.id);
        // Stop at the first failure — preserves order and avoids hammering
        // a backend that's still unreachable.
        break;
      }
    }
    await notify();
  } finally {
    flushing = false;
  }
}

async function trySend(item: QueuedAction): Promise<boolean> {
  try {
    if (item.kind === 'order') {
      await rawRequest('/orders', { method: 'POST', body: JSON.stringify(item.payload) });
    } else if (item.kind === 'gps-ping') {
      // GPS pings normally go over the Socket.IO channel; when flushing a
      // queued one after being offline, we fall back to a plain HTTP POST
      // so it doesn't depend on the socket having reconnected too.
      await rawRequest('/agents/ping', { method: 'POST', body: JSON.stringify(item.payload) });
    }
    return true;
  } catch {
    return false;
  }
}
