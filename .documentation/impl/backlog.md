# Backlog

## Bugs

- **Directive Validators On A Custom Control**: `@angular/forms` 22.2 binds a `FormValueControl` under `ngModel`, `[formControl]` and `formControlName` through `setupCustomControl()`, which never calls `setUpValidators()` — so a directive validator such as `required` or `minlength` beside the field is never attached to its control. Upstream; `forms-api-state.spec.ts` pins it. Report it to Angular with a minimal reproduction. Once fixed, drop the self-attachment in `NgxFormidableFieldValidate` and the `DIRECTIVE_VALIDATORS_UNATTACHED` pendings.

## Features

- **Vitest Spike**: move both test projects from Karma to the `@angular/build:unit-test` builder, whose default runner is Vitest. The open question is the library: its geometry specs need `test-styles.scss`, while a library build target carries no `styles`. Try `setupFiles` and a `runnerConfig`, and prove it with the whole library suite passing.
- **Hidden State**: Signal Forms' `hidden()` reaches a field as the `FormUiControl` `hidden` input. The decorator could honour it and hide itself with its field, where today the consumer writes `@if (!form.address().hidden())`.
