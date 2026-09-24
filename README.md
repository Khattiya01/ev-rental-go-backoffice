# EV Rental GO — Web Backoffice

Internal backoffice for an EV car rental business in Thailand: real-time fleet tracking, customer e-KYC,
rental contracts, billing/invoicing (incl. Stripe/PromptPay), maintenance queues, and management reports.
See `AGENTS.md` for the full stack/conventions and `docs/constitution.md` for the non-negotiable rules.

## Getting Started

```bash
docker compose up -d   # Postgres/TimescaleDB + Redis + Mosquitto
pnpm install
pnpm dev                # http://localhost:3000
```

`pnpm dev` runs the custom `server.ts` entrypoint (http + WebSocket), not plain `next dev` — needed for the
live-fleet map. Copy `.env.example` to `.env.local` and fill in real values first.

## Stack

Next.js 16 (App Router) · TypeScript · Drizzle ORM on PostgreSQL + TimescaleDB · custom JWT auth (`jose`,
not NextAuth) · hand-rolled UI in `components/ui/` (no shadcn/ui) · next-intl (th default + en) · Vitest +
Playwright. Why each choice: `docs/adr/`.

## Folder layout

```
app/(auth)/, app/(backoffice)/   pages (public login / protected admin area)
app/api/                          route handlers
components/ui/                    hand-rolled, reusable UI primitives
db/schema/                        Drizzle schema (source of truth for the data model)
lib/                              auth, business logic, shared types
e2e/                               Playwright specs
server.ts                         custom http + WebSocket entrypoint
```

## Key docs

| What | Where |
|---|---|
| AI/contributor rules | `AGENTS.md` |
| Non-negotiable principles | `docs/constitution.md` |
| Why things are built this way | `docs/adr/` |
| Codebase inventory | `docs/planning/A1-inventory.md` |
| Review policy | `REVIEW.md` |
| Open ideas not yet decided | `docs/intents/` |

## Testing

Three layers: **Unit** (Vitest), **E2E** (Playwright), and **Integration** (Postman collection, not in this repo — see `planings/TESTING_PLAN.md` for the full strategy and current coverage status).

### Prerequisites

Both the E2E suites and local dev need the docker stack (Postgres/TimescaleDB + Redis + Mosquitto) running:

```bash
docker compose up -d
```

E2E tests use an isolated database/Redis index (`ev_rental_go_test`, Redis logical db `1`) so they can freely truncate/reseed without touching dev data — configured via `.env.test`. The dedicated test DB schema needs to exist before the first run:

```bash
pnpm db:push:test
```

### Unit tests (Vitest)

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

Covers pure logic and anything with an injectable/mockable dependency (permissions, session/JWT, geofence math, cron period calculations, etc.) — see `planings/TESTING_PLAN.md` §2 for the full module list and rationale.

### E2E tests (Playwright)

```bash
pnpm test:e2e       # full suite, headless
pnpm test:e2e:ui    # Playwright UI mode (debugging)
```

This boots the app against `.env.test` on port `3100` automatically (`playwright.config.ts` → `webServer`), reseeds the test DB before the run, and exercises real browser flows (auth, RBAC visibility, CRUD, alerts, etc.). No IoT Gateway required for this suite.

#### Gateway full-chain suite (`@gateway`)

A separate suite drives real MQTT messages through the actual `ev-rental-iot-gateway` process (battery alerts, offline detection, MQTT ACL enforcement) and checks the results land in the same test DB/Redis this app reads from. It's kept out of the default `pnpm test:e2e` run since it needs the sibling gateway repo and is the most environment-sensitive suite — run it explicitly:

```bash
pnpm test:e2e:gateway
```

Requires:
- The docker stack from above (Postgres, Redis, **and** Mosquitto)
- The `ev-rental-iot-gateway` repo checked out as a sibling directory (`../ev-rental-iot-gateway`) with its own `.env.test` configured to point at the same `ev_rental_go_test` DB / Redis db `1`
- Two MQTT vehicle credentials provisioned in `mosquitto/passwd` (see `planings/TESTING_PLAN.md` §6 progress log for how these were set up)

Playwright manages both webServers (this app on `3100`, the gateway on `3101`) automatically — same `reuseExistingServer` behavior as the main suite.

## Deployment

This app deploys on-premise on 2 servers (App Server: this app + IoT Gateway + Mosquitto; Data Server:
PostgreSQL/TimescaleDB + Redis) — **not Vercel, not containerized** (no Dockerfile for the app itself;
Docker here is dev-time infra only). See `docs/adr/0006-on-premise-two-server-deployment.md` for why.
