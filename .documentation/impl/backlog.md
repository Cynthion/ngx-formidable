# Backlog

## Bugs

- **Directive Validators On A Custom Control**: `@angular/forms` 22.2 binds a `FormValueControl` under `ngModel`, `[formControl]` and `formControlName` through `setupCustomControl()`, which never calls `setUpValidators()` — so a directive validator such as `required` or `minlength` beside the field is never attached to its control. Upstream; `forms-api-state.spec.ts` pins it. Report it to Angular with a minimal reproduction. Once fixed, drop the `DIRECTIVE_VALIDATORS_UNATTACHED` pendings.

- **Parse Errors One Check Late**: under `ngModel` and `[formControl]`, `@angular/forms` 22.2 takes a `transformedValue` parse error into the control from an effect that runs after the host's template and calls `updateValueAndValidity({ emitEvent: false })`. `control.status` is read untracked, so nothing checks the host again, and the field's `errors` input follows only on its next check. Upstream; `BaseDateTimeField` works around it with one `markForCheck()` after render, and the `unparseable text` specs in `date-time-field.spec.ts` fail without it. Report it to Angular with a minimal reproduction. Once fixed, drop the workaround and its exception in [`impl/components.md`](components.md).

- **Vest Empty Target**: a Vest suite run through its Standard Schema gives a test with an empty target an issue without a path, then fails its own check on the next run with `Tests called in different order than previous run`. Upstream; the portal's suite reports on the whole form through a target that names no field instead. Report it to Vest with a minimal reproduction.

- **Angular ESLint On `valueOf`**: `@angular-eslint/eslint-plugin` 22.5's `reactive-context-must-read-signal` looks a bare call's name up on a plain object, so `({ valueOf }) => valueOf(path.pickup)` — the idiom Angular's documentation uses in a logic function — finds `Object.prototype.valueOf` and crashes the whole lint run with `config.args is not iterable`. Upstream; the Studio's exported schema calls `context.valueOf()` instead. Report it to angular-eslint with a minimal reproduction.

- **Standard Schema Path Through A Missing Key**: `validateStandardSchema` throws a `TypeError` for an issue whose path runs through a key the model lacks, where an unknown last key falls back to the path the schema validates. Upstream; the portal's suite drops such an issue first. Report it to Angular with a minimal reproduction.

- **Stale First-Render Pending**: `first-render.spec.ts` still marks a reactive `select` pending as defect `D16, Phase 21`, and both specs pass once the pending is removed. Delete `reactiveDefects` and its `pending()` call.

## Features

- **Vitest Spike**: move both test projects from Karma to the `@angular/build:unit-test` builder, whose default runner is Vitest. The open question is the library: its geometry specs need `test-styles.scss`, while a library build target carries no `styles`. Try `setupFiles` and a `runnerConfig`, and prove it with the whole library suite passing.
- **Import The Schema**: the Studio's template import leaves a field's readonly and disabled state, its limits, its required marker and its condition behind, because the export states them as rules in `my-form.form.ts`. Reading back the one grammar `schema-serializer.ts` writes, pasted beside the template, would round-trip the whole form again.
- **Hidden State**: Signal Forms' `hidden()` reaches a field as the `FormUiControl` `hidden` input. The decorator could honour it and hide itself with its field, where today the consumer writes `@if (!form.address().hidden())`.
