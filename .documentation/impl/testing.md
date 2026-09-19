# Testing Strategy

Prioritize testing **logic** over Angular rendering: fast, reliable tests that catch real bugs, not tests that re-verify framework binding. See `impl/conventions.md` for the Definition of Done.

---

## Test Stack

| Tool             | Role                                       |
| :--------------- | :----------------------------------------- |
| Karma            | Test runner (browser)                      |
| Jasmine          | Assertion + spec framework                 |
| ng-packagr build | Type + template checking (via `build:lib`) |

`@angular/build:karma` is configured for both projects; there is no `karma.conf.js` or `test.ts` (builder defaults). Type errors are caught by `build:lib`, so there is no separate typecheck spec.

Not the newer `@angular/build:unit-test`: it is still experimental, its own `migrate-karma-to-vitest` migration skips library projects outright, and it takes no `polyfills`, `styles` or `stylePreprocessorOptions` of its own — it reads them from a `buildTarget`, which a library built by ng-packagr does not have. The library's specs need all three: `zone.js/testing` for `fakeAsync`, and `test-styles.scss` for the geometry specs that measure computed CSS.

**Both test targets run under zone change detection, and the app does not.** `@angular/build:karma` writes the test environment module itself, and it puts `provideZoneChangeDetection()` in it whenever `zone.js` is one of the target's `polyfills`. Removing that entry does not buy zoneless specs, because `zone.js/testing` carries no copy of zone.js and `fakeAsync` needs one. A spec that must run the way the app does provides `provideZonelessChangeDetection()` in its own `TestBed`, which overrides the environment's; `zoneless.spec.ts` is the one that does, and its header says why the NG0914 warning it logs is expected.

Two things behave differently in a zoneless `TestBed`, and both mislead if they are not known. `fixture.detectChanges()` refreshes only what something marked, so a host holding plain fields is skipped where it would have been checked under zones — a spec host that mutates its own state needs signals. And a spec proving that a repaint arrives on its own must not call `detectChanges()` after the act at all, since it ticks the whole application and would pass either way.

The library's `test` target sets `include` explicitly, as `['**/*.spec.ts', '../vest/**/*.spec.ts']`. The builder resolves those globs against `sourceRoot` and not, as its schema says, the project root — so the default glob covers `src/` only and the `vest/` entry point's spec is silently skipped. It was skipped for a long time; the second glob is what runs it.

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

- Library: `ng test ngx-formidable`, which `npm test` also resolves to.
- Demo: `ng test ngx-formidable-demo`, which has to be named.

Prove work by pasting command output — do not claim success. When a change is logic-bearing, add the helper spec in the same commit.

---

## Visual Testing

There is no Storybook or visual-regression layer yet; it is Phase 18 in `impl/implementation.md`. Until then, the portal is the manual visual check — run `npm start` and exercise the changed field in its preview form. `/preview` renders that form without the portal's own chrome.
