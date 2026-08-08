# Testing Strategy

Prioritize testing **logic** over Angular rendering: fast, reliable tests that catch real bugs, not tests that re-verify framework binding. See `conventions.md` for the Definition of Done.

---

## Current State

Testing is sparse, and lives entirely in the library: specs for the pure helpers, plus one contract spec per feature area, each colocated with the code it pins down and opening with a comment stating the contract. The demo has none. This doc is therefore both a description of the stack and the strategy to follow when adding further tests.

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

| Area                  | Where                      | What to assert                                                     |
| :-------------------- | :------------------------- | :----------------------------------------------------------------- |
| Formatting/parsing    | `format.helpers.ts`        | date/time format + parse round-trips, edge tokens                  |
| Masking               | `mask.helpers.ts`          | mask config resolution, min/max-length validation                  |
| Field-path resolution | `form.helpers.ts`          | control/group path resolution in a form tree                       |
| Vest frame validation | `form-validate.helpers.ts` | error extraction, root-form key handling                           |
| Options               | `option.helpers.ts`        | sorting, matching, selection                                       |
| Panel placement       | `position.helpers.ts`      | side chosen from available space, the flip it marks the panel with |
| Utilities             | `utility.helpers.ts`       | `cloneDeep`, `set`, `mergeValuesAndRawValues`, `getAllFormErrors`  |

---

## What To Test Selectively

Behavior that carries real risk, tested through a minimal host — not the framework around it:

- **ControlValueAccessor**: a field writes an external value and emits on user change.
- **NgxFormidableFormDirective ↔ Vest**: `createAsyncValidator` maps a Vest suite result to Angular errors for a field path.
- **Directive attach behavior**: `NgxFormidableFormModelDirective`/`NgxFormidableFormModelGroupDirective` attach to `[ngModel]`/`[ngModelGroup]` and **no-op outside a formidable form** (they inject `NgxFormidableFormDirective` optionally) — a regression here breaks any consuming app.
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

There is no Storybook or visual-regression layer yet; it is a `backlog.md` item. Until then, the demo app (`example-form`) is the manual visual check — run `npm start` and exercise the changed field.
