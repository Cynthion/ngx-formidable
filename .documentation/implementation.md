# Implementation Roadmap

Sequenced execution view of `backlog.md`. `backlog.md` stays the raw source of truth; this file orders the same items into themed phases to work through one at a time. When an item ships, update or remove it in `backlog.md` per the Definition of Done in `conventions.md`.

## Ordering Strategy

- **Correctness First**: bugs and UX defects lead; new surface comes after the base is solid.
- **Breaking Early**: the library is pre-`1.0` with no external consumers, so all breaking API changes are batched up front.
- **Validation Stays**: the Vest / `NgxFormidableFormDirective` bridge is a core feature. The backlog item "remove validation from the library" is **dropped** and not scheduled.
- **Angular Upgrade Is Release Prep**: the major Angular upgrade is deferred to the final phase; all feature and bug work happens on the current Angular first.

---

## Phase 1 — Correctness: Bugs And UX Defects

Fix defects before adding surface. This is the north star of the roadmap. **Shipped** — every item done except the iOS padding fix, which is **deferred** (needs a device to verify; annotated in `backlog.md`).

| Group          | Item                                                                      |  Status  |
| :------------- | :------------------------------------------------------------------------ | :------: |
| Date / Time    | Show the user-provided mask instead of `0` in date/time fields            |   Done   |
| Date / Time    | Typing that breaks a valid date must set the form value to `null`         |   Done   |
| Date / Time    | Fix the unicode-format parse bug (`yyyy-MM-dd` + `20200202` → wrong date) |   Done   |
| Date / Time    | Stop arrow / left / right from moving the caret while the panel is open   |   Done   |
| Label / Layout | Readonly and disabled fields must not float the label                     |   Done   |
| Label / Layout | Fix multi-row label overlapping into the field — one line, ellipsized     |   Done   |
| Platform       | Fix iOS padding when the prefix is missing                                | Deferred |

---

## Phase 2 — Breaking API Changes

Batch every breaking change into one pass while there are no consumers to migrate. **Shipped** — all three items done.

| Item                                                                                                       | Status |
| :--------------------------------------------------------------------------------------------------------- | :----: |
| Rename `FieldDecoratorLayout` options `single` / `group` / `inline` → `horizontal` / `vertical` / `inline` |  Done  |
| Rename `FormDirective` → `NgxFormidableFormDirective` (avoids the Angular naming clash)                    |  Done  |
| Externalize icons so consumers set their own SVGs, then delete the `formidable-icon` component             |  Done  |

Each rename touched the type/export, all internal references, the demo, and the docs (`ui_components.md`, root `README.md`). The layout rename also renamed the decorator's SCSS mixins (`decorator-container-*`, `field-prefix/suffix-*`). The directive rename was widened to the whole `Form*` family — `NgxFormidableFormModelDirective`, `NgxFormidableFormModelGroupDirective`, `NgxFormidableFormRootValidateDirective`, `NgxFormidableFormValidationOptions` — per the class-naming rule in `conventions.md`; filenames stayed unprefixed. Icons left the library entirely: the date field's panel toggle draws a CSS arrow unless the consumer projects `[formidableFieldToggleIcon]` content, and the demo's `example-icon` component shows how to supply one.

---

## Phase 3 — Styling And Theming Polish

Runtime CSS-variable and theme gaps. See the styling conventions in `conventions.md`. **Shipped** — all six items done.

| Item                                                                                                                                                                                                                                              | Status |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----: |
| Expose the hardcoded option-label gap and checkbox border thickness as CSS variables in the checkbox-group mixin                                                                                                                                  |  Done  |
| Override autofill styling (`input:-webkit-autofill`, etc.)                                                                                                                                                                                        |  Done  |
| Add `--formidable-color-field-group-background-readonly` and `-disabled`                                                                                                                                                                          |  Done  |
| Position error messages `absolute` so they do not consume layout space (Problem is that currently subsequent fields will be "pushed down" in view); evaluate this requirement, AskUserQuestions                                                   |  Done  |
| Refactoring of "floating" label; "floating" must be when the label is placed between upper border and value text; the label must never be outside of field, only either being inside the field (like the placeholder) or floating above the value |  Done  |
| Tweak theme 4: tiny sizing, `border-radius: 0`, no field-group background                                                                                                                                                                         |  Done  |
| Add `border` / `border-prefix` label positions, and move an over-field label into the field's own container                                                                                                                                       |  Done  |
| Render validation errors in a decorator slot below the field's container, so it stays exactly the field's box                                                                                                                                     |  Done  |

The error-message item resolved differently than first phrased: after checking with Chris, error text stays in normal document flow (not `absolute`) but the container now reserves one line of height, so an ordinary single-line error causes no layout shift; longer, wrapping errors still push later fields down. The label refactor went further than "floating": the label's position is now an explicit, mutually exclusive choice — `formidableFieldLabel`'s `position: 'outside' | 'inside' | 'inside-floating'` — where `outside` (default) is always static and the two inside positions never render outside the field; see `ui_components.md`. Theme 4's "no field-group background" was scoped to group containers (radio-group/checkbox-group) only; plain inputs keep their fill. The new CSS variables were also mirrored into the sibling EnerQi project's `styles.scss` override layer.

The two later rows came out of re-analyzing the label implementation once it worked. `.container-horizontal` is the positioning context for both the over-field label and the prefix/suffix, and it was never only the field: `FieldErrorsDirective` created its component beside the field, which content projection then placed inside that container. With a reserved error line in it the container was ~87px instead of 60px, so a prefix centered on `50%` sat ~14px below the field's middle — and the same misplacement put the errors inside the `inline` layout's flex row and the `vertical` layout's `<fieldset>`. The directive now renders into a slot the decorator exposes after the container, keeping its old behaviour when a field has no decorator, which the EnerQi consumer relies on. Prefix and suffix are confirmed as centered in the field and independent of the label; a field whose value is top-aligned says so with the new optional `IFormidableField.valueAlignment`, which puts them on the value's first line instead. Requirements and rationale live in `label-handoff.md`.

The "between upper border and value text" wording turned out to be unsatisfiable while the value stays centered in the field's full inner height: that leaves `1.0125rem` above it, less than the floating label's own `1.2rem` line-box, so the two overlapped. Chris's ruling: with the label inside, the label and the value are centered together as one block (the value gets a top padding); with the label outside, the value is centered alone, and differing value heights between the two modes is fine. In the same pass, `isFloating` → `position` was joined by two more breaking renames — `IFormidableField.isLabelFloating` → `canLabelRest` (the old name meant its own opposite) and the removal of `supportsInsideLabel`, now derived from `decoratorLayout === 'horizontal'`. All three were applied to the demo and the EnerQi consumer's real usages too.

---

## Phase 4 — Field Features And API Additions

New capabilities across fields, built on the corrected base and stable API.

| Item                                                                                                                    |
| :---------------------------------------------------------------------------------------------------------------------- |
| Suffix actions: clear/reset, copy, validation state, loading                                                            |
| Add a `supportingText` input — always-visible text below the field                                                      |
| Add a `defaultOption` input to select, dropdown, autocomplete, radio-group, checkbox-group                              |
| Do not render `formidable-field-option` when radio/checkbox groups are empty                                            |
| Add `{ descendants: true }` to option `@ContentChildren` so options work via `ng-template`                              |
| Toggle field: allow `inline` / `group` layout                                                                           |
| Date field: responsive / smaller rendering for small screens                                                            |
| Date field: option to open the panel at the bottom of the screen (VIAC-style, like a keyboard), e.g. for mobile devices |
| Chore: prefer `queueMicrotask` over `setTimeout` where possible                                                         |

---

## Phase 5 — Accessibility And Focus

| Item                                                               |
| :----------------------------------------------------------------- |
| Add ARIA attributes across all fields                              |
| Support "focus on page load" for all fields without opening panels |

---

## Phase 6 — Docs, Tooling And Release

Release-readiness. The Angular major upgrade lands here.

| Item                                                                                                                                                           |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upgrade Angular and refresh all dependencies; reconcile the `ngx-mask` major with it                                                                           |
| Refresh usage documentation                                                                                                                                    |
| Demo: add a group example via `ngModelGroup`                                                                                                                   |
| Write a "how to create a custom field" guide                                                                                                                   |
| README: add GitHub badges                                                                                                                                      |
| README: add an exact per-field / per-component feature list                                                                                                    |
| Add `CONTRIBUTING.md`                                                                                                                                          |
| Add a logo for `ngx-formidable`                                                                                                                                |
| Add Storybook stories for all components, showcasing all features. (First take over conventions from the EnerQi sibling project. See the documentation there.) |
| Reconcile `publish:lib --access public` with the GitHub Packages registry                                                                                      |
| Tag the release commit (final step)                                                                                                                            |

---

## Needs Source Material

These items reference a private project (`EnerQi`) or an external link that is not accessible from the repo. Confirm the source with Chris before starting.

| Item                                             | Missing Source                               |
| :----------------------------------------------- | :------------------------------------------- |
| Refresh usage documentation                      | The `EnerQi` reference                       |
| Demo group example via `ngModelGroup`            | `EnerQi` `appointment-page.form`             |
| "How to create a custom field" guide             | `EnerQi` `ConstitutionCounterFieldComponent` |
| Option `{ descendants: true }` via `ng-template` | External ChatGPT link                        |
