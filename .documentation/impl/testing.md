# Testing Strategy

A spec pins behaviour a user or a consumer can observe: what the field shows and announces, where focus and the caret go, and what reaches the model. It does not pin how the code gets there, so a refactor that keeps the behaviour keeps every spec green, and a change that breaks the behaviour fails one. See [`impl/definition-of-done.md`](definition-of-done.md) for the Definition of Done.

---

## Test Stack

| Tool                           | Role                                                                         |
| :----------------------------- | :--------------------------------------------------------------------------- |
| Vitest                         | Runner and assertions, through `@angular/build:unit-test`                    |
| Vitest Browser Mode            | Runs every spec in a real browser: layout, computed styles, focus, the caret |
| Playwright                     | Drives headless Chromium for Vitest, and dispatches trusted input            |
| fast-check                     | Generates inputs for property-based specs                                    |
| ng-packagr build (`build:lib`) | Type and template check                                                      |

Both `test` targets use `@angular/build:unit-test` with `browsers: ["ChromiumHeadless"]`. There is no Vitest configuration file: the builder builds the configuration in memory, with Vitest's globals on. The browser is installed once per machine, see [`impl/developer-onboarding.md`](developer-onboarding.md).

- **Portal**: builds from its own `build` target's `development` configuration, with the app's styles, assets and loaders.
- **Library**: an ng-packagr target carries no `styles`, so the library's `test` target builds from `test-build`, an `@angular/build:application` target that exists only for the tests. It loads `test-styles.scss`, which is the shipped theme, so specs measure the real `:root` variables.
- **AOT**: both compile their specs AOT, so a spec host's template is type-checked as the app's are. A template no build reaches, such as the Studio's golden export, is checked that way.
- **Zoneless**: both projects run zoneless, as the app does. zone.js is not installed, so `fakeAsync`, `tick` and `flush` do not exist. Library specs wait on real timers; portal specs use Vitest's fake timers, `vi.useFakeTimers()` and `await vi.advanceTimersByTimeAsync(ms)`, and a spec that waits for a real frame, such as a `ResizeObserver`'s, switches back with `vi.useRealTimers()`.
- **Failure Screenshots**: a failing spec leaves a screenshot of the page under `.vitest/`.

Two things behave differently in a zoneless `TestBed`, and both mislead if they are not known. `fixture.detectChanges()` refreshes only what something marked, so an `OnPush` host holding plain fields is skipped: a spec host that changes its own state holds it in signals. And a spec proving that a repaint arrives on its own never calls `detectChanges()` after the act, since that ticks the whole application and would pass either way.

---

## Writing A Spec

- **Behaviour, Not Mechanism**: a spec names the documented rule it pins, such as **Keyboard** in [`user/fields.md`](../user/fields.md), and asserts on the DOM, ARIA, focus and the model. A doc comment that explains the implementation's internal order describes the code, not the behaviour.
- **Real Input**: a spec drives a field with `userEvent` from `vitest/browser`. Playwright dispatches trusted clicks, `Tab`, keys and typing, so the browser's own default actions happen: focus moves, a click places the caret, a keyboard focus entry selects the text.
- **Forced Clicks**: Playwright refuses two clicks a user can make: on a dropdown's display input, which takes no pointer events, and on an option marked `aria-disabled`. `{ force: true }` still clicks at the element's place, so the field around it takes the click.
- **Find By Role And Label**: a spec finds a field the way assistive technology does, `page.getByRole('combobox', { name: 'Colour' })`. A decorated field takes its accessible name from its `formidableFieldLabel`. A CSS selector is for what has no role.
- **Retrying Assertions**: after real input, `await expect.element(locator)` or `await expect.poll(read)` waits for the repaint without calling `detectChanges()`. A poll proves a change; to prove that something stayed as it was, `settle()` first and assert once.
- **Properties For Rules**: a rule of a pure helper is a property over generated inputs, `fc.assert(fc.property(...))`. Examples stay for the documented special cases. A failing property prints its counterexample, shrunk to the smallest one, and the seed that reproduces it with `fc.assert(property, { seed, path })`. It is a defect, not a flake.
- **Deterministic**: what a property depends on but does not generate is pinned, such as today's date with `vi.setSystemTime()`.
- **Examples That Can Fail**: example data is chosen so the defect a spec guards against can show. A readonly last option once let a walk up that started one short of it land right. A new spec is proven by breaking the code it guards once and watching it fail.
- **Relational Geometry**: a layout spec asserts relations that hold under any theme: the label never overlaps the value, label and value are centred as one block within half a pixel, two edges align. It does not assert pixel values computed by hand from the default theme.
- **No Reaching In**: a spec writes a value through its host's forms API. It never uses `writeValue`, `componentInstance.value`, a protected member or a test subclass of the field base.
- **Named For Behaviour**: a test is named for what it proves, not after the bug that prompted it, and a file is not named after a framework mechanism.
- **Upstream Defects**: a spec pinning another project's defect asserts today's behaviour and links the upstream issue, so it fails once the fix ships; its entry in [`impl/backlog.md`](backlog.md) says what to undo then. A spec that needs the fix calls `skip(reason)` from its test context.

Specs not yet rewritten to these rules are the scope of the test phases in [`impl/implementation.md`](implementation.md).

---

## Library Helpers

Every library spec is built on the helpers in `lib/testing/`. `public-api.ts` does not reach it, so ng-packagr never compiles it.

| Helper                          | Does                                                                                                                                   |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- |
| `configureFormidableTestBed()`  | Zoneless change detection and ngx-mask, plus the spec's own metadata. Clears `theme()` overrides and the scroll first                  |
| `settle(fixture, ms)`           | Awaits timers of up to `ms`, one frame, and the change detection they scheduled. Never calls `detectChanges()`                         |
| `bindField(kind, api)`          | A host binding one field through any forms API: its model, touched, dirty and events; `write()`, `set()`, `state()`, `markAsTouched()` |
| `clickAt(editor, index)`        | A trusted click where the caret before `index` sits, so the browser places it; `Shift` extends the selection                           |
| `DATE_FORMATS`, `TIME_FORMATS`  | fast-check arbitraries of every `unicodeTokenFormat` a date or time field accepts, and `DATES` of any date its mask holds              |
| `referenced()`                  | What an id-reference attribute such as `aria-activedescendant` resolves to                                                             |
| `keptKeys()`                    | Records the `keydown`s that reach the window, and whether the field kept each one from the browser                                     |
| `theme()`, `rem()`, `corners()` | A `:root` override, a rem length in px, the four resolved corner radii                                                                 |
| `fill()`, `type()`, `press()`   | Synthetic input for specs not yet rewritten: a whole value, keystrokes at the caret, a bubbling cancelable `keydown`                   |
| `click()`                       | A synthetic pointer click for specs not yet rewritten, which moves focus as the browser would                                          |

`bindField` with `decorated: true` and `decoration: '<div formidableFieldLabel>Colour</div>'` gives a field the accessible name `page.getByRole` finds it by. With `after: '<button type="button">Next</button>'` focus has somewhere to leave to by `Tab` and come back from by `Shift` + `Tab`: a field alone in the test frame would hand focus to the page around it, which does not reliably hand it back. `before` puts markup ahead of the field, such as a spacer that moves it to the fold. `state` has the forms API hold a field `disabled`, `readonly`, `required` or `invalid` from its first render, as `state()` does later; under `ngModel`, whose control registers after that render, only `readonly` and `required`.

---

## What To Test

The `helpers/` modules are pure functions and the cheapest place to find an edge case. Each has a colocated `*.helpers.spec.ts`.

| Area               | Where                 | What To Assert                                                                                                                |
| :----------------- | :-------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| Formatting/parsing | `format.helpers.ts`   | Over every accepted format and any date: the text fits the mask, parses back to itself, and no half-typed prefix of it parses |
| Masking            | `mask.helpers.ts`     | Over any mask of the built-in tokens: its display length range, and that the default placeholder is never taken for content   |
| Caret              | `input.helpers.ts`    | Over any mask filled from the front: where its value ends; and that writing the text already shown keeps the selection        |
| Options            | `option.helpers.ts`   | Over any list of options: the arrows land only on options a user can pick, visit all of them in order, and wrap at both ends  |
| Panel placement    | `position.helpers.ts` | Over any field, panel height and clipping panes: the side it opens on, the field left alone, no sheet ever flipped            |

Behaviour that carries real risk is tested through a minimal host rather than the framework around it:

- **The Field Contract**: `field-contract.spec.ts` runs every field through all three forms APIs: model to display, edit to model, the touch, a pristine programmatic write, the forwarded state. A field-wide change proves itself there.
- **Keyboard**: every key in **Keyboard** in [`user/fields.md`](../user/fields.md), pressed for real.

Not tested:

- Angular binding mechanics: that an input receives a value, that `OnPush` renders.
- Third-party internals: Pikaday, ngx-mask, fuse.js. A spec tests how the library uses them.
- Exact markup or pixel values.

---

## Running Tests

- **Library**: `npx ng test ngx-formidable --watch=false`. `npm test` runs the same project.
- **Portal**: `npx ng test ngx-formidable-portal --watch=false`, which has to be named.
- **One File**: `--include='**/option-highlight.spec.ts'`, relative to the project's root.
- **Watch Mode**: in a terminal, `ng test` watches unless `--watch=false` is given.

When each run is a gate is in [`impl/definition-of-done.md`](definition-of-done.md).

---

## Visual Testing

There is no Storybook or visual-regression layer yet; it is Phase 39 in [`impl/implementation.md`](implementation.md). Until then, the portal is the manual visual check: run `npm start` and exercise the changed field in its preview form, by hand or through the `playwright` MCP server described in [`impl/ai-harness.md`](ai-harness.md). Turning the `Field Types` switch off leaves that form without the portal's own annotations.
