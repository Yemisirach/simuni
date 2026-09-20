// Thin fetch wrapper for the Simuni API. Swap API_BASE_URL for your deployed backend.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://10.255.157.145:3000/api/v1';

/**
 * Exported (not just used internally) so src/offline/queue.ts can replay a
 * queued write with the exact same auth headers once connectivity returns.
 */
export async function rawRequest(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('simuni_token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

/** True for "the device can't reach the server at all" — as opposed to a 4xx/5xx the server actually answered. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError; // fetch throws a bare TypeError for DNS/connection failures in RN, same as web
}

export const api = {
  /**
   * Better Auth's `username` plugin exposes sign-in at
   * `{basePath}/sign-in/username` (basePath = "/auth", so the full path
   * under our API prefix is "/auth/sign-in/username"). No workspace slug is
   * needed at login anymore — WorkspaceContextGuard resolves the caller's
   * workspace server-side from their Member row.
   */
  async login(phone: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/sign-in/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: phone, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Login failed — check your phone number and password.');
    }
    // The bearer plugin returns the session token in this response header.
    const bearerToken = res.headers.get('set-auth-token');
    const data = await res.json();
    if (bearerToken) await AsyncStorage.setItem('simuni_token', bearerToken);
    if (data?.user?.id) await AsyncStorage.setItem('simuni_user_id', data.user.id);
    return data;
  },

  currentUserId: () => AsyncStorage.getItem('simuni_user_id'),

  /**
   * Better Auth's sign-in response doesn't carry our domain `workspaceId`
   * (that's resolved server-side per-request by WorkspaceContextGuard, not
   * baked into the session). The mobile app fetches it once after login so
   * GPS pings can target the right Socket.IO room — see
   * screens/RouteDetailScreen.tsx.
   */
  async ensureWorkspaceId(): Promise<string> {
    const cached = await AsyncStorage.getItem('simuni_workspace_id');
    if (cached) return cached;
    const workspace = await rawRequest('/workspace/me');
    await AsyncStorage.setItem('simuni_workspace_id', workspace.id);
    return workspace.id;
  },

  myRoutes: () => rawRequest('/routes'),
  routeDetail: (routeId: string) => rawRequest(`/routes/${routeId}`),
  visitStop: (routeId: string, stopId: string) =>
    rawRequest(`/routes/${routeId}/stops/${stopId}/visit`, { method: 'PATCH' }),
  startRoute: (routeId: string) => rawRequest(`/routes/${routeId}/start`, { method: 'PATCH' }),
  completeRoute: (routeId: string) => rawRequest(`/routes/${routeId}/complete`, { method: 'PATCH' }),
  directions: (routeId: string, lat: number, lng: number, stopId?: string) =>
    rawRequest(`/routes/${routeId}/directions?lat=${lat}&lng=${lng}${stopId ? `&stopId=${stopId}` : ''}`),
  /** "Suggest best route" — re-sequences remaining stops via OSRM's Trip service. */
  optimizeRoute: (routeId: string, lat: number, lng: number) =>
    rawRequest(`/routes/${routeId}/optimize`, { method: 'POST', body: JSON.stringify({ lat, lng }) }),

  products: () => rawRequest('/products'),
  /** Used by OrderCollectionScreen's "add a custom product" flow. */
  createProduct: (name: string, unit: string, price: number) =>
    rawRequest('/products', { method: 'POST', body: JSON.stringify({ name, unit, price }) }),

  /**
   * NOTE: this throws on any failure, including "device is offline" — it
   * does NOT auto-queue. OrderCollectionScreen decides whether to queue
   * (via src/offline/queue.ts) after catching a network error, so the UI
   * can show "Order queued — will sync automatically" rather than silently
   * queuing behind the scenes.
   */
  createOrder: (customerId: string, items: { productId: string; quantity: number }[], routeId?: string) =>
    rawRequest('/orders', { method: 'POST', body: JSON.stringify({ customerId, items, routeId }) }),

  startDelivery: (orderId: string) => rawRequest(`/deliveries/${orderId}/start`, { method: 'PATCH' }),
  arriveDelivery: (orderId: string, lat: number, lng: number) =>
    rawRequest(`/deliveries/${orderId}/arrive`, { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),
  confirmDelivery: (orderId: string) => rawRequest(`/deliveries/${orderId}/confirm`, { method: 'PATCH' }),

  generateInvoice: (orderId: string) => rawRequest(`/invoices/orders/${orderId}/generate`, { method: 'POST' }),
  invoice: (invoiceId: string) => rawRequest(`/invoices/${invoiceId}`),

  /** "Collect Payment" via telebirr — returns { checkoutUrl } to open. */
  payWithTelebirr: (invoiceId: string) =>
    rawRequest(`/invoices/${invoiceId}/pay/telebirr`, { method: 'POST' }),

  /** "Clean Loan" / Cash collection */
  markInvoicePaid: (invoiceId: string) =>
    rawRequest(`/invoices/${invoiceId}/payment-status`, { 
      method: 'PATCH', 
      body: JSON.stringify({ paymentStatus: 'PAID' }) 
    }),
};
