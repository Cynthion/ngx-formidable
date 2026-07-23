---
name: verify
description: Prove a change to the ngx-formidable library works. Run the check commands and confirm the doc obligations before considering any code change complete.
---

# Verify

Model-invoked (also `/verify`). This is NOT auto-guaranteed — a hook could force the mechanical checks but cannot judge whether a doc entry is meaningful, so run this checklist yourself and paste proof per item.

## 1. Checks (from repo root)

- Build: `npm run build:lib` # compiles the library (types + templates via ng-packagr)
- Format: `npm run prettier:check`
- Lint (TS): `npm run lint` # check-only, no --fix
- Lint (SCSS): `npm run style-lint` # check-only

## 2. Obligations for changed code

- Every changed component/directive public API is reflected in `ui_components.md` (read the whole entry — prose, input/output tables, notes).
- New or changed fields/features are exercised in the demo app (`example-form`) — a new field component is wired in so it renders and can be tried. The demo is the only visual-test surface.
- New behavior is documented per `documentation.md`; the root `README.md` is updated when public usage changes.
- Logic changes ship with a helper spec and pass `ng test ngx-formidable` (see `testing.md`).

## Rules

- Fix only files you touched. If `prettier:check` fails, format touched files: `npx prettier --write <path>`.
- Lint/style-lint have no autofix — resolve flagged issues by hand.
- Types are checked by `build:lib`; there is no standalone typecheck script.
- Never hand-edit build output (`dist/`).

Definition of Done: @.documentation/conventions.md
Testing philosophy: @.documentation/testing.md

Do not claim success — paste the command output and confirm each obligation.
