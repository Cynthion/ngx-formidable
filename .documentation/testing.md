# Testing Strategy

Prioritize testing **logic** over Angular rendering: fast, reliable tests that catch real bugs, not tests that re-verify framework binding. See `conventions.md` for the Definition of Done.

---

## Current State

Testing is sparse, and lives mostly in the library: specs for the pure helpers, plus one contract spec per feature area, each colocated with the code it pins down and opening with a comment stating the contract. The demo has one, `vest-integration.spec.ts`, which mounts the demo's own suite and wiring from a consumer's side of both entry points. This doc is therefore both a description of the stack and the strategy to follow when adding further tests.

The library's specs need the root `node_modules` only. A nested `projects/ngx-formidable/node_modules` (from running `npm install` inside the library folder) shadows it with a second copy of `@angular/core`, which breaks `TestBed` with `Need to call TestBed.initTestEnvironment() first`. Delete it and install from the workspace root.

---

## Test Stack

| Tool             | Role                                       |
| :--------------- | :----------------------------------------- |
| Karma            | Test runner (browser)                      |
| Jasmine          | Assertion + spec framework                 |
| ng-packagr build | Type + template checking (via `build:lib`) |

The Angular Karma builder is configured for both projects; there is no `karma.conf.js` or `test.ts` (builder defaults). Type errors are caught by `build:lib`, so there is no separate typecheck spec.

---

## What To Test — Helpers First

The `helpers/` modules are pure functions and the highest-value, lowest-cost target. Test them directly with a colocated `*.helpers.spec.ts`.

| Area                  | Where                      | What to assert                                                                                 |
| :-------------------- | :------------------------- | :--------------------------------------------------------------------------------------------- |
| Formatting/parsing    | `format.helpers.ts`        | date/time format + parse round-trips, edge tokens                                              |
| Masking               | `mask.helpers.ts`          | mask config resolution, min/max-length validation                                              |
| Field-path resolution | `form.helpers.ts`          | control/group path resolution in a form tree                                                   |
| Model shape checking  | `form-validate.helpers.ts` | dev-mode mismatch detection: nested keys, array index-0 rule, record wildcards                 |
| Options               | `option.helpers.ts`        | sorting, matching, selection                                                                   |
| Panel placement       | `position.helpers.ts`      | side chosen from available space, the flip it marks the panel with, and that a sheet is exempt |
| Utilities             | `utility.helpers.ts`       | `cloneDeep`, `set`, `mergeValuesAndRawValues`, `getAllFormErrors`                              |

---

## What To Test Selectively

Behavior that carries real risk, tested through a minimal host — not the framework around it:

- **ControlValueAccessor**: a field writes an external value and emits on user change.
- **NgxFormidableFormDirective ↔ the validator**: `createAsyncValidator` debounces per the form's `debounceMs` and maps a validator's messages to Angular errors for one target. Specs drive it through a stub validator, so the library's own tests need no validation library.
- **Directive attach behavior**: `NgxFormidableFieldValidateDirective`/`NgxFormidableGroupValidateDirective` attach to `[ngModel]`/`[ngModelGroup]` and **no-op outside a formidable form** (they inject `NgxFormidableFormDirective` optionally) — a regression here breaks any consuming app.
- **Keyboard navigation**: option/panel fields respond to the registered keys.

---

## What NOT To Test

- Angular binding mechanics (that `@Input()` receives a value, that `OnPush` renders).
- Third-party internals — Pikaday, ngx-mask, fuse.js, Vest. Test how the library _uses_ them, not their behavior.
- Exact rendered markup/pixels.

---

## Running Tests

- Library: `ng test ngx-formidable`.
- Demo: `npm test` (defaults to the demo project).

Prove work by pasting command output — do not claim success. When a change is logic-bearing, add the helper spec in the same commit.

---

## Visual Testing

There is no Storybook or visual-regression layer yet; it is Phase 17 in `implementation.md`. Until then, the demo app (`example-form`) is the manual visual check — run `npm start` and exercise the changed field.
