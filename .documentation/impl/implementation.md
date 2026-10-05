# Implementation Roadmap

The source of truth for outstanding work. [`impl/backlog.md`](backlog.md) is the raw intake buffer for new, untriaged ideas; this file is where they land once they are ordered into phases.

- **One Phase, One Conversation**: phases are sized to be finished in a single session. Do not merge them.
- **Delete On Ship**: when a phase ships, its entry here is **deleted**, not annotated. The commit history holds what shipped. See the Definition of Done in [`impl/definition-of-done.md`](definition-of-done.md).
- **No Silent Reordering**: a phase's dependencies are listed with it. Do not start a phase whose dependencies are open.

## Ordering Strategy

- **Bugs First**: defects lead, whichever section they came in under.
- **State Before Style**: a state hook ships before the styling that reads it: border geometry and `aria-invalid` both read the invalid-state hook.
- **Docs Last**: API documentation and the [`README.md`](../../README.md) pass come after the API stops moving.
- **Portal After The Library**: the portal must expose every field option and theme token, so it starts only once those are stable.

## Library Phases

### Phase 38: Small Fixes

Five independent defects with no decision open. Each lands with its tripwire skip removed.

- **Readonly Slider Takes No Click**: the `.is-readonly .slider-input` rule in `styles/mixins/_forms.scss` sets `pointer-events: none`, so no press reaches `preventPointerDown` and a click leaves the slider unfocused, against **What Every Field Shares** in [`user/fields.md`](../user/fields.md). Delete the declaration. The `READONLY_SLIDER_UNCLICKABLE` skip in `focus.spec.ts` passes, and `blocked-edits.spec.ts` stays green.
- **Value-Top Adornment Above The First Line**: `field-prefix-suffix-value-top` in `styles/mixins/_forms.scss` offsets a textarea's prefix and suffix by its top padding from the field's outer edge, one field border short. Add the border: `top: calc(#{field-border-thickness()} + max(...))`. The `VALUE_TOP_ABOVE_FIRST_LINE` skip in `field-decorator.spec.ts` passes.
- **Mask Length Trims Its Alternatives**: `analyzeMaskDisplayLength` in `mask.helpers.ts` trims a mask and each of its `||` alternatives, which ngx-mask does not, so a mask opening or closing on a space counts short for the `minlength` and `maxlength` warnings. Drop the `trim()`. `mask.helpers.spec.ts` drops its `UNTRIMMED` filter and generates such masks too, plus one example such as `' 000 ||00'`.
- **Unreachable Focus Guard**: `AutocompleteField.setFilterText` emits `filterChange` only while the field is not focused, but its one caller, the render effect, already returns while the field is focused. Delete the check in `setFilterText`, and move its explaining comment beside the effect's check, which also keeps the typed text from being overwritten. `autocomplete-filter-sync.spec.ts` stays green.
- **Tab Out Of An Open Calendar**: with the date field's calendar open, `Tab` closes the panel through a signal, but `.open` leaves only once change detection runs, after the browser has moved focus to the calendar's Previous Month button, which then hides and drops it. Set `inert` on the panel synchronously in `DateField.togglePanel`. A closed panel is already `visibility: hidden`, so no template binding is needed, and the calendar has no keyboard navigation (`keyboardInput: false`), so nothing becomes unreachable. The `TAB_INTO_CLOSING_CALENDAR` skip in `panel.spec.ts` passes, and `date-panel.spec.ts` stays green.

### Phase 39: ngx-mask Owns The Masked Value

The masked editor bypasses `NgxMaskDirective`'s value channel. `BaseTextField` and `BaseDateTimeField` write the editor's text themselves, past ngx-mask, and read it back on `input`, so ngx-mask's own state stays empty and its own reports reach nobody. Lands before the release, because it changes the value a masked field writes.

- **Mask State Behind A Written Value**: in a field holding a value the form wrote, `Ctrl`/`Cmd` + `A` selects nothing, and a click inside the selection keyboard focus made keeps that selection instead of placing the caret, because ngx-mask clamps both to the empty value it believes. The portal's Phone Number, Date and Time show it. The `MASK_STATE_BEHIND` skips in `focus-caret.spec.ts` and `focus-caret-keys.spec.ts` pass once it is fixed.
- **Backspace Over A Whole Masked Text**: over a whole selected text, ngx-mask clears the editor on `keydown` with no `input` event and reports the empty value only through its `value` model. The field never binds that model, so no `valueChange` fires either, and the model keeps the old value while the form calls itself valid. `Delete` takes the browser's path and empties both. The `BACKSPACE_UNREPORTED` skips in `focus-caret-keys.spec.ts` and `date-time-field.spec.ts` pass once it is fixed.
- **Masked Model Keeps Its Literals**: `BaseTextField.value` is documented as the text unmasked, and `dropSpecialCharacters` defaults to `true`, yet typing `0791234567` into `000 000 00 00` writes `079 123 45 67`: `editorValue` re-applies the mask through `NgxMaskPipe` rather than removing it.
- **Decision**: the model is the value ngx-mask reports. `dropSpecialCharacters: true`, the default, drops the literals; a consumer who wants them sets it to `false`, as `date-field` and `time-field` already do. This breaks consumers who read the spaces.
- **Fix**: bind the masked editor of `input-field`, `textarea-field`, `date-field` and `time-field` through ngx-mask's `[value]` and `(valueChange)`. The date and time fields take the text from `(valueChange)` and keep parsing it. Then delete what the binding replaces: the `NgxMaskPipe` in `render` and in `editorValue`, and the masked `render`'s `setTimeout`, since `writeValue` itself defers a value that arrives before the directive is configured. `textarea-field`'s counter counts what `maxlength` counts, the editor's text.
- **Evidence**: writing through `NgxMaskDirective.writeValue` alone passes both `MASK_STATE_BEHIND` specs and keeps the caret, focus, mask placeholder, repaint and value round-trip specs green. Binding `[value]` on top fixes Backspace, but against a model that keeps the literals ngx-mask's echo rewrites the display and 30 of those specs fail. The single channel needs the decision above.
- **A Step Still In Flight**: `stepSegment` steps the editor's text, and its commit renders the new text from the masked `render`'s `setTimeout`, so a second arrow pressed in the same task steps the old text again. Human key repeat is slower than the timer; automated input is not. With that timer gone the `STEP_IN_FLIGHT` skip in `date-time-field.spec.ts` should pass, and the selection timer in `stepSegment` that waits behind it may go too. If the skip still fails, step from the text the pending render writes rather than from the editor.
- **Breakage To Update**: the portal's phone rule, `caret.spec.ts` and the value round-trip specs expect the spaces. Signal Forms rules such as `pattern` and `minLength` then read the unmasked value, while the native `minlength` and `maxlength` count the display; [`user/fields.md`](../user/fields.md) states both. The doc comments on `BaseTextField.value` and `dropSpecialCharacters`, and the write past ngx-mask in [`tech/caret.md`](../tech/caret.md), follow the change.
- **Proof**: the `MASK_STATE_BEHIND`, `BACKSPACE_UNREPORTED` and `STEP_IN_FLIGHT` skips pass, and the full suite is green. On the served portal: `Tab` into Phone Number, `Backspace`, and the model drawer holds an empty value.

### Phase 40: Date Parsing

All three in `helpers/format.helpers.ts`. No dependencies.

- **Parse Against Today**: `parseUnicodeDateTime` passes `new Date()` as date-fns' reference date, which fills the parts a format leaves out. On a day a daylight-saving switch skips an hour, a time in that hour shifts and fails the round trip: `02:30` in Europe/Zurich on 2026-03-29 parses to `03:30`. A format without a month or year, such as `dd.MM`, rejects a day today's month or year lacks: 29 February in a common year. Parse against a fixed `new Date(2000, 0, 1)` instead: a leap year, a 31-day month, and no switch.
- **Decision**: a time field keeps its 1970 date through `normalizeDatePart`. A date format without a year takes the year 2000 rather than the current one, which [`user/fields.md`](../user/fields.md) states.
- **Case Of Typed Names**: date-fns reads `dec` and `pm` whatever their case, but the round-trip check compares the formatted date with the typed text exactly, so `15 dec 2024` against `dd MMM yyyy` and `02:30 pm` against `hh:mm a` report a `parse` error, though the mask accepts lowercase letters. Compare without case. The commit renders date-fns' own case.
- **Meridiem Before A Dot**: date-fns reads a dot right after the meridiem as part of it, `PM.` as `p.m.`, so a format such as `hh a.mm` never parses what it renders. `validateUnicodeTokenFormat` rejects a meridiem token followed by `.`, and `format.helpers.spec.ts` generates that shape as a rejected format instead of leaving it out.
- **Proof**: `format.helpers.spec.ts` drops its pinned system time unless another property still reads today. Examples: `29.02` against `dd.MM` parses, and typed names in any case parse. The daylight-saving case shows only under a switching time zone, which CI does not run, so check it once locally under `TZ=Europe/Zurich`.

### Phase 41: Option Field Rules

Two rules for the option fields, each stated in [`user/fields.md`](../user/fields.md). No dependencies.

- **Highlight On A Disabled Option**: when the list changes, `BaseOptionField` places the highlight on the selected option, or else on the one highlighted before, without checking that either can be picked; only the clamp skips disabled and readonly options. The highlight can then rest where `Enter` picks nothing.
- **Rule**: the highlight never rests on an option that cannot be picked, the selected one included, as the arrows and the clamp already do. Both branches fall through to the clamp when their option cannot be picked. `option-highlight.spec.ts` proves it: rebind the list with the highlighted option disabled, then with the selected one disabled, and each time the highlight moves to the next pickable option and `Enter` picks it.
- **Display Label Selected On Tab**: `Tab` into a dropdown holding a value leaves Chrome's select-all on its label, painted in the selection colour, though the dropdown keeps `Cmd`/`Ctrl` + `A` from the browser so that no highlight appears on a label it draws. The portal's Pizza shows it.
- **Rule**: a display-only label is never selected. Typing in a dropdown searches its options and never replaces the label, so the reason **The Caret On Focus** in [`user/fields.md`](../user/fields.md) gives for selecting a keyboard entry's content does not apply. `DropdownField.doOnFocusChange` collapses the selection on focus, and the select-all guard stays. That section gains the display-only row. `display-only-selection.spec.ts` gains a `Tab` focus case.

### Phase 42: Release

- **Version**: `1.0.0` in `projects/ngx-formidable/package.json`. The Angular peer floor is the minor CI tests, per [`impl/renovate.md`](renovate.md).
- **Publish**: `npm run screenshots` for the README hero, then [`impl/releasing.md`](releasing.md).
- **Tag**: tag the release commit. Final step.

### Phase 43: Storybook

- **Set It Up**: Storybook is not installed. Take conventions from the sibling project's `storybook.md` and its `.storybook` configuration first. Copy it into this repo from EnerQi repository.
- **Stories**: all components, including the layout options.
- demonstrate all fields, directives and decorator, including their properties.

### Phase 44: Date Range Field

- **The Calendar Is Not The Problem**: Pikaday renders ranges, with `startRange` / `endRange` options and `is-inrange` / `is-startrange` / `is-endrange` classes. What it does not do is manage range _selection_; that is driven from `onSelect`, or with two instances.
- **The Value Contract Is**: `date-field` is single-valued end to end: `Date | null`, one picker, one masked input with one `unicodeTokenFormat`, arrow-stepping over that one date, and `isFilled`. A range mode means a tuple value, a two-segment mask, parse and format path, per-segment arrow-stepping and clear semantics, and range styling that `_pikaday.scss` does not have.
- **Size It Honestly**: the largest single item on this roadmap. Split it before starting.

### Phase 45: AI Support

I want to support developers to use AI to use this library. How can I do that? Should that be done with an MCP? What are other ways?

### Phase 46: Blog Post

- **Where**: [The Dev Exchange](https://thedevexchange.com/), the company dev blog.
- **What**: the library, its features, and how it is used to build beautiful, functional Angular forms. Code examples, screenshots, links to the portal and the GitHub repository. Why it beats other form libraries, and a call to action to try it.
- **Interview First**: interview me before writing, to get my perspective on the library, its development process and its roadmap. The narrative comes out of that, not out of the code.
- **Tone**: humorous and light, informative and professional. Conversational, so the reader feels part of the journey.
- **Include A Lessons-Learned Section**: the challenges hit during development and how they shaped the library's design. That is what gives readers the thinking behind the features.
