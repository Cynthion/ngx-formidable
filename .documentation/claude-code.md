# Claude Code Setup

This repo uses Claude Code. It mirrors the setup of the sibling EnerQi project, adapted for a standalone Angular library + demo-app workspace.

## CLAUDE.md Is Intentionally Minimal

Root `CLAUDE.md` holds only behavioral directives. Project knowledge lives in `.documentation/` (index in `README.md`) and is cross-linked from `conventions.md` (structure in `architecture.md`; component API in `ui_components.md`; tests in `testing.md`).

## Agents

SDD subagents in `.claude/agents/` run in isolated context, handing off via files: `research` → `specs/<slug>/specification.md`; `plan` → `specs/<slug>/design.md`; `implement` → code, tests, `specs/<slug>/implementation.md`.
Invoke by asking Claude to use the research, plan or implement agent, or via `/sdd`.

## Skills

Skills live in `.claude/skills/`:

- `verify` — run checks + Definition of Done (also `/verify`).
- `create-component` — field-creation contract and placement guidance.
- `documentation` — doc-editing rules.
- `sdd` — `/sdd <slug> "<requirement>"`, manual only.

## SDD Workflow

`research → plan → implement`, with a human review between phases and no auto-chaining. Specs live in `specs/<slug>/`. For small tasks skip SDD — edit directly and run `/verify`.

## Verification

Prove work (from repo root): `npm run build:lib` (compiles the library), `npm run lint`, `npm run style-lint`, `npm run prettier:check`, and `ng test ngx-formidable` once specs exist. `build:lib` is the primary type/template check. Paste output — do not just claim success. See `testing.md`.

## Formatting And Linting

Claude should avoid unrelated formatting churn.

Rules:

- Do not reformat files unrelated to the task.
- Prefer existing formatter/linter commands.
- Prefer touched-file formatting where possible.
- Run format/lint checks before claiming done when code changed.
- If formatting/linting fails, fix only relevant files.
- Never hand-edit build output (`dist/`).

## Hooks

None. Verification is the explicit `verify` skill (auto-format/lint hooks are noisy and loop-prone).

## Permissions

Tuned for zero routine prompts. `.claude/settings.json` is strict JSON, so this table is the commentary.

| Rule                                                          | Effect                                                                                                 |
| :------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| `Bash(npm run:*)`                                             | All scripts (`build:lib`, `test`, `lint`, `style-lint`, `prettier:check`, `start`) run without prompts |
| `Bash(npx ng/tsc/eslint/stylelint/prettier:*)`                | Direct tool runs allowed                                                                               |
| `Bash(git status/diff/log/show/add/mv/restore/stash:*)`       | Read and local git allowed                                                                             |
| deny `git commit`, `git merge`, `git push`, `git rebase`      | History and remote changes stay manual                                                                 |
| deny `rm -rf`, `git reset --hard`, `git clean`, `git push -f` | Blocked — irreversible                                                                                 |

Personal overrides go in `settings.local.json` (gitignored). Note: `deny` outranks `allow`, so a local allow cannot re-enable a denied command.
