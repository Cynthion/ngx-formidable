# Backlog

## Bugs

- An option's `select` never reaches the rendered option. Every option field re-creates its options from the plain list and binds `[value]`, `[label]`, `[readonly]`, `[disabled]`, `[selected]`, `[highlighted]` and — on the autocomplete only — `[match]`. It does not bind `[select]`, so a `select` a consumer sets on a projected `formidable-field-option` or on an `options` entry is carried in the plain option and then dropped: the rendered option always falls back to its own default. Either bind it or drop `select` from `IFormidableOption`.

- A standalone `ngModel` — one outside a `<form>` — sets up its control synchronously from `NgModel.ngOnChanges`, which is before the field's own view exists. Every field whose `doWriteValue` reaches for a view ref therefore crashes: `input-field` throws NG0951 on `inputRef()`, and did the same in kind before the query was a signal. `focus.spec.ts` already documents the timing; the fix is either to guard the write or to defer it until the view is there. Reproduce with a decorated `formidable-input-field` carrying `ngModel` and no `<form>` around it.

## Features
