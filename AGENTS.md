<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EV Rental GO — Web Backoffice

<!-- English by design: every AI session loads this file, and Thai tokenizes ~2x more expensively.
     Replies to the user and everything under docs/ stay in Thai (see Language below). -->

> Core rules for every AI agent working in this repo (AGENTS.md standard).
> Claude Code loads this through `CLAUDE.md`, which imports it.
> Keep under ~200 lines. Details live in `docs/` — link, don't paste.
> Test for every line: *"If this line were deleted, would the AI get something wrong?"* If not, delete it.

## Language

- Reply to the user in Thai. Technical terms, identifiers, file names, branch names, commit messages, code, and i18n keys stay in English.
- Everything written into `docs/` (intent, spec, plan, ADR, task) is written in full Thai.
- This file, `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, and `REVIEW.md` are in English because only the AI reads them.

## Scope

This repository is **Web Backoffice only** (Admin & Fleet Management). The Public Website (customer-facing)
and the Maintenance App (tablet PWA) are separate repositories — out of scope. The **IoT Gateway**
(`ev-rental-iot-gateway/`, Node.js + Express) is also a separate repository — never implement MQTT/GPS
ingestion here, only read from Redis (latest position) and PostgreSQL (history, alerts) that it writes.

## What this project is

Internal backoffice for an EV car rental business in Thailand: real-time fleet tracking (GPS/battery via
Redis + TimescaleDB), customer e-KYC approval, rental contracts, billing/invoicing (incl. Stripe/PromptPay),
maintenance queues, and management reports. Target scale: up to 100 vehicles on a 2-server on-premise
deployment (`docs/adr/0006-on-premise-two-server-deployment.md`).

## Stack (verified against the actual code — not aspirational)

- Framework: Next.js 16 (App Router); custom `server.ts` (http + `ws`) instead of `next start` — needed for
  the live-fleet WebSocket (`docs/adr/0001-nextjs-fullstack-monolith.md`)
- Auth: **custom JWT** (`jose`) + httpOnly cookie + `bcryptjs` — **not NextAuth**, despite older docs
  (`docs/adr/0002-custom-jwt-auth.md`)
- UI: **hand-rolled components in `components/ui/`** — **no shadcn/ui, no registry, no CLI**
  (`docs/adr/0003-hand-rolled-ui-components.md`). Adding any UI library needs an intent + ADR first.
- DB/ORM: Drizzle ORM on PostgreSQL + TimescaleDB extension (`db/schema/` is the source of truth)
- i18n: next-intl — **th (default) + en**, one file per locale (`messages/{en,th}.json`), 2-level keys
- Test: Vitest (unit, colocated `*.test.ts`) + Playwright (`e2e/`, plus a separate `@gateway` suite)
- Docker: **dev-time infra only** (Postgres/TimescaleDB, Redis, Mosquitto via `docker-compose.yml`) — the
  app itself is **not containerized**; it runs directly via `pnpm start` / `tsx`

## Commands

```bash
pnpm verify              # typecheck -> lint -> build -> test, short summary, full log in .verify.log
node .claude/gate.js     # verify + audit + secrets + check-config + docs-lint — pre-push runs this
node .claude/board.js    # regenerates docs/backlog/board.md from task/intent files — never hand-edit it
pnpm dev                 # dev server (server.ts, needs the docker stack running)
pnpm build               # production build
pnpm db:push             # sync schema to a LOCAL/dev DB only — never shared/production (see intent I-004)
pnpm db:seed             # seed dev data
docker compose up -d     # Postgres/TimescaleDB + Redis + Mosquitto for local dev and e2e
pnpm sonar               # the user runs this — AI must not
```

**What "passing" looks like** (paste only this when reporting — the full log is in `.verify.log`):

```
verify  ✓ typecheck 2.3s   ✓ lint 7.3s   ✓ build 18.2s   ✓ test 13.9s   [41.7s]
        Tests  89 passed (89)
        all passed
```

## Folder layout

```
app/(auth)/login/           public login page
app/(backoffice)/           protected admin pages (fleet, customers, contracts, billing, maintenance, reports, settings, alerts)
app/api/                    route handlers, one folder per resource; app/api/public/ is unauthenticated
app/register/               public customer self-registration
components/ui/              hand-rolled, reusable UI primitives — team-owned, edit freely
components/{dashboard,charts,maps,layout}/  composite / area-specific components
db/schema/                  Drizzle schema, one file per table — source of truth for the data model
lib/                        auth (session.ts, permissions.ts, dal.ts), business-logic helpers, types.ts
i18n/, messages/            next-intl config and the two locale files
e2e/                        Playwright specs (+ a separate @gateway suite needing the IoT gateway running)
server.ts                   custom http + WebSocket entrypoint (not `next start`)
```

---

## Workflow (always in this order)

```
intent -> spec (large feature) -> plan -> code -> verify -> check -> PR -> done
                                                 (trivial track: task -> code -> check low -> PR)
```

1. **Starting any task** — `/task` reads the board + task file, then summarizes its understanding to the user first. Never start coding immediately.
2. **Before touching code** — more than 3 files / DB / auth / unfamiliar code -> `/plan` in plan mode, commit the plan first.
3. **While working** — one task at a time; small commits; anything out of scope -> stop and ask. Same spot fails twice in a row -> stop, tell the user.
4. **Before claiming done** — actually run `pnpm verify` and paste its summary line. Never claim "passes" without running it.
5. **Finishing** — `/check` -> the user approves -> `/done` opens a PR -> a human merges after the gate passes -> `/clear`.
   The AI never merges into main (hook blocks it) and never hand-edits `board.md`.

## Never

- Hardcoded UI strings — every string goes through i18n, both th and en
- Raw Tailwind palette colors in new code — use the CSS variable tokens in `app/globals.css` (existing files using raw colors are pre-existing, see constitution art. 9.1)
- Installing a UI library — this project hand-rolls `components/ui/` (ADR-0003); needs an intent + ADR first
- Running `pnpm db:push` against a shared or production database (local/dev only — intent I-004)
- Editing test files to make tests pass while fixing a bug
- `git commit --no-verify`
- Running the SonarQube scan yourself
- Working outside the task scope without asking
- Reporting "passes" without actually running it
- `git merge` / `git push` into main — open a PR for a human
- Hand-editing `docs/backlog/board.md`

## Backend (`app/api/**`)

- **Write unit tests together with the module, always**
- New endpoints: validate input with a real `zod` schema — existing endpoints validate by hand, that's
  pre-existing, don't refactor it as a side effect (constitution art. 9.1, intent I-001)
- Errors: `NextResponse.json({ error }, { status })` — never leak stack traces
- Authorize on the server via `getCurrentUser()` + `requirePermission()`, always
- No OpenAPI/Postman in this repo yet (intent I-002) — new endpoints should start `docs/api/openapi.json`

## Frontend (`components/`, `app/**/*.tsx`)

- **Before creating a component, always ask**: exists in `components/ui/` (or the matching `dashboard/`/`charts/`/`maps/`/`layout/`)? -> composable from existing primitives? -> is there a design? -> **none -> stop and ask before designing your own**
- No `cva`/`clsx`/`cn()` in this project — follow the existing variant-map + template-literal pattern (`components/ui/badge.tsx`)
- Data fetching: `useEffect` + `fetch` is the existing convention (baselined against a stricter lint rule — constitution art. 9.1, intent I-003); don't invent a different pattern for one page
- Cover every state: loading / empty / error / unauthorized
- Test th/en, light/dark, ~390px

## When the plan changes

Update the source document first (intent / spec / plan / ADR / task file), then the code. Never let code and docs disagree.

## When unsure

Ask, don't guess — write `[NEEDS CLARIFICATION: <question>]` in the document instead of filling in a plausible value.

---

## Things the AI gets wrong in this project

<!-- Rule: the 2nd time the same mistake happens -> add it here immediately -->

- Assumed `.next-test/` (the test-env build output) was covered by the default eslint ignores like `.next/` -> it isn't; `eslint.config.mjs` needs it listed explicitly, same for `.claude/` (kit tooling)
- Assumed a file named `drizzle.config.test.ts` is a Vitest test because of the `.test.ts` suffix -> it's a Drizzle config for the test DB; `vitest.config.ts` excludes it explicitly
- Assumed this repo uses shadcn/ui because an older agent doc said so -> it's 100% hand-rolled (`docs/adr/0003-hand-rolled-ui-components.md`); always check `components/ui/` for a real `components.json` before believing a doc

> If this list grows past ~10 items, promote some to a path-scoped rule or a hook.

## Reference docs

| Topic | File |
|---|---|
| Project constitution (non-negotiable principles) | `docs/constitution.md` |
| Codebase inventory (EXTEND mode — no Phase 1-6 architecture doc) | `docs/planning/A1-inventory.md` |
| Data model (source of truth) | `db/schema/*.ts` |
| Architecture decisions | `docs/adr/` |
| Review policy | `REVIEW.md` |
| Backlog | `docs/backlog/board.md` |
| Open ideas not yet decided | `docs/intents/` — see `I-007` (critical security fix pending decision) |
