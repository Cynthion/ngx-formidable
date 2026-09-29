# Backlog

## Bugs

- **Directive Validators On A Custom Control**: `@angular/forms` 22.2 binds a `FormValueControl` under `ngModel`, `[formControl]` and `formControlName` through `setupCustomControl()`, which never calls `setUpValidators()` — so a directive validator such as `required` or `minlength` beside the field is never attached to its control. Upstream; `forms-api-state.spec.ts` pins it. Report it to Angular with a minimal reproduction. Once fixed, drop the self-attachment in `NgxFormidableFieldValidate` and the `DIRECTIVE_VALIDATORS_UNATTACHED` pendings.

- **Readonly Option Picked By Keyboard**: read off the code, not yet reproduced. A click on a `readonly` option does nothing, but `selectOption()` only refuses a `disabled` one, and the highlight reconcile skips only `disabled` options when it clamps. A group whose first option is `readonly` would highlight it, and `Enter` or `Space` would pick it. Fits the edit guard of Phase 25.

- **Touch Without A Blur**: `touch` is documented as the last act of a blur, and the panel fields keep to it — a pick or a date arrow step touches nothing until focus leaves the field. `radio-group-field` and `checkbox-group-field` still emit it from `selectOption()`, and `time-field` from `selectTime()` on every arrow step, while focus stays put. Under `debounce(path, 'blur')` those release a value the panel fields would still hold. Fits the symmetry sweep of Phase 25.

- **Output After Destroy**: the full library suite logs `NG0953: Unexpected emit for destroyed OutputRef` twice. The emitting spec and output are not yet identified; a `touch` from the blur Chrome dispatches when a focused field is removed is the likely source. Fits the symmetry sweep of Phase 25.

## Features

- **Vitest Spike**: move both test projects from Karma to the `@angular/build:unit-test` builder, whose default runner is Vitest. The open question is the library: its geometry specs need `test-styles.scss`, while a library build target carries no `styles`. Try `setupFiles` and a `runnerConfig`, and prove it with the whole library suite passing.
- **Hidden State**: Signal Forms' `hidden()` reaches a field as the `FormUiControl` `hidden` input. The decorator could honour it and hide itself with its field, where today the consumer writes `@if (!form.address().hidden())`.
