---
paths:
  - "**/api/**/*.ts"
---

# Backend / API rules (auto-loaded when touching server-side files)

> Existing routes mostly validate input by hand (type coercion + guard checks) even though `zod` is a
> dependency — that's the current state, not a bug to fix as a side effect (constitution art. 9 / 9.1).
> **New** endpoints should validate with `zod` from the start.

## Every endpoint needs all five

1. **Validate every input** — body, query, params, headers you use. New endpoints: use a `zod` schema.
   Allowlist, not blocklist. Cap payload size and string length.
2. **Authorize on the server** — hiding a button in the UI is not security.
3. **Check record ownership, not just role** — prevents IDOR (change the id in the URL and see someone else's data).
4. **Errors use the shared envelope** with a `code` the frontend maps to an i18n key.
   Never send raw messages or stack traces.
5. **Unit tests are written together with the module** — not deferred, not a separate task — including error paths.

## Never

- Return ORM objects directly → select only the fields you need (prevents password hashes leaking)
- Non-parameterized raw queries
- Log sensitive data: passwords, tokens, cookies, card numbers, PII
- Hardcoded secrets or config → must come from env
- User-controlled queries without pagination + a max limit

## Every time an API changes

- [ ] **This repo has no OpenAPI spec and no Postman collection yet** (constitution art. 6) — new endpoints
      should start one at `docs/api/openapi.json`; don't invent a Postman collection nobody asked for
- [ ] Add/extend E2E coverage in `e2e/*.spec.ts` for the changed behavior instead
- [ ] Breaking change → stop and discuss versioning first

## DoD: Backend (this is the DoD for this work type — `/check` reports **only failing items**, never the whole list)

In addition to the core DoD in `docs/standards/definition-of-done.md`:
- [ ] All five items above hold for every endpoint touched
- [ ] Unit tests included, covering error paths and "unauthorized role is rejected"
- [ ] Coverage of touched files not below target / overall coverage not lower
- [ ] Checked for N+1 queries or missing indexes
- [ ] OpenAPI started/updated at `docs/api/openapi.json` (if the API changed) — see note above
- [ ] Touches the DB → see the DoD in `db-migration.md`

Full detail: `docs/standards/security-checklist.md`, `docs/standards/testing-and-coverage.md`
