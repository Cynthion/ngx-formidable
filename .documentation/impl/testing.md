# Testing Strategy

Prioritize testing **logic** over Angular rendering: fast, reliable tests that catch real bugs, not tests that re-verify framework binding. See [`impl/definition-of-done.md`](definition-of-done.md) for the Definition of Done.

---

## Test Stack

| Tool             | Role                                       |
| :--------------- | :----------------------------------------- |
| Karma            | Test runner (browser)                      |
| Jasmine          | Assertion + spec framework                 |
| ng-packagr build | Type + template checking (via `build:lib`) |

`@angular/build:karma` is configured for both projects and there is no `test.ts` in either. The library runs on the builder's defaults; the portal names a `karma.conf.cjs`, which raises Karma's inactivity timeouts and, because supplying a config stops the builder contributing its own, redeclares the frameworks and plugins. No current spec needs the raised timeouts: `portal.spec.ts` runs in seconds. The file sets no `browsers` either, so a portal run needs `--browsers=ChromeHeadless`, or Karma starts and idles without launching one. Type errors are caught by `build:lib`, so there is no separate typecheck spec.

The portal's `test` target sets `aot: true`, so its templates are type-checked the way `npm run build` checks them. That matters for a template no build reaches: the Studio's golden export, whose `[formField]` bindings only an AOT compile checks.

Not `@angular/build:unit-test`, Angular's stable Vitest builder: Karma stays, and a Vitest spike is in [`impl/backlog.md`](backlog.md). Its `migrate-karma-to-vitest` migration skips the library: it rewrites only an `application` project whose `build` target is `@angular/build:application`. The builder itself accepts an `@angular/build:ng-packagr` `buildTarget`, so a library is not excluded outright. What the library cannot get that way is `styles` and `stylePreprocessorOptions`: the builder takes no options of its own for them and reads them from the build target, and an ng-packagr target carries none. The library's geometry specs need both, for `test-styles.scss` and the computed CSS they measure. Whether `setupFiles` and a `runnerConfig` close that gap is untested.

**The library's specs run zoneless, as the app does.** Its test target loads no `zone.js`, so `fakeAsync`, `tick` and `flush` do not exist there. The portal's target still loads `zone.js` and `zone.js/testing`, and `@angular/build:karma` then puts `provideZoneChangeDetection()` into its test environment.

Two things behave differently in a zoneless `TestBed`, and both mislead if they are not known. `fixture.detectChanges()` refreshes only what something marked, so an `OnPush` host holding plain fields is skipped. A spec host that mutates its own state needs signals. And a spec proving that a repaint arrives on its own must not call `detectChanges()` after the act at all, since it ticks the whole application and would pass either way.

---

## Library Specs

Every library spec is built on the helpers in `lib/testing/`. `public-api.ts` does not reach it, so ng-packagr never compiles it.

| Helper                          | Does                                                                                                                                   |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- |
| `configureFormidableTestBed()`  | Zoneless change detection and ngx-mask, plus the spec's own metadata. Clears `theme()` overrides and the scroll first                  |
| `settle(fixture, ms)`           | Awaits timers of up to `ms`, one frame, and the change detection they scheduled. Never calls `detectChanges()`                         |
| `bindField(kind, api)`          | A host binding one field through any forms API: its model, touched, dirty and events; `write()`, `set()`, `state()`, `markAsTouched()` |
| `fill()`, `type()`, `press()`   | A whole value as a paste sets it, keystrokes at the live caret, a bubbling cancelable `keydown`                                        |
| `click()`                       | A pointer click, which moves focus as the browser would unless its `mousedown` is cancelled                                            |
| `referenced()`                  | What an id-reference attribute such as `aria-describedby` resolves to                                                                  |
| `theme()`, `rem()`, `corners()` | A `:root` override, a rem length in px, the four resolved corner radii                                                                 |

- **Real Timers**: a spec awaits `settle()` after an act, passing the debounce it waits out as `ms`.
- **Signal Hosts**: a host keeps the `OnPush` default, and the state a spec changes is a signal.
- **No Reaching In**: a spec writes a value through its host's forms API and asserts on the DOM, ARIA and the model. It never uses `writeValue`, `componentInstance.value`, a protected member or a test subclass of the field base.
- **Named For Behaviour**: a test is named for what it proves, not after the bug that prompted it, and a file is not named after a framework mechanism.

---

## What To Test: Helpers First

The `helpers/` modules are pure functions and the highest-value, lowest-cost target. Test them directly with a colocated `*.helpers.spec.ts`.

| Area               | Where                 | What To Assert                                                                                 |
| :----------------- | :-------------------- | :--------------------------------------------------------------------------------------------- |
| Formatting/parsing | `format.helpers.ts`   | date/time format + parse round-trips, edge tokens                                              |
| Masking            | `mask.helpers.ts`     | mask config resolution, min/max-length validation                                              |
| Options            | `option.helpers.ts`   | sorting, matching, selection                                                                   |
| Panel placement    | `position.helpers.ts` | side chosen from available space, the flip it marks the panel with, and that a sheet is exempt |

---

## What To Test Selectively

Behavior that carries real risk, tested through a minimal host rather than the framework around it:

- **The Field Contract**: `field-contract.spec.ts` runs every field through all three forms APIs: model to display, edit to model, the touch, a pristine programmatic write, the forwarded state. A field-wide change proves itself there.
- **Keyboard navigation**: option/panel fields respond to the registered keys.

---

## What NOT To Test

- Angular binding mechanics (that `@Input()` receives a value, that `OnPush` renders).
- Third-party internals: Pikaday, ngx-mask, fuse.js. Test how the library _uses_ them, not their behavior.
- Exact rendered markup/pixels.

---

## Running Tests

- **Library**: `npx ng test ngx-formidable --watch=false --browsers=ChromeHeadless`. `npm test` resolves to the same project.
- **Portal**: `npx ng test ngx-formidable-portal --watch=false --browsers=ChromeHeadless`, which has to be named.

When each run is a gate is in [`impl/definition-of-done.md`](definition-of-done.md).

---

## Visual Testing

There is no Storybook or visual-regression layer yet; it is Phase 33 in [`impl/implementation.md`](implementation.md). Until then, the portal is the manual visual check: run `npm start` and exercise the changed field in its preview form, by hand or through the `playwright` MCP server described in [`impl/ai-harness.md`](ai-harness.md). Turning the `Field Types` switch off leaves that form without the portal's own annotations.
