# Implementation Roadmap

Sequenced execution view of `backlog.md`. `backlog.md` stays the raw source of truth; this file orders the same items into phases.

- **One Phase, One Conversation**: phases are sized to be finished in a single session. Do not merge them.
- **Delete On Ship**: when a phase ships, its `backlog.md` items are **deleted**, not annotated. See the Definition of Done in `conventions.md`.
- **No Silent Reordering**: a phase's dependencies are listed with it. Do not start a phase whose dependencies are open.

## Ordering Strategy

- **Bugs First**: defects lead, whichever `backlog.md` section they are filed under.
- **State Before Style**: the invalid-state hook was a prerequisite for both border geometry (Phase 7) and `aria-invalid` (Phase 11), and shipped ahead of them.
- **Docs Last**: API documentation and the `README.md` pass come after the API stops moving.
- **Portal After The Library**: the portal must expose every field option and theme token, so it starts only once those are stable.

---

## Phase Overview

|  Phase | Title                               | Depends On |
| -----: | :---------------------------------- | :--------- |
|      7 | Border Geometry                     | —          |
|      8 | Date And Time Keyboard              | —          |
|      9 | Date Panel Responsiveness           | —          |
|     10 | Small API Additions And Chores      | 8          |
|     11 | ARIA — Fields, Errors, Support Text | —          |
|     12 | ARIA — Panel And Option Fields      | 11         |
|     13 | API Doc Comments                    | 1–12       |
|     14 | README And Project Docs             | 13         |
|     15 | Storybook                           | 13         |
|     16 | Release                             | 14         |
|     P1 | Portal — Design Proposal            | 16         |
| P2–P10 | Portal — Build                      | P1         |

---

## Library Phases

### Phase 6.5

Define a "required" indicator on the label that will be suffixed to it (e.g., "\*", but customizable); does that make sense? Idea is to visually show what is rquired;

### Phase 7 — Border Geometry

The invalid hook it needs shipped with Phase 6.

- **Per-State Bottom Border**: thickness and color for invalid and focused. Today the border is a single all-sides shorthand with one thickness scalar; only the color varies by state. material has a thicker bottom border for certain states; is a property distinguishing the error (and other states) design required (all borders colored vs only bottom)?
- **Per-Corner Radius**: so a field can be, for example, top-rounded only.
- **Split The Shared Radius First**: `--formidable-field-border-radius` is the fallback source for the toggle thumb, the slider track, thumb, tick mark and thumb label, and the date panel. Give those their own tokens before splitting the field radius, or a multi-value string leaks into all of them.
- **Watch The Layout Math**: `--formidable-field-border-thickness` feeds `--formidable-field-inner-height` and every label offset. A per-state thickness must not shift layout between states.
- label position border: depending on the thickness of the border (e.g. example theme 2), the border behind the label is still partly visible; also focus state and other things might change the border thickness

**Clears**: the bottom-border and corner-radius items.

### Phase 8 — Date And Time Keyboard

- **ArrowDown Must Not Open The Panel**: `date-field` opens the panel on ArrowDown when closed. It should navigate the value instead; arrows drive the panel selection only while the panel is open.
- **Segment-Aware Increment**: ArrowUp / ArrowDown increment and decrement the year, month or day under the caret in `date-field`, and the hour or minute in `time-field`. Today `date-field` only does whole-date steps while the panel is open, and `time-field` has no arrow handling at all — its registered keys are `Enter` only.

**Clears**: both date/time keyboard items.

### Phase 9 — Date Panel Responsiveness

- **Small Screens**: render `DateFieldComponent` smaller or better on narrow viewports. The library currently has no responsive rules for it.
- **Bottom Sheet**: an option to show the panel at the bottom of the screen, keyboard-style. `FormidablePanelPosition` is horizontal-only today; the only vertical logic is the flip-above in `position.helpers.ts`.

**Clears**: both date-panel items.

### Phase 10 — Small API Additions And Chores

Depends on Phase 8 (focus-on-load pairs with the ArrowDown change).

- **Toggle Layout**: expose `decoratorLayout` as an input on `ToggleFieldComponent`; it is hardcoded to `inline` today.
- **Focus On Page Load**: an input on `BaseFieldDirective` to focus a field on load, without opening a panel. No public `focus()` exists today. Panels do not open on focus, so the constraint already holds — this is about adding the API.
- **Timer Audit**: prefer `queueMicrotask` over `setTimeout`. Most option paths already use it; the remainder are layout, scroll and focus call sites, and some of those genuinely need `requestAnimationFrame`. Audit each, do not blanket-replace.

**Clears**: the toggle-layout, focus-on-load and `queueMicrotask` items.

### Phase 11 — ARIA: Fields, Errors And Support Text

The invalid state it needs shipped with Phase 6. The support text it describes shipped with the hint row.

- **State Attributes**: `aria-invalid`, `aria-required`, `aria-readonly`, `aria-disabled`.
- **Descriptions**: `aria-describedby` linking the field to its errors and its support text.
- **Group Naming**: the `vertical` branch of the decorator renders a plain `div` instead of a `label`, so radio and checkbox groups have no accessible name at all. Fix that first — it is the worst gap.
- **Widget State**: `aria-checked` on the toggle (it has `role="switch"` but signals state only through a CSS class), and `aria-valuenow` plus a label on the slider.

### Phase 12 — ARIA: Panel And Option Fields

Depends on Phase 3 (the option query changes) and Phase 11.

- **Combobox Pattern**: `role="combobox"`, `role="listbox"` and `role="option"`, with `aria-expanded`, `aria-controls` and `aria-activedescendant` for `dropdown-field`, `autocomplete-field` and `date-field`. `field-option.component.html` carries no role today.
- **Option State**: `aria-checked` on radio and checkbox options.

**Clears** (with Phase 11): the ARIA item.

### Phase 12.5 - Cleanup SCSS

- Group and order mixins in `_forms.scss` to match the order of the fields in `public-api.ts`. This is a cosmetic change only, but it makes the file easier to read and maintain. Shared mixins should be grouped hierarchically at the top.
- Improve documentation in `_forms.scss` with a short description of each mixin's purpose and usage. This will help future developers understand the intent behind each mixin and how to use them effectively. Keep it brief and short, not too detailed, but relevant.
- Group and order the tokens in `_tokens.scss` to match the order of the fields in `public-api.ts`. This is a cosmetic change only, but it makes the file easier to read and maintain. Shared tokens should be grouped hierarchically at the top.
- Equivalently, group and order the tokens in `_formidable-vars.scss` to match the order of the fields in `public-api.ts`. This is a cosmetic change only, but it makes the file easier to read and maintain. Shared tokens should be grouped hierarchically at the top.
- Documentation of tokens (same order) must be extracted from README.md into a dedicated markdown document.

### Phase 12.6 - Define Default Theme

- Material has a default theme, and the library should have one too. The default theme should be defined in `_tokens.scss` and `_formidable-vars.scss`, and it should be applied to all fields by default. The default theme should be consistent with the design system and the branding of the library. The default theme should be documented in the dedicated markdown document for tokens.
- Propose some pretty default themes first. AskUserQuestions.

### Phase 13 — API Doc Comments

Depends on Phases 1–12 — do not document an API that is still moving.

- **Model Coverage**: document every export in `formidable.model.ts`. Roughly a third of the interfaces have no doc block, and the central `IFormidableField` has one documented member out of fourteen. `IFormidableToggleField` has nothing.
- **Public API**: same pass over the remaining `public-api.ts` exports.
- **Keep It Short**: one line of intent per symbol. This is a library — users read these in their editor.
- **Re-Verify `ui_components.md`** against the shipped reality. Brief and exact, not prose. Keep the details relevant or avoid them. It will be the catalogue of the library's public API, so it must be correct. The current version is out of date and has drifted from the code. May rename the file.

**Clears**: the interface-documentation and `ui_components.md` items.

### Phase 14 — README And Project Docs

Depends on Phase 13.

- **Correctness Pass**: the root `README.md` is long and has drifted. Make the feature list sell every feature.
- **Token Table**: sync it against the real `:root` declarations — it misses the runtime-only inset variables and is inconsistent on the slider group. Fix the unterminated code fence at the end of the file.
- **Badges**: the badge block is commented out and still points at another project's URLs. Repoint and enable it.
- **Feature List**: exact per-field and per-component feature list.
- **Custom Field Guide**: how to build one, using the consumer's `ConstitutionCounterFieldComponent` as the worked example.
- **Usage Refresh And Group Example**: refresh usage docs and add an `ngModelGroup` example to the demo, using the consumer's `appointment-page.form.ts` and its form component as the reference.
- **Project Files**: add `CONTRIBUTING.md` (today a short list inside `README.md`) and a logo (there is no image asset; the title is plain text).
- README.md must be overhauled. It is the starting place for a consumer, so it must sell every feature. The feature list is out of date.
- Add a documentation hierarchy for examples, etc. so that README.md is not overcrowded.
- Add reasoning why this library is an alternative to Angular Material, and why it might be a better choice for some use cases.
- Overall, make sure to use ubiquitous and consistent terminology throughout documentation and code.

**Clears**: the usage-docs, badges, feature-list, group-example, `CONTRIBUTING.md`, logo, custom-field and README items.

### Phase 15 — Storybook

Depends on Phase 13.

- **Set It Up**: Storybook is not installed. Take conventions from the sibling project's `storybook.md` and its `.storybook` configuration first.
- **Stories**: all components, including the layout options.

**Clears**: the Storybook item.

### Phase 16 — Release

- **Registry**: reconcile `publish:lib --access public` with the GitHub Packages registry.
- **Tag**: tag the release commit. Final step.
- **Known Trade-Off**: this releases on the current Angular major with the existing `ngx-mask` peer mismatch, because the dependency refresh is unscheduled. See _Deferred And Unscheduled_ in `backlog.md`.

**Clears**: the release-tag item.

---

## Portal Phases

`backlog.md` requires a page structure and layout proposal before any portal code, so P1 is a document needing sign-off.

| Phase | Title                | Scope                                                                                                                                           |
| ----: | :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
|    P1 | Design Proposal      | Page structure, layout, optional navigation. Document only — needs approval before P2                                                           |
|    P2 | Shell                | Routes (there are none today), navigation, page layout, repository link; portal controls use the library's own components with a distinct theme |
|    P3 | Preview Form         | Grid layout, several fields per type to demo config variations, fully functional, distinct starting theme                                       |
|    P4 | Form Values View     | Expandable and collapsible panels showing what has been entered                                                                                 |
|    P5 | Field Options Editor | Every option of every field, live preview                                                                                                       |
|    P6 | Theme Editor         | Every token via color pickers and sliders, live preview, copy-paste export                                                                      |
|    P7 | Adornment Config     | Prefixes and suffixes as icons, text or buttons; i18n switcher to demo the date field                                                           |
|    P8 | Markup Editor        | Edit the preview form, add and remove fields                                                                                                    |
|    P9 | Portal Docs          | Inline per-option documentation plus a separate documentation page                                                                              |
|   P10 | Cutover              | Remove the example form, portal becomes the Pages deploy, add the portal to the Definition of Done in `conventions.md`                          |

**P6 Note**: four variables are set imperatively and never declared in `:root` — the two value insets, the value padding top and the value top. A token editor cannot discover them without a generated manifest.

---

## Already Shipped

Kept for context only; the detail lived in the previous revision of this file and in the commit history.

| Pass                         | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bugs And UX Defects          | Date/time mask display, parse and caret fixes; readonly and disabled labels no longer float; single-line ellipsized labels                                                                                                                                                                                                                                                                                                                                                                               |
| Decorator Layout Measurement | Padding moved from inline styles to CSS, measured in a `ResizeObserver`; the in-field toggle joined the value inset; nested `package-lock.json` removed. The consumer tarball rebuild was dropped from the phase and stays in `backlog.md`                                                                                                                                                                                                                                                               |
| Breaking API                 | `FieldDecoratorLayout` renamed to `horizontal` / `vertical` / `inline`; the whole `Form*` family prefixed `NgxFormidable`; icons externalized                                                                                                                                                                                                                                                                                                                                                            |
| Styling And Theming          | New group and autofill tokens; the label became an explicit `position` choice; errors moved to a decorator slot below the field container                                                                                                                                                                                                                                                                                                                                                                |
| Decorator Slot Cleanup       | The tooltip slot became `[formidableFieldLabelAdornment]` and now collapses with the label's row; prefix and suffix became `horizontal` and `inline` only; the `--formidable-color-field-tooltip` token was dropped                                                                                                                                                                                                                                                                                      |
| Hint Text                    | `FieldHintDirective` plus a decorator hint row below the field; hints share the row and each aligns itself. No `FieldHintComponent`: a hint has no logic, so projection was enough. The errors mixin's `margin-bottom` went away — spacing below a decorator is the consumer's                                                                                                                                                                                                                           |
| Option Fields                | `{ descendants: true }` on all five option queries; a `defaultOption` / `defaultOptionMode` input pair; the group empty state became plain text. The duplicated `computeAllOptions` collapsed into two tested helpers                                                                                                                                                                                                                                                                                    |
| Field State Styling          | An `is-invalid` host class on the decorator, fed by the errors component; a colour token per state for background, border, text and label; and a sixth label position, `inside-placeholder`, whose resting label stands in for the placeholder and hides it until focus — `inside` itself is unchanged. Groups reuse the field's state colours, and the toggle's and slider's tracks follow them. The dead `--formidable-color-slider-thumb-border` override was renamed to the name `_forms.scss` reads |
| Prefix And Suffix            | An `align` input on both adornment directives (`center` / `value`), and a `_globals.scss` exception that makes a projected `button` / `a` clickable. No action components: the demo and `README.md` carry the clear, copy, validation-state and loading recipes instead                                                                                                                                                                                                                                  |

---

## Found During Analysis

Defects that were not in `backlog.md` when this roadmap was written. Recorded here so they are not rediscovered.

| Finding                                                                                                                                                                                                                                                                                                | Disposition                             |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------- |
| The `descendants` backlog item's premise was wrong: Ivy's shallow content query already reaches into `@for`, `*ngIf` and `<ng-template>`. What it misses is an option nested in a wrapper **element**. `{ descendants: true }` shipped anyway and now covers both; `option-projection.spec.ts` pins it | Corrected while shipping Phase 3        |
| Sharing one option `<ng-template>` across two fields is impossible: Angular resolves parent injection and content-query membership from the template's declaration site, so it must be written inside the field. EnerQi's constitution-form TODO cannot be done this way                               | Tell the consumer; not a library change |
| Stale `package-lock.json` in the library project                                                                                                                                                                                                                                                       | Removed, with a `.gitignore` guard      |
| The demo writes the selected theme to `localStorage` but never reads it back on init                                                                                                                                                                                                                   | Added to `backlog.md`, not scheduled    |
| No CI workflow; `deploy.yml` reinstalls from scratch rather than from the lockfile                                                                                                                                                                                                                     | Added to `backlog.md`, not scheduled    |
