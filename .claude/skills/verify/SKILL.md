---
name: verify
description: Prove a frontend change works. Run the check commands and confirm the stories/docs/translation obligations before considering any code change complete.
---

# Verify

Model-invoked (also `/verify`). This is NOT auto-guaranteed — a hook could force the mechanical checks but cannot judge whether a story or doc is meaningful, so run this checklist yourself and paste proof per item.

## 1. Checks (from repo root — `--prefix` targets the frontend package)

- Format:      `npm --prefix projects/app run prettier:check`
- Lint (TS):   `npm --prefix projects/app run lint`        # check-only, no --fix
- Lint (SCSS): `npm --prefix projects/app run style-lint`  # check-only
- Tests:       `npm --prefix projects/app run test`        # Jest, helpers-first

## 2. Obligations for changed code

- Every changed component under `modules/ui/components/**` has a sibling `*.stories.ts`.
- Every changed basic UI component is reflected in `ui_components.md` (read the whole section — prose, input/output tables, usage notes).
- Every user-facing string uses a translation key in `en.json`.

## Rules

- Fix only files you touched. If `prettier:check` fails, format touched files: `npx prettier --write <path>`.
- Lint/style-lint have no autofix — resolve flagged issues by hand.
- Types are checked by test and build; there is no standalone typecheck script.
- Never edit generated code (`src/lib/common/api/enerqi/**`), `android/**`, `ios/**`.

Definition of Done: @.documentation/conventions.md
Testing philosophy: @.documentation/testing.md

Do not claim success — paste the command output and confirm each obligation.
