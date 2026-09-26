---
name: fd-create-handoff
description: Compress a plan into a self-contained brief that can be executed in a fresh context. Use when work must continue in a new session or survive a context reset.
argument-hint: <slug>
effort: low
---

# Create A Handoff

Produce a brief that someone with no memory of this conversation can execute.

Read `.plan/<slug>.md`, including any Implementation section, and the current `git status --short` and diff.

## Output

Emit the brief in the response. Do not create a new file — the plan is the artifact, and a second copy would drift from it.

```txt
## State
<What is done, what is in progress, what is untouched. Cite the plan steps.>

## Working Tree
<Branch, and which files are modified but uncommitted.>

## Next
1. <The immediate next action, concrete enough to start on.>
2. <Then this.>

## Watch Out
- <The thing that will bite someone who does not know it. Cite the file.>

## Verify
<The exact commands that prove the work, and what their output must show.>
```

## Rules

- **Self-Contained**: No reference to "as discussed" or "the earlier approach". Everything needed is in the brief or in a file it names by path.
- **Read The Tree, Not The Memory**: Derive state from the plan file and the diff, not from the conversation. That is what makes the brief correct after a reset.
- **Honest State**: A half-finished step is reported as half-finished, with what remains. Rounding up is how the next session breaks something.
- **Short**: If it does not change what the next person does, leave it out.
