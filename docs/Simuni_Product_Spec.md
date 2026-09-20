# Simuni — Refined Product Spec

## 1. Product Summary
Simuni is a multi-tenant SaaS for Ethiopian field-sales businesses (water distributors,
beverage companies, FMCG sellers, Mercato merchants, food suppliers, pharma distributors)
to manage agents, customers, delivery routes, GPS tracking, order collection, and
e-invoicing from one simple platform.

## 2. Roles & Permissions
| Role | Can do |
|---|---|
| **Owner** | Everything: workspace settings, invite managers/agents, view all data |
| **Manager** | Add customers/products, create routes, assign agents, view dashboards, invoices |
| **Field Agent** | View assigned routes, collect orders, confirm deliveries, generate invoices |
| **Customer** *(future)* | View own order/invoice history via a lightweight portal |

Implemented via Better Auth's `organization` plugin: Owner/Manager/Agent map onto its
built-in owner/admin/member roles (see `backend/src/auth/roles.ts`) rather than a custom
enum, so its own permission checks stay meaningful.

## 3. Authentication & Multi-Tenancy
- **Better Auth** owns identity, sessions, and credentials (see
  `backend/src/auth/better-auth.instance.ts`) — not a hand-rolled JWT/bcrypt scheme.
- A Better Auth "organization" *is* a Simuni "workspace". `WorkspaceContextGuard` runs on
  every request, resolves which workspace + role the caller has, and exposes them as
  `user.workspaceId` / `user.role` so the rest of the app's service layer is unchanged from
  a simpler custom-auth design.
- Mobile clients authenticate with `Authorization: Bearer <token>` (the `bearer()` plugin)
  since they can't rely on browser cookies; agents log in with their phone number (the
  `username` plugin) rather than an email.
- One PostgreSQL database, row-level tenancy via `workspaceId` on every domain table.

**Status: implemented, not yet run against a live database** — this environment has no
network access to install packages or start Postgres. Run
`npx @better-auth/cli generate` after `npm install` and reconcile its output against
`prisma/schema.prisma` (see the note at the top of that file) before your first migration.

## 4. Offline-First Support (low-connectivity field use)
Implemented in `mobile/src/offline/queue.ts`:
- **Order submissions** queue to AsyncStorage on a network failure and flush automatically
  (in order, one at a time) on reconnect — see `OrderCollectionScreen`.
- **GPS pings** queue too, but only the latest point per route is kept (no replaying 100
  stale points after being offline for 10 minutes); they flush via a plain HTTP endpoint
  (`POST /agents/ping`) rather than the socket, since the socket may still be reconnecting.
- Invoice generation is idempotent (`invoices.generate` upserts on `orderId`), so retries
  after a dropped connection are safe.
- **Known gap**: an order queued offline has no server-side id yet, so the agent can't be
  taken straight into the delivery/invoice flow for it until it syncs — see the mobile README.

## 5. MVP Workflow (unchanged from original vision)
```
Business Owner → Create Workspace → Add Products → Register Customers → Add Agents
→ Create Delivery Routes → Assign Agent → Agent Receives Route → GPS Tracking Starts
→ Customer Visit → Collect Order → Deliver Product → Generate Invoice
→ Collect Payment → Complete Route
```

## 6. Data Model
See `backend/prisma/schema.prisma`. Two halves:
- **Better Auth core tables**: `User`, `Session`, `Account`, `Verification`,
  `Organization`, `Member`, `Invitation`.
- **Simuni domain tables**: `AgentProfile`, `Customer`, `Product`, `Route` (+ `RouteStop`),
  `Order` (+ `OrderItem`), `Delivery`, `Invoice` (+ `pdfUrl`/`pdfObjectKey`), `GpsLog`.

## 7. API Surface
See `backend/README.md` for the full module map. Base path: `/api/v1`. Auth routes are
mounted by Better Auth at `/api/v1/auth/*` and excluded from the rest of the app's
workspace-scoping middleware.

## 8. Real-Time GPS Tracking
- Agent app streams location over a Socket.IO namespace (`/gps`) while a route is
  `IN_PROGRESS`, falling back to the offline queue when disconnected (see §4).
- Each ping is persisted to `GpsLog` and updates `AgentProfile.lastLat/lastLng`.
- Manager dashboard joins a `workspace:{id}` room and receives `location:broadcast` events
  to move pins on a MapLibre/react-native-maps map in real time.

## 9. Turn-by-Turn Navigation (OSRM)
- `backend/src/routing/routing.service.ts` calls a self-hosted OSRM instance for
  driving directions (`GET /routes/:id/directions`) and stop-order optimization
  (`POST /routes/:id/optimize`).
- Degrades gracefully: if OSRM isn't reachable, both return a clear 400 instead of crashing
  the request.
- Wired into `mobile/RouteDetailScreen`: a green polyline + next-turn banner refresh
  automatically while a route is `IN_PROGRESS`, and simply don't appear if OSRM isn't running.

## 10. E-Invoicing
- Invoice total is a **snapshot** of order line-item prices at generation time.
- A PDF is rendered with `pdfkit` and uploaded to MinIO automatically when an invoice is
  generated (`backend/src/invoices/invoice-pdf.service.ts` + `storage/storage.service.ts`).
  If MinIO isn't reachable, the invoice record still gets created; only the PDF step is
  skipped (logged as a warning), and can be retried via `POST /invoices/:id/pdf/regenerate`.
- `paymentStatus` moves `UNPAID → PARTIAL → PAID` as cash/mobile-money payments come in.
- MinIO signed URLs expire — `POST /invoices/:id/pdf/refresh-url` reissues one.

## 11. Collect Payment (telebirr)
- `POST /invoices/:id/pay/telebirr` creates a `Payment` record and returns a checkout URL
  (Ethio Telecom's telebirr "Fabric" H5/Web Payment Gateway). The mobile app opens it with
  `Linking.openURL`; telebirr hands off to its native app if installed.
- `POST /payments/telebirr/notify` (public webhook) is the source of truth for whether an
  invoice actually got paid — verified via RSA signature, idempotent against retries.
- `GET /payments/telebirr/return` renders a plain confirmation page for the customer's
  browser; it is **not** relied on as authoritative, since redirects are unreliable across
  app-switching on mobile.
- **Grounding**: base URLs and which RSA scheme (PSS vs. PKCS1) signs which part were
  cross-confirmed across multiple independent public SDKs. The exact pre-order request/response
  JSON shape and notify payload shape are **not** verified against an official spec (it sits
  behind Ethio Telecom's merchant login) — see the comment block in
  `backend/src/payments/telebirr.service.ts` for exactly what to double-check once you have
  real merchant docs.
- The standalone web demo simulates this flow client-side (phone + PIN, fake processing
  delay) since it has no backend to call telebirr through.

## 12. Customer Ordering via Telegram
Motivation: many first-time smartphone users in Ethiopia are reluctant to install a new,
unfamiliar app, but almost universally already have Telegram installed. Rather than making
app adoption a precondition for the whole product, customer ordering is also available
through a Telegram bot (`backend/src/telegram/telegram.service.ts`), with **no separate
customer app** required at all for this MVP phase.

- A business shares a deep link (`GET /workspace/telegram-link` returns it) —
  `t.me/<bot>?start=<workspace-slug>` — on a flyer, a sticker on the delivery crate, a
  WhatsApp broadcast, etc.
- First-time chat: register name + phone once (typed or shared as a Telegram contact).
- Ordering: an inline-button product menu → cart → checkout, entirely inside the chat.
- The resulting `Order` is identical in shape to an agent-collected one
  (`source: 'TELEGRAM'`, `agentId: null` until a field agent claims it via
  `GET /orders/unclaimed` → `POST /deliveries/:orderId/start`) — delivery, invoicing, and
  telebirr payment collection all work unchanged from that point on.
- This is intentionally the *first* self-service channel, not the last — see §13 for what's
  still a flat-out gap (browsing past orders/invoices from the bot, staff notifications, a
  fuller web/app customer portal).

## 13. Non-Goals for MVP
- No inventory/warehouse management (only a flat product catalog + price).
- No automatic route planning beyond OSRM's "optimize stop order for what's already on this
  route" — no cross-route territory optimization.
- No richer customer self-service beyond ordering (no "view my past orders/invoices" from
  the Telegram bot yet, no separate customer web portal).
- No multi-currency support beyond ETB at launch.
- No other payment providers (bank transfer, CBE Birr, cards) — telebirr only, for now.

## 14. What's Implemented vs. What's Left
| Area | Status |
|---|---|
| Workspace, agents, customers, products, routes, orders, deliveries, invoices | ✅ Full CRUD + workflow logic |
| Better Auth (identity, sessions, multi-tenancy, phone login) | ✅ Implemented, unexecuted (no network in dev sandbox) |
| OSRM turn-by-turn directions + stop optimization | ✅ Implemented end-to-end, incl. mobile polyline/banner |
| MinIO + PDF invoice generation | ✅ Implemented, unexecuted |
| Mobile offline queue (orders + GPS) | ✅ Implemented, unexecuted |
| telebirr payment collection | ✅ Backend + mobile implemented, unexecuted; ⚠️ pre-order/notify JSON shape unverified against official docs |
| Custom (one-off) products during order collection | ✅ Implemented (web + mobile) |
| Telegram ordering bot (no app install) | ✅ Implemented, unexecuted; known limits: one workspace per Telegram account, in-memory session, no staff notify yet |
| Web MVP demo (`Simuni_MVP_App.html`) | ✅ Fully working, runs standalone in-browser (in-memory only, no backend) — does not simulate Telegram |
| Fuller customer self-service portal (order history, reorder) | ⬜ Not started |
| Automated tests | ⬜ Not started |
