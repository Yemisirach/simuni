# Simuni Backend (NestJS)

Multi-tenant API for the Simuni field sales / GPS route tracking / delivery / e-invoice platform.

## Stack
- NestJS + TypeScript
- PostgreSQL + PostGIS via Prisma
- **Better Auth** for identity, sessions, and multi-tenancy (organizations = workspaces)
- Socket.IO for real-time GPS tracking (+ HTTP fallback for offline mobile clients)
- **OSRM** for turn-by-turn directions and stop-order optimization
- **MinIO** + **pdfkit** for generated invoice PDFs

## Setup
```bash
cp .env.example .env              # fill in DATABASE_URL, BETTER_AUTH_SECRET, etc.
npm install
docker compose up -d postgres redis minio   # OSRM is optional, see docker-compose.yml
npx prisma migrate dev --name init
npx @better-auth/cli generate     # reconcile prisma/schema.prisma against your installed
                                   # better-auth version — see the note at the top of that file
npm run prisma:seed
npm run start:dev
```

API base URL: `http://localhost:3000/api/v1`

## Authentication

Identity and multi-tenancy are handled by **Better Auth**, not hand-rolled JWT:

- `POST /api/v1/workspace/register` (public) — the one custom endpoint: creates a new
  business's first user + workspace in one call ("Create Simuni Workspace" in the main flow).
- `POST /api/v1/auth/sign-in/username` — login with `{ username: phone, password }`.
  Returns a bearer token in the `set-auth-token` response header (mobile clients don't use
  cookies — see the `bearer()` plugin in `src/auth/better-auth.instance.ts`).
- Every other route requires `Authorization: Bearer <token>` and is automatically scoped to
  the caller's workspace by `WorkspaceContextGuard` (see `src/auth/guards/`).
- OWNER / MANAGER / AGENT map onto Better Auth's organization roles owner / admin / member
  (see `src/auth/roles.ts`).

**Not executed against a live database in this environment** (no network access here) —
treat the Better Auth wiring as a strong, carefully-researched starting point, not a
guarantee. Run `npx @better-auth/cli generate` after install and diff its output against
`prisma/schema.prisma` before your first migration.

## Module map
| Module | Responsibility |
|---|---|
| `auth` | Better Auth instance + workspace registration |
| `workspace` | Settings, daily dashboard |
| `users` | Invite managers/agents (via Better Auth), list, suspend (ban) |
| `agents` | Fleet view, live status, vehicle info, HTTP GPS ping fallback |
| `customers` | CRUD + order/payment history + Telegram-linked lookup |
| `products` | Catalog CRUD |
| `routes` | Create routes, assign agents, stop visits, progress, **OSRM directions + optimize** |
| `routing` | OSRM client (turn-by-turn directions, stop-order optimization) |
| `orders` | Order collection with price snapshotting; agent- **or Telegram-initiated** |
| `deliveries` | Start → arrive → confirm/fail |
| `invoices` | Generate from order, **PDF render + MinIO upload**, payment status |
| `payments` | **telebirr checkout, webhook, payment records** |
| `storage` | MinIO client wrapper |
| `telegram` | **Customer ordering bot — no app install needed** |
| `gps` | Socket.IO gateway (`location:update` → `location:broadcast`) + shared ping recorder |

## Customer ordering via Telegram (no app install needed)
Ethiopian customers who are wary of installing a new app can order entirely through
Telegram, which they almost certainly already have:

1. Set `TELEGRAM_BOT_TOKEN` (create a bot via [@BotFather](https://t.me/BotFather)) and
   `TELEGRAM_BOT_USERNAME` in `.env`.
2. `GET /workspace/telegram-link` (authenticated) returns the shareable ordering link for
   that workspace, e.g. `https://t.me/SimuniOrderBot?start=top-beverage` — put this on a
   flyer, a sticker on the delivery crate, a WhatsApp broadcast, wherever customers will see it.
3. A customer taps the link → registers (name + phone, once) → browses the product catalog
   as inline buttons → checks out. This creates a normal `Order` (`source: 'TELEGRAM'`,
   `agentId: null`, `status: SUBMITTED`) — everything downstream (delivery, invoice, payment)
   works exactly like an agent-collected order.
4. Field agents see these in `GET /orders/unclaimed` and claim one for delivery by calling
   the normal `POST /deliveries/:orderId/start` — that endpoint sets *who's delivering it*
   independently of who (or what) collected the order.

**Known limitations** (see the comment block at the top of
`src/telegram/telegram.service.ts` for detail): one Telegram account can currently only be a
bot-customer of one workspace at a time; in-progress registration/cart state lives in memory
and resets if the server restarts mid-conversation; there's no staff-side Telegram
notification yet when a new order lands (staff currently need to check the app).

## Turn-by-turn navigation (OSRM)
- `GET /routes/:id/directions?lat=&lng=&stopId=` — directions from the agent's current
  position to a stop (defaults to the next PENDING one). Requires a running OSRM instance
  with an Ethiopia extract loaded (see `docker-compose.yml` for the one-time setup).
- `POST /routes/:id/optimize` with `{ lat, lng }` — re-sequences remaining stops into OSRM's
  suggested visiting order.
- If OSRM isn't reachable, both endpoints return a clear 400 rather than crashing.

## Invoice PDFs (MinIO)
- `InvoicesService.generate()` renders a PDF (`pdfkit`, no headless browser dependency) and
  uploads it to MinIO automatically; `Invoice.pdfUrl` / `pdfObjectKey` store the result.
- `POST /invoices/:id/pdf/regenerate` — re-render after correcting an order.
- `POST /invoices/:id/pdf/refresh-url` — MinIO signed URLs expire; call this for a fresh link.
- If MinIO isn't reachable, invoice generation still succeeds (the domain record is created);
  only the PDF step is skipped, logged as a warning.

## Offline support (mobile)
GPS pings and order submissions from the mobile app can arrive two ways:
1. Live, over Socket.IO (`location:update`) or the normal REST endpoints, when online.
2. Queued on-device and replayed via `POST /agents/ping` (GPS) or `POST /orders` (orders,
   replayed as a normal request) once the phone reconnects — see
   `mobile/src/offline/queue.ts`.

## Payments (telebirr)
- `POST /invoices/:id/pay/telebirr` — starts a checkout; returns `{ checkoutUrl }` to open in a
  browser/WebView (mobile) or redirect to (web). Creates a `Payment` row (PENDING).
- `POST /payments/telebirr/notify` (public) — telebirr's server-to-server webhook. Verifies the
  request signature, then marks the `Payment` SUCCESS/FAILED and — on success — the linked
  `Invoice.paymentStatus` PAID. Idempotent: a retried notify for an already-SUCCESS payment is a no-op.
- `GET /payments/telebirr/return` (public) — plain HTML page the customer's browser lands on
  after completing/cancelling payment. Not relied on as the source of truth (redirects are
  unreliable across app-switching); the notify webhook is authoritative.
- `GET /invoices/:id/payments` — transaction history for an invoice (useful if a first attempt
  expired and the customer paid on a second try).

**Honesty check on this integration**: Ethio Telecom's merchant API docs sit behind a
merchant-onboarding login, so this wasn't built by reading the official spec directly. It's
synthesized from several independent, converging public SDKs that agree on the base URLs and
which RSA signing scheme applies where (see the comment block at the top of
`src/payments/telebirr.service.ts`). What's **not verified**: the exact JSON envelope for the
pre-order request/response, and the notify webhook's exact payload shape — both are clearly
flagged in that file as best-effort, isolated so only that one file needs adjusting once you
have real merchant docs / a Postman collection from Ethio Telecom.

## Demo login
After seeding: phone `0911000001`, password `password123` (OWNER). Field agent: phone
`0911000003`, same password.
