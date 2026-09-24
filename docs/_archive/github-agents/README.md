# Archived — pre-Buaflow agent-role workflow

These `.agent.md` files defined a custom multi-agent orchestration workflow (Product Owner never writes code,
always delegates to Planner / Architect / Frontend-Implementer / Backend-Implementer / 4 reviewer roles).
They were imported into the repo root `CLAUDE.md` via `@.github/agents/<name>.agent.md` before this project
adopted Buaflow.

**Archived, not deleted, on 2026-09-24** — see `docs/adr/0008-buaflow-as-primary-ai-workflow.md` for why.
Buaflow's own skill/subagent model (`/intent`, `/spec`, `/plan`, `/task`, `/check`, `/done`, plus
`buaflow:code-reviewer`, `buaflow:legacy-explorer`, `buaflow:test-writer`) is the workflow now in effect.

If a future session wants to revive any part of this (e.g. a stricter human-approval gate before code changes),
open an intent first — don't just re-import these files into `CLAUDE.md`.
