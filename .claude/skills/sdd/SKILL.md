---
name: sdd
description: Spec-driven development — research, plan, implement, with a human checkpoint between each phase.
disable-model-invocation: true
---

# SDD: research → plan → implement

Usage: `/sdd <slug> "<requirement>"`  (slug = short kebab id, e.g. delays-endpoint)

One phase at a time — STOP for human review between each:

1. research  → run the `research` agent → `specs/<slug>/specification.md`. Review.
2. plan      → run the `plan` agent      → `specs/<slug>/design.md`. Review.
3. implement → run the `implement` agent → code + tests + `specs/<slug>/implementation.md`, proven.

Agents seed handoff files from `.claude/skills/sdd/templates/*` and run in isolated context —
all handoff info must be written to the file. Do not auto-chain.

Conventions + Definition of Done: @.documentation/conventions.md
