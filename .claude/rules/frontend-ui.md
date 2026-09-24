---
paths:
  - "**/components/**/*.{tsx,jsx}"
  - "**/app/**/*.{tsx,jsx}"
---

# UI rules (auto-loaded when touching component files)

> This project hand-rolls every component in `components/ui/` — there is **no shadcn/ui, no registry, no CLI**
> (see ADR-0003 in `docs/adr/`). `components/ui/` is team-owned source, not generated output: edit it freely.
> There is also no separate `components/shared/` tier — `components/ui/` **is** the shared layer.

## Before creating a new component — ask in this order, never skip

1. Already in `components/ui/` (or `components/dashboard/`, `components/charts/`, `components/maps/`, `components/layout/` for their respective areas)? → **add a prop/variant to the existing one; never copy it into a version 2**
2. Composable from existing primitives in `components/ui/`?
3. Is there a design (image / HTML / legacy project)?
4. None of the above → **stop and ask the user before designing your own** — offer text (2 options) or canvas (claude.ai/design); canvas needs `docs/design/brief.md` first

## Forbidden

| Never | Instead |
|---|---|
| Hardcoded strings | i18n keys, complete for th + en |
| Raw hex / `bg-blue-600` | CSS variable tokens already defined in `app/globals.css` (`--color-*`) |
| `style={{...}}` with constants | Tailwind classes bound to the tokens above |
| Installing a UI library (shadcn/ui, MUI, Radix, etc.) | this project hand-rolls `components/ui/` (ADR-0003) — adding a library needs an intent + ADR first |
| One page importing another page's one-off component | promote it into `components/ui/` (or the matching `dashboard/`/`charts/`/`maps/`/`layout/` folder) once it's used ≥ 2 places |

## While writing

- Server Component by default; put the client directive at the smallest boundary
- **No `cva` / `clsx` / `cn()` in this project** — neither is a dependency. The existing convention is a
  `const variantStyles: Record<Variant, string>` map keyed by variant, applied with a plain template literal
  (see `components/ui/badge.tsx`). Follow that pattern, don't introduce a new one.
- Always accept an optional `className` prop and append it at the end of the template literal
- **No data fetching inside a component meant to be reused across pages** — receive via props
- Cover every relevant state: loading / empty / error / disabled / unauthorized

## Shared or not — decide every time

- Used in ≥ 2 places, or a pattern that repeats → put it straight in `components/ui/` (or the matching
  `dashboard/`/`charts/`/`maps/`/`layout/` folder) — there is no separate `shared/` tier to promote into
- Not yet clear how it would be reused → **don't promote yet**; premature abstraction is worse than duplicating twice
- No `docs/design/components.md` registry exists yet in this project — if this becomes hard to track, raise it
  as an intent rather than starting one silently

## DoD: Frontend (this is the DoD for this work type — `/check` reports **only failing items**)

In addition to the core DoD in `docs/standards/definition-of-done.md`:
- [ ] Answered the component questions above before building
- [ ] No hardcoded strings — i18n complete for th + en (including placeholders, aria-labels, errors, toasts, empty states)
- [ ] New code uses the CSS variable tokens in `app/globals.css`, not raw Tailwind palette colors (existing files that already use raw colors are pre-existing — see constitution art. 9.1, don't refactor them as a side effect)
- [ ] All states covered: loading / empty / error / unauthorized / success
- [ ] Actually tested at ~390px, light + dark, and switching th/en does not break the layout
- [ ] Has a design → pixel diff vs the baseline leaves only the agreed `deviation` rows, and the canvas was updated to match the code
- [ ] a11y: labels complete, Tab order works, focus visible, contrast passes
- [ ] `T-xxx-test` task created (blocked until the UI is done — `docs-lint --release` refuses to release while it is open)

**DoD for the `-test` task:** test user-visible behavior, not implementation · cover render / main interaction / error / empty · accessible queries (`getByRole`) · passes in both languages · coverage at target

Full detail: `docs/standards/ui-component-rules.md`
