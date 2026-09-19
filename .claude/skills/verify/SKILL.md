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
- Docs: `npm run docs:check` # the portal's token manifest against `user/theme-reference.md`

## 2. Obligations for changed code

- Every changed component/directive public API is reflected in `user/components.md` (read the whole entry — prose, input/output tables, notes).
- A change to public usage updates the matching `user/*.md`; a change to a design decision or an internal boundary updates the matching `tech/*.md`. Neither restates the other.
- New or changed fields/features are exercised in the portal's preview form (`src/app/portal/model/preview-form.definition.ts`) — a new field component gets a `PortalFieldKind`, a capability row and a specification, so it renders and can be tried. The portal is the only visual-test surface.
- A new or renamed `--formidable-*` variable is added to `src/app/portal/model/token-manifest.ts` as well as `user/theme-reference.md`, with the **same description text**; `token-manifest.spec.ts` gates the names and `docs:check` gates the text.
- New behavior is documented per `impl/documentation.md`; the root `README.md` is updated when public usage changes.
- Logic changes ship with a helper spec and pass `ng test ngx-formidable` (see `impl/testing.md`).
- Changes under `src/` pass `ng test ngx-formidable-demo`, which has to be named.

## Rules

- Fix only files you touched. If `prettier:check` fails, format touched files: `npx prettier --write <path>`.
- Lint/style-lint have no autofix — resolve flagged issues by hand.
- Types are checked by `build:lib`; there is no standalone typecheck script.
- Never hand-edit build output (`dist/`).

Definition of Done: @.documentation/impl/conventions.md
Testing philosophy: @.documentation/impl/testing.md

Do not claim success — paste the command output and confirm each obligation.
