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
