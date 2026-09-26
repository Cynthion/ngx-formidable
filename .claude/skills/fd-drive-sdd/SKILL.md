---
name: fd-drive-sdd
description: Drive Spec Driven Development for a work item, from research through plan to implementation. Use when starting development on a branch and the research and plan artifacts should be produced in order.
argument-hint: <slug> "<requirement>"
disable-model-invocation: true
---

# Spec Driven Development

Own the artifact contract for a work item and drive the phases in order. This skill holds the templates; the agents do the work.

The slug is a short kebab identifier, for example `date-range-field`.

## Artifact Contract

| Phase     | Agent          | Artifact                                   | Template                                            |
| :-------- | :------------- | :----------------------------------------- | :-------------------------------------------------- |
| Research  | `fd-research`  | `.research/<slug>.md`                      | `.claude/skills/fd-drive-sdd/research.template.md`  |
| Plan      | `fd-plan`      | `.plan/<slug>.md`                          | `.claude/skills/fd-drive-sdd/plan.template.md`      |
| Implement | `fd-implement` | Source code, progress appended to the plan | `.claude/skills/fd-drive-sdd/implement.template.md` |

`.research/` and `.plan/` are untracked. Implementation progress is appended to the plan file rather than written to a third artifact, so a work item has exactly two files.

## Workflow

1. Determine the phase from what already exists on disk. Report it before doing anything.
2. Run the missing phases in order. Stop after each and show the artifact.
3. Do not start a phase whose input is missing.

| On Disk                             | Next                         |
| :---------------------------------- | :--------------------------- |
| Nothing                             | Research                     |
| Research only                       | Plan                         |
| Research and plan                   | Implement                    |
| Plan with an Implementation section | Review, then `/fd-create-pr` |

For a small task, skip this entirely — edit directly and run `fd-review-change`.

## Rules

- **One Phase At A Time**: Show the artifact and stop. The next phase starts on request. Never auto-chain.
- **Never Skip Research**: A plan without research is a guess. If research is genuinely unnecessary, say why and record it in the research artifact.
- **Artifacts Are The Interface**: Each phase reads the previous artifact from disk, not from the conversation. A phase that cannot be resumed from its input file is not done.
- **Templates Are Not Optional**: Read the template before writing the artifact. Keep its section structure so later phases and `fd-grill-plan` can rely on it.

Conventions and the Definition of Done: [`impl/definition-of-done.md`](../../../.documentation/impl/definition-of-done.md).
