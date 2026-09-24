# Contributing — EV Rental GO — Web Backoffice

For AI agents: read `AGENTS.md` first. This file is for human contributors.

## Setup

```bash
docker compose up -d       # Postgres/TimescaleDB + Redis + Mosquitto
pnpm install
cp .env.example .env.local # fill in real values
pnpm db:push                # sync schema to your local DB
pnpm db:seed                 # seed dev data
pnpm dev                     # http://localhost:3000 (custom server.ts, not `next dev`)
```

Running the E2E suite needs a separate, isolated test DB/Redis index (configured via `.env.test`):

```bash
pnpm db:push:test
pnpm db:seed:test
pnpm test:e2e
```

## Everyday commands

```bash
pnpm verify        # typecheck -> lint -> build -> test — the one command that decides pass/fail
pnpm test          # unit tests only (Vitest)
pnpm test:e2e      # E2E only (Playwright) — excludes the @gateway suite
pnpm test:e2e:gateway  # needs the ev-rental-iot-gateway repo checked out as a sibling directory
pnpm sonar         # run locally yourself when you want a SonarQube pass — AI must not run this
```

`node .claude/gate.js` runs the same checks as the pre-push hook (`verify` + `audit` + `secrets` +
`check-config` + `docs-lint`) — run it yourself if you want to know before pushing whether it will pass.

## Branching and commits

- Feature work: `feature/<short-description>` · Bug fixes: `fix/<short-description>` or `hotfix/<short-description>`
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, …)
- **Never push directly to `main`** — open a PR; a human merges after the gate passes (enforced by a
  pre-push hook — force-pushing or `--no-verify` to skip it defeats the point, don't)
- On a `fix/`/`hotfix/` branch, test files are protected from edits (the failing test is the evidence the
  bug exists) — if a test genuinely needs to change, say so explicitly in the PR

## Working with AI agents on this repo

This project uses [Buaflow](https://github.com/Khattiya01/buaflow) (via the Claude Code plugin) for the
`intent -> spec -> plan -> code -> verify -> check -> PR -> done` workflow. If you're using Claude Code,
`AGENTS.md` + `CLAUDE.md` + `.claude/rules/` already carry the project-specific context — you generally
don't need to repeat it in your prompt.

## Review

See `REVIEW.md` for what every review pass checks and what severity blocks a merge. Short version:
correctness and security always block; project-standard deviations should be answered (fixed or ticketed);
opinions/alternatives never block, and are capped at 5 per review.

## Data model changes

`db/schema/*.ts` (Drizzle) is the single source of truth. Use `pnpm db:push` for local/dev only — schema
changes headed to a shared or production database go through `pnpm db:generate` + review of the generated
SQL + `pnpm db:migrate` (see `docs/intents/I-004-reviewable-db-migrations.md` for the plan to make this the
default everywhere, and `.claude/rules/db-migration.md` for the expand/contract rule on destructive changes).
