# Backlog

## Bugs

- An option's `select` never reaches the rendered option. Every option field re-creates its options from the plain list and binds `[value]`, `[label]`, `[readonly]`, `[disabled]`, `[selected]`, `[highlighted]` and — on the autocomplete only — `[match]`. It does not bind `[select]`, so a `select` a consumer sets on a projected `formidable-field-option` or on an `options` entry is carried in the plain option and then dropped: the rendered option always falls back to its own default. Either bind it or drop `select` from `IFormidableOption`.

- A masked `textarea-field` loses a value written into it. Observed with `mask="AAA-AAA"` and `[ngModel]="'abcdef'"` inside a `<form>`: the element holds `abc-def` for a moment and then ends up holding the mask's own whitespace, so `value` reads back `null`. The mask `effect`'s `queueMicrotask` calls `doWriteValue(this.value ?? '')`, which re-masks whatever the getter returns at that instant, and that is the write that lands last. `input-field` has the same effect and needs checking too.

- `textarea-field`'s length indicator renders `{{ value?.length || 0 }}`, and `value` reads the textarea element — a DOM read, against the `impl/conventions.md` rule that state a template reads is a signal. Under zone change detection every write path is followed by a tick, so it keeps up; zonelessly a programmatic masked write repaints nothing and the count goes stale. Fixing it means backing the count with a signal written wherever the element's value is, which is blocked on the defect above. `select-field.component.ts` reads `value` off its element the same way, but only to re-assert `[selected]` on an option the DOM already has, so nothing is visibly stale there.

- A standalone `ngModel` — one outside a `<form>` — sets up its control synchronously from `NgModel.ngOnChanges`, which is before the field's own view exists. Every field whose `doWriteValue` reaches for a view ref therefore crashes: `input-field` throws NG0951 on `inputRef()`, and did the same in kind before the query was a signal. `focus.spec.ts` already documents the timing; the fix is either to guard the write or to defer it until the view is there. Reproduce with a decorated `formidable-input-field` carrying `ngModel` and no `<form>` around it.

## Features

## Chores

- `impl/conventions.md` carries two **Stylelint** bullets under **Tooling**, and the second still names `stylelint-config-prettier-scss`, which Phase 15a removed. Delete it; the first bullet is correct.
