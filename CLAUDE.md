@AGENTS.md

# Claude Code — EV Rental GO — Web Backoffice

<!-- English by design — AI reads this every session (see Language in AGENTS.md) -->

> All core rules are in `AGENTS.md` (imported above — never remove the first line).
> This file holds only Claude Code-specific things. **Do not duplicate rules here.**
>
> This repo previously imported a delegate-only multi-agent workflow from `.github/agents/*.agent.md`
> (Product Owner never writes code). That workflow is **archived** in `docs/_archive/github-agents/` —
> Buaflow is the workflow now (`docs/adr/0008-buaflow-as-primary-ai-workflow.md`).

## Skills in this project

```
/intent  <topic>    Open new work — capture "why" before "what"
/spec    <F-xx>     Spec a large feature (requirements -> design -> tasks)
/plan    <T-xxx>    Plan before touching code; commits plan.md first
/task    [T-xxx]    Pick a task from the board and work it
/ui      <name>     Start a UI component (always asks first)
/check   [T-xxx]    Check the work: verify + compare to plan + /code-review + /security-review
/done    <T-xxx>    Open a PR + update the task file + regenerate the board (never merges)
/hotfix  <symptom>  Production hotfix procedure
/release <env> <M>  Release to uat / prd (runs gate --release first)
```

**Built-ins used alongside:** `/code-review [level]` `/security-review` `/simplify` (called from `/check`) ·
`/doctor` `/insights` `/context` `/usage` (Phase 8) · `/rewind` when heading the wrong way

## Rules loaded automatically by file path

Files in `.claude/rules/` enter context on their own when Claude reads a file matching their `paths:`.
No need to ask for them, and they cost nothing when not relevant. (Verified against the real folder
structure in Phase A.5 — every pattern below actually matches files in this repo.)

| File | Loads when touching |
|---|---|
| `frontend-ui.md` | `components/**/*.{tsx,jsx}`, `app/**/*.{tsx,jsx}` |
| `backend-api.md` | `**/api/**/*.ts` (i.e. `app/api/**`) |
| `i18n.md` | `**/*.{tsx,jsx}`, `messages/**/*.json`, `i18n/**` |
| `db-migration.md` | `**/migrations/**`, `db/schema/**/*.ts` |
| `testing.md` | `**/*.spec.{ts,tsx}`, `**/*.test.{ts,tsx}`, `e2e/**` |
| `docs-sync.md` | `docs/**/*.md`, `*.md` |

## Active hooks (enforced — cannot be talked around)

| When | What |
|---|---|
| Session start | Injects board status + in-progress tasks into context |
| Editing a file in `.claude/stack.json`'s `protected` list (`pnpm-lock.yaml`, `**/*.generated.*`, `docs/backlog/board.md`) | **Blocked** |
| Editing a test file while on a `fix/`/`hotfix/` branch | **Blocked** (prevents fixing the test instead of the bug) |
| Writing a new component under `components/**` (not `ui/`) with raw hex/arbitrary colors | **Blocked** — currently a soft check: `docs/design/components.md` doesn't exist yet in this repo, so this hook mostly passes through until that registry is started |
| `git commit --no-verify`, `pnpm sonar` / `sonar-scanner` | **Blocked** |
| `git merge` / `git push` into main, `push --force` to main, `push --no-verify` | **Blocked** — open a PR for a human |
| Editing `docs/backlog/board.md` | **Blocked** — generated from task files |
| After editing a file | format + lint that file only (this repo: eslint via `eslint.config.mjs`) |
| `git push` | Runs `.git/hooks/pre-push` -> `node .claude/gate.js` (no husky here; `ciMode: local-only` — this is the only enforcement layer, there is no hosted CI yet, see intent tracked for CI setup) |

If a hook blocks you and you believe this is a legitimate exception -> **tell the user what blocked you and why. Do not look for a workaround.**

## Context management

- **After `/done`, always `/clear`** before the next task
- One task at a time — unrelated work gets a `/clear` first
- Read `plan.md` alone during implementation/check — do not re-read spec / constitution / DoD (already distilled)
- Paste the **summary line** of `pnpm verify`, not the full log (`.verify.log` has the rest)
- **Same spot fails twice in a row -> stop, `/clear`, restart with a sharper prompt**
- Work that reads many files (exploring old code, hunting a pattern across the repo) -> use a subagent, not the main context
- Every time the user has to repeat the same correction a 2nd time -> add it to `AGENTS.md` under "Things the AI gets wrong in this project"

## Reply style (fewer output tokens without losing clarity)

- No preamble, no restating the question, no recap of what was just done, no narrating tool calls
- Bullets / short tables — prose only where a reason needs explaining
- Don't paste logs/diffs the user can see themselves (verify -> summary line; diff -> in the PR)
- **Three cases that must be written in full:** security warnings · confirmation of irreversible actions (merge / migration / delete) · multi-step sequences where order matters
- Code, commit messages, PRs, error messages are always verbatim — never abbreviated
- **Artifact files (intent / spec / plan / ADR / task) are always written in full Thai** — terse style applies to chat replies only

## Subagents

| Agent | Use when |
|---|---|
| `buaflow:code-reviewer` (sonnet) | Checks what the built-ins cannot know: matches the plan / project rules (called by `/check`, given plan + diff only) |
| `buaflow:test-writer` (sonnet) | Writing tests that need reading a lot of existing code but produce few files |
| `buaflow:legacy-explorer` (haiku) | Digging through old/unfamiliar code in this repo — keeps the main context small |

General search uses the built-in `Explore`; no need to write your own.
