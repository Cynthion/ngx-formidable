# Implementation Roadmap

Sequenced execution view of `backlog.md`. `backlog.md` stays the raw source of truth; this file orders the same items into themed phases to work through one at a time. When an item ships, update or remove it in `backlog.md` per the Definition of Done in `conventions.md`.

## Ordering Strategy

- **Correctness First**: bugs and UX defects lead; new surface comes after the base is solid.
- **Breaking Early**: the library is pre-`1.0` with no external consumers, so all breaking API changes are batched up front.
- **Validation Stays**: the Vest / `FormDirective` bridge is a core feature. The backlog item "remove validation from the library" is **dropped** and not scheduled.
- **Angular Upgrade Is Release Prep**: the major Angular upgrade is deferred to the final phase; all feature and bug work happens on the current Angular first.

---

## Phase 1 — Correctness: Bugs And UX Defects

Fix defects before adding surface. This is the north star of the roadmap.

| Group          | Item                                                                      |
| :------------- | :------------------------------------------------------------------------ |
| Date / Time    | Show the user-provided mask instead of `0` in date/time fields            |
| Date / Time    | Typing that breaks a valid date must set the form value to `null`         |
| Date / Time    | Fix the unicode-format parse bug (`yyyy-MM-dd` + `20200202` → wrong date) |
| Date / Time    | Stop arrow / left / right from moving the caret while the panel is open   |
| Label / Layout | Readonly and disabled fields must not float the label                     |
| Label / Layout | Fix multi-row label overlapping into the field — make it wrap             |
| Platform       | Fix iOS padding when the prefix is missing                                |

---

## Phase 2 — Breaking API Changes

Batch every breaking change into one pass while there are no consumers to migrate.

| Item                                                                                                       |
| :--------------------------------------------------------------------------------------------------------- |
| Rename `FieldDecoratorLayout` options `single` / `group` / `inline` → `horizontal` / `vertical` / `inline` |
| Rename `FormDirective` → `NgxFormidableFormDirective` (avoids the Angular naming clash)                    |
| Externalize icons so consumers set their own SVGs, then delete the `formidable-icon` component             |

Each rename touches the type/export, all internal references, the demo, and the docs (`ui_components.md`, root `README.md`).

---

## Phase 3 — Styling And Theming Polish

Runtime CSS-variable and theme gaps. See the styling conventions in `conventions.md`.

| Item                                                                                                             |
| :--------------------------------------------------------------------------------------------------------------- |
| Expose the hardcoded option-label gap and checkbox border thickness as CSS variables in the checkbox-group mixin |
| Override autofill styling (`input:-webkit-autofill`, etc.)                                                       |
| Add `--formidable-color-field-group-background-readonly` and `-disabled`                                         |
| Position error messages `absolute` so they do not consume layout space                                           |
| Material-style floating label originating from the placeholder                                                   |
| Tweak theme 4: tiny sizing, `border-radius: 0`, no field-group background                                        |

---

## Phase 4 — Field Features And API Additions

New capabilities across fields, built on the corrected base and stable API.

| Item                                                                                       |
| :----------------------------------------------------------------------------------------- |
| Suffix actions: clear/reset, copy, validation state, loading                               |
| Add a `subLabel` input — always-visible text below the field                               |
| Add a `defaultOption` input to select, dropdown, autocomplete, radio-group, checkbox-group |
| Do not render `formidable-field-option` when radio/checkbox groups are empty               |
| Add `{ descendants: true }` to option `@ContentChildren` so options work via `ng-template` |
| Toggle field: allow `inline` / `group` layout                                              |
| Move `FieldErrorsComponent` rendering into the decorator (currently broken for `inline`)   |
| Date field: responsive / smaller rendering for small screens                               |
| Date field: option to open the panel at the bottom of the screen (VIAC-style)              |
| Chore: prefer `queueMicrotask` over `setTimeout` where possible                            |

---

## Phase 5 — Accessibility And Focus

| Item                                                               |
| :----------------------------------------------------------------- |
| Add ARIA attributes across all fields                              |
| Support "focus on page load" for all fields without opening panels |

---

## Phase 6 — Docs, Tooling And Release

Release-readiness. The Angular major upgrade lands here.

| Item                                                                                 |
| :----------------------------------------------------------------------------------- |
| Upgrade Angular and refresh all dependencies; reconcile the `ngx-mask` major with it |
| Refresh usage documentation                                                          |
| Demo: add a group example via `ngModelGroup`                                         |
| Write a "how to create a custom field" guide                                         |
| README: add badges                                                                   |
| README: add an exact per-field / per-component feature list                          |
| Add `CONTRIBUTING.md`                                                                |
| Add a logo for `ngx-formidable`                                                      |
| Add Storybook stories for layout options                                             |
| Reconcile `publish:lib --access public` with the GitHub Packages registry            |
| Tag the release commit (final step)                                                  |

---

## Needs Source Material

These items reference a private project (`EnerQi`) or an external link that is not accessible from the repo. Confirm the source with Chris before starting.

| Item                                             | Missing Source                               |
| :----------------------------------------------- | :------------------------------------------- |
| Refresh usage documentation                      | The `EnerQi` reference                       |
| Demo group example via `ngModelGroup`            | `EnerQi` `appointment-page.form`             |
| "How to create a custom field" guide             | `EnerQi` `ConstitutionCounterFieldComponent` |
| Option `{ descendants: true }` via `ng-template` | External ChatGPT link                        |
| Tweak theme 4                                    | Which theme file "theme 4" refers to         |
