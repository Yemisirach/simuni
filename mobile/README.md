# Simuni Mobile (Agent App)

React Native / Expo app for field agents: the "Agent Receives Route → GPS Tracking →
Customer Visit → Collect Order → Deliver Product → Generate Invoice" workflow.

## Screens
| Screen | Purpose |
|---|---|
| `LoginScreen` | Phone + password login (no workspace slug needed — resolved server-side) |
| `RouteListScreen` | Today's assigned routes with progress |
| `RouteDetailScreen` | Map of stops, start/complete route, live GPS streaming via Socket.IO (falls back to offline queue when disconnected) |
| `OrderCollectionScreen` | Add products + quantities (typeable qty, not just +/-), add a custom one-off product on the spot, submit order (queues offline on network failure) |
| `DeliveryConfirmScreen` | Start → Arrive → Confirm delivery timeline |
| `InvoiceScreen` | Generated invoice with line items, payment status, and a "Pay with telebirr" button |

## Setup
```bash
npm install
npx expo start
```

Point `API_BASE_URL` in `src/api/client.ts` at your running backend
(defaults to `http://localhost:3000/api/v1`).

Demo login (after seeding the backend): phone `0911000003` (field agent Dawit Alemu),
password `password123`.

## Offline support
`src/offline/queue.ts` persists two kinds of writes to AsyncStorage so they survive the
app being killed, and flushes them automatically on launch and on every reconnect
(via `@react-native-community/netinfo`):

- **Order submissions** — queued whole; flushed in order, one at a time, stopping at the
  first failure so orders can't arrive out of sequence.
- **GPS pings** — only the latest point per route is kept (no point replaying 100 stale
  pings after 10 minutes offline); flushed via a plain HTTP endpoint
  (`POST /agents/ping`) rather than the socket, since the socket may still be reconnecting.

Call `initOfflineSync()` once at app startup (already wired into `App.tsx`).

**Known limitation**: an order queued while offline doesn't have a server-side id yet, so
the app can't jump straight into the delivery/invoice flow for it — the agent gets an
"Order saved offline" message and returns to the route; delivery confirmation for that
order happens once it's synced.

## Turn-by-turn navigation
`RouteDetailScreen` calls the backend's OSRM-backed directions endpoint
(`api.directions(routeId, lat, lng)`) every ~20s (or whenever the agent's position updates
meaningfully) while a route is `IN_PROGRESS`, and renders:
- A green `Polyline` on the map from the agent's current position to the next pending stop.
- A banner above the map with the next turn instruction, distance, and ETA.

## Suggest Best Route
A "📍 Suggest Best Route" button appears on `RouteDetailScreen` whenever a route is
`IN_PROGRESS` with 2+ pending stops. It calls `api.optimizeRoute(routeId, lat, lng)`
(`POST /routes/:id/optimize` on the backend, backed by OSRM's Trip service — see
`backend/src/routing/routing.service.ts`) and re-sequences the remaining stops into the
shortest-looking visiting order from the agent's current position. Already-visited stops
keep their place; only the still-pending ones get reordered.

If OSRM isn't running, `api.directions()` throws and the banner/polyline simply don't
appear — the rest of the screen (stop list, order collection) works exactly the same.

## Collect Payment (telebirr)
`InvoiceScreen` shows a "📱 Pay with telebirr" button on any unpaid invoice. Tapping it calls
`api.payWithTelebirr(invoiceId)` (`POST /invoices/:id/pay/telebirr`) and opens the returned
checkout URL with `Linking.openURL` — telebirr's H5 flow hands off to the native telebirr app
if it's installed, or a mobile web checkout page otherwise.

Because there's no reliable way to catch an in-app redirect after the customer switches apps
to pay, the screen instead re-fetches the invoice whenever the app regains focus
(`AppState` → `'active'`) after a checkout was opened, plus a manual "tap to refresh" on the
status badge. The real source of truth is the backend's telebirr webhook
(`backend/src/payments/payments.controller.ts`), not anything caught client-side here.
