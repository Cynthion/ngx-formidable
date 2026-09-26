---
name: fd-research-issue
description: Research a roadmap phase or backlog item against the repository and emit a prompt for external deep research. Use when a work item needs investigating before a plan exists, or when a research artifact is requested.
argument-hint: <slug>
---

# Research An Issue

Produce `.research/<slug>.md` and a prompt that can be pasted into an external model for deep research the repository cannot answer.

Template: `.claude/skills/fd-drive-sdd/research.template.md`. The `fd-research` agent carries the method and the rules.

## Workflow

1. Read the matching phase in `.documentation/impl/implementation.md` or item in `.documentation/impl/backlog.md`. Ask which one when the slug does not resolve. There might be no item yet, in which case ask what should be researched.
2. Investigate the repository and `.documentation/`. Fill every section of the template except `External Research`.
3. Decide what external research would actually add. Only questions the repository cannot answer qualify: upstream library behavior (Angular, ngx-mask, Pikaday, Vest), framework migration detail, specification and accessibility detail, and prior art in other form libraries.
4. Emit the external prompt below in the response, ready to paste. Do not write it into the artifact.
5. Report the artifact path and list the open questions the external prompt covers.

## External Prompt

Emit this shape, filled in. Keep it self-contained — the external model has no access to the repository.

```txt
Context: <the problem, in three or four sentences, with no internal names or paths>
Stack: <only the public technologies involved>

Answer these, with sources:
1. <Question the repository cannot answer>
2. <Question the repository cannot answer>

For each: state the current recommended approach, the failure modes, and what changed recently.
Prefer primary sources. Say when something is uncertain rather than filling the gap.
```

External findings return under the `External Research` heading of the artifact, with source and date. Findings pasted in are claims, not facts, until checked against the repository.

## Rules

- **Repository First**: Exhaust the repository and `.documentation/` before proposing external research.
- **No External Prompt Without A Gap**: When the repository answers everything, say so and emit no prompt.
- **Never Paste Blind**: External findings are recorded as sourced claims and verified before a plan relies on them.
- **No Internal Detail Leaves**: The external prompt carries no paths, internal symbol names, or credentials. The library is public, so naming it is fine.
