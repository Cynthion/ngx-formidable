# Backlog

## Bugs

- **Directive Validators On A Custom Control**: `@angular/forms` 22.2 binds a `FormValueControl` under `ngModel`, `[formControl]` and `formControlName` through `setupCustomControl()`, which never calls `setUpValidators()` — so a directive validator such as `required` or `minlength` beside the field is never attached to its control. Upstream; `forms-api-state.spec.ts` pins it. Report it to Angular with a minimal reproduction. Once fixed, drop the self-attachment in `NgxFormidableFieldValidate` and the `DIRECTIVE_VALIDATORS_UNATTACHED` pendings.

- **Parse Errors One Check Late**: under `ngModel` and `[formControl]`, `@angular/forms` 22.2 takes a `transformedValue` parse error into the control from an effect that runs after the host's template and calls `updateValueAndValidity({ emitEvent: false })`. `control.status` is read untracked, so nothing checks the host again, and the field's `errors` input follows only on its next check. Upstream; `BaseDateTimeField` works around it with one `markForCheck()` after render, and the `unparseable text` specs in `date-time-field.spec.ts` fail without it. Report it to Angular with a minimal reproduction. Once fixed, drop the workaround and its exception in [`impl/components.md`](components.md).

## Features

- **Vitest Spike**: move both test projects from Karma to the `@angular/build:unit-test` builder, whose default runner is Vitest. The open question is the library: its geometry specs need `test-styles.scss`, while a library build target carries no `styles`. Try `setupFiles` and a `runnerConfig`, and prove it with the whole library suite passing.
- **Hidden State**: Signal Forms' `hidden()` reaches a field as the `FormUiControl` `hidden` input. The decorator could honour it and hide itself with its field, where today the consumer writes `@if (!form.address().hidden())`.
