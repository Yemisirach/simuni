# Simuni

Multi-tenant Field Sales, GPS Route Tracking, Order Collection, Delivery & E-Invoice SaaS
for Ethiopian businesses.

> "Simuni helps businesses manage field agents, customer orders, delivery routes, and
> payments from one simple platform."

## What's in this project

```
simuni/
├── web-demo.html   Standalone, in-browser click-through MVP demo (no setup, no backend)
├── backend/        NestJS API — Better Auth, workspaces, routes, orders, deliveries, invoices, GPS
├── mobile/         React Native / Expo field-agent app
├── docs/           Product spec + pitch deck
```

| Folder | What it is | Start here |
|---|---|---|
| `web-demo.html` | Open directly in a browser — click through the entire workflow with in-memory demo data | — |
| `backend/` | NestJS + Prisma + PostgreSQL/PostGIS + Better Auth + Socket.IO + OSRM + MinIO | `backend/README.md` |
| `mobile/` | Expo app for field agents (routes, orders, delivery, invoices, offline queue) | `mobile/README.md` |
| `docs/Simuni_Product_Spec.md` | Refined product spec: roles, auth, data model, API map, implementation status | — |
| `docs/Simuni_Pitch_Deck.pptx` | 10-slide pitch deck | — |

## Quick start

**0. Just want to click through it?** Open `web-demo.html` in any browser. No install, no
backend, no database — it's a self-contained demo with in-memory state (resets on reload).

**1. Real backend**
```bash
cd backend
cp .env.example .env   # set DATABASE_URL, BETTER_AUTH_SECRET, MinIO/OSRM settings
npm install
docker compose up -d postgres redis minio   # OSRM is optional, see backend/docker-compose.yml
npx prisma migrate dev --name init
npx @better-auth/cli generate   # reconcile schema.prisma against your installed version
npm run prisma:seed
npm run start:dev
```

**2. Mobile app**
```bash
cd mobile
npm install
npx expo start
```
Update `API_BASE_URL` in `mobile/src/api/client.ts` to point at your backend.

**Demo login** (after seeding): phone `0911000003` (field agent), password `password123`.
No workspace slug needed at login — it's resolved from the account automatically.

## Workflow this system implements

```
Business Owner → Create Workspace → Add Products → Register Customers → Add Agents
→ Create Delivery Routes → Assign Agent → Agent Receives Route → GPS Tracking Starts
→ Customer Visit → Collect Order → Deliver Product → Generate Invoice
→ Collect Payment → Complete Route
```

## Status

| Piece | Status |
|---|---|
| Data model, API endpoints, mobile screens for the full workflow | ✅ Implemented |
| Better Auth (phone login, sessions, multi-tenant workspaces) | ✅ Implemented |
| OSRM turn-by-turn directions + stop-order optimization | ✅ Implemented end-to-end (backend + mobile polyline/banner) |
| MinIO + PDF invoice generation | ✅ Implemented |
| Mobile offline queue (orders + GPS pings) | ✅ Implemented |
| telebirr payment collection | ✅ Implemented (backend + mobile); ⚠️ pre-order/notify JSON shape best-effort, see docs |
| Telegram ordering bot (no customer app install needed) | ✅ Implemented — see backend/README.md |
| Standalone web demo | ✅ Fully working, in-browser, no backend (does not simulate Telegram) |

**Important:** this sandbox has no network access, so nothing above has been executed
against a real Postgres/MinIO/OSRM instance or a real `npm install` — it's been carefully
researched and internally consistent (imports cross-checked against `package.json`,
current library APIs verified via search rather than assumed), but you should treat it as
a strong starting point to run and debug on your own machine, not a guarantee. See
`docs/Simuni_Product_Spec.md` §12 for the full honest breakdown.
