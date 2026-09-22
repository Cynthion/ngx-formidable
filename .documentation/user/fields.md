# Fields

How the library's fields behave: what every field shares, how options are supplied, where a panel opens, what the keyboard does, and how masking is configured.

Which field to pick, and the full input list for each, is in `user/components.md`. What goes _around_ a field — label, prefix, suffix, hint, required marker — is in `user/decoration.md`.

## What Every Field Shares

Every field is a `ControlValueAccessor`, so it binds with `ngModel` and carries the same base inputs.

| Input                | Does                                                                           |
| :------------------- | :----------------------------------------------------------------------------- |
| `name`               | The control name, the model key and the validation target, in one string       |
| `placeholder`        | Placeholder text. A field with one leaves an `inside` label nothing to rest in |
| `readonly`           | Blocks edits, stays focusable, keeps its focus ring                            |
| `disabled`           | Blocks edits and leaves the tab order                                          |
| `showRequiredMarker` | Marks the label and sets `aria-required` — see `user/decoration.md`            |
| `autoFocus`          | Focuses the field once its view is ready                                       |

And the same outputs: `valueChanged` / `focusChanged` as signal outputs, `valueChange$` / `focusChange$` as observables.

---

## Focus

Every field has a `focus()` method. `autoFocus` calls it once the view is ready, which is how a field is focused on page load:

```html
<!-- focused on load -->
<formidable-input-field
  name="firstName"
  [autoFocus]="true"
  ngModel />

<!-- or from anywhere that can reach the field -->
<formidable-dropdown-field
  #nationality
  name="nationality"
  ngModel />
<button
  type="button"
  (click)="nationality.focus()">
  Jump to Nationality
</button>
```

**Focusing Never Opens A Panel.** The dropdown, autocomplete and date fields open on click, on `ArrowDown`, or on typing, so a focused field is ready for input without a list covering the page. A `disabled` field ignores `focus()` entirely.

---

## Options

Five fields take options: `select-field`, `dropdown-field`, `autocomplete-field`, `radio-group-field` and `checkbox-group-field`. Options come from an input, from projected components, or from both at once.

```html
<formidable-dropdown-field
  name="hobby"
  [options]="hobbyOptions"
  [defaultOption]="{ value: '', label: 'None' }">
  <!-- projected options may sit anywhere inside the field, including in a @for or a wrapper element -->
  <formidable-field-option [value]="'gardening'">Gardening</formidable-field-option>
</formidable-dropdown-field>
```

| Input               | Does                                                                                           |
| :------------------ | :--------------------------------------------------------------------------------------------- |
| `options`           | The option list, as `IFormidableOption[]`                                                      |
| `defaultOption`     | One option pinned to the top, exempt from `sortFn` and from filtering                          |
| `defaultOptionMode` | `'always'` (pinned whatever else is there) or `'fallback'` (only when the list would be empty) |
| `sortFn`            | Comparator applied to the combined list                                                        |
| `noOptionsText`     | What an empty list says                                                                        |

**Projected Options Must Be Written Inside The Field.** Angular resolves both the parent injection and the content query from where the option is _declared_, not from where it renders, so an option in a shared template outside the field cannot join it.

**An Option Owns Its Own Content.** Anything projected into `formidable-field-option` becomes that option's template, which is how an option carries a subtitle, an icon or highlighted match text. Its `select` and `match` inputs override what picking it does and how the autocomplete filter matches it.

**The Autocomplete Does Not Filter For You.** It emits `filterChanged` and renders whatever `options` it is given back, so the matching strategy — substring, fuzzy, a server call — stays yours.

---

## Panels

`dropdown-field`, `autocomplete-field` and `date-field` render their content in a panel, placed by `panelPosition`.

| Value   | Places the panel                                                               |
| :------ | :----------------------------------------------------------------------------- |
| `left`  | Anchored to the field's left edge                                              |
| `right` | Anchored to the field's right edge                                             |
| `full`  | Anchored across the field's full width                                         |
| `sheet` | Fixed across the bottom of the viewport, full width, square at the screen edge |

The three anchored values flip above the field when there is no room below, and adopt the two field corners they sit against so the pair reads as one box. A sheet never flips.

Opening a panel scrolls the field, or the panel, into view — but only the one that the viewport actually cuts off.

```html
<formidable-date-field
  name="birthdate"
  [panelPosition]="'sheet'" />
```

Two things to know before reaching for a sheet:

- **A Sheet Is `position: fixed`**, which any ancestor with a `transform`, `filter` or `contain` turns back into an ordinary absolute box. Keep those off the elements the field sits in.
- **An Autocomplete Sheet Keeps Focus In Its Filter Input** — that is what makes it type-ahead — so a soft keyboard can cover it. The date field moves focus to the panel instead, so its sheet stays clear.

Whatever the placement, the calendar scales to the width its panel has: `--formidable-date-field-panel-width` is the width it _prefers_, not one it is fixed at.

---

## Keyboard

Every control is operable from the keyboard. Disabled and readonly fields ignore navigation.

- **Panel** — the dropdown, autocomplete or date overlay. Panels close on `Esc`, or when focus leaves the field.
- **Segment** — the part of the `unicodeTokenFormat` under the caret: the year, month or day of a date field, the hour, minute, second or AM/PM of a time field.

| Key                  | Inputs / Textareas | Select / Dropdown / Autocomplete                    | Radio / Checkbox Groups | Date Field                                    | Time Field                |
| :------------------- | :----------------- | :-------------------------------------------------- | :---------------------- | :-------------------------------------------- | :------------------------ |
| `Tab`                | Move to next       | Close panel (if open), then move                    | Move to next            | Close panel (if open), then move              | Move to next              |
| `Shift` + `Tab`      | Move to previous   | Close panel (if open), then move                    | Move to previous        | Close panel (if open), then move              | Move to previous          |
| `Enter`              | —                  | If panel open: choose highlighted option            | —                       | Parse and accept the date                     | Parse and accept the time |
| `Esc`                | —                  | Close panel                                         | —                       | Close panel                                   | —                         |
| `Arrow Up`           | —                  | If open: previous option (wraps)                    | Previous option         | If panel open: previous week; else segment up | Segment up                |
| `Arrow Down`         | —                  | If closed: open panel; if open: next option (wraps) | Next option             | If panel open: next week; else segment down   | Segment down              |
| `Alt` + `Arrow Up`   | —                  | —                                                   | —                       | Close panel                                   | —                         |
| `Alt` + `Arrow Down` | —                  | —                                                   | —                       | Open panel                                    | —                         |
| `Arrow Left`         | —                  | —                                                   | —                       | If panel open: previous day; else move caret  | Move caret                |
| `Arrow Right`        | —                  | —                                                   | —                       | If panel open: next day; else move caret      | Move caret                |

### Type-Ahead

Typing into a dropdown or autocomplete builds a short buffer and highlights the first matching option. Backspace edits the buffer, the first character opens a closed panel, and the buffer clears itself after a pause.

### Stepping A Date Or Time Segment

`ArrowUp` and `ArrowDown` step the segment under the caret and leave it selected, so repeated arrows stay on it and the next digit typed replaces it.

- An empty field is seeded before it is stepped — a date with today, a time with midnight — so the arrows alone can fill one.
- A date step that would leave `minDate` or `maxDate` is refused rather than clamped.
- A plain `ArrowDown` does not open the date panel. `Alt` plus the arrows works the panel, per the ARIA combobox pattern.

---

## Dates And Times

Both masked fields parse and format through one `unicodeTokenFormat`, a date-fns token string, and both hold a `Date`.

| Input                | Does                                                                |
| :------------------- | :------------------------------------------------------------------ |
| `unicodeTokenFormat` | The token string the field masks, parses and formats with           |
| `emptyHint`          | What an empty, unfocused field shows: `'underscores'` or `'format'` |

A focused empty field always shows underscore slots, because the mask's caret arithmetic only recognises its own placeholder character.

The date field passes a set of options straight through to Pikaday — `minDate`, `maxDate`, `firstDay`, `i18n`, `yearRange`, `disableWeekends`, `disableDayFn` and the rest, listed in `user/components.md`. Each is applied to the calendar when it changes at runtime.

**The Toggle Icon.** The date field's panel toggle draws a CSS arrow by default. The library ships no icons, so to replace it, project your own:

```html
<formidable-date-field
  name="birthdate"
  ngModel>
  <span formidableFieldToggleIcon>📅</span>
</formidable-date-field>
```

The toggle centres what is projected; its size, colour and hover feedback are yours.

---

## Masking

`input-field` and `textarea-field` mask through ngx-mask, and take almost all of its options. Config resolves in three layers: a per-field `maskConfig` overrides the app-wide defaults, which override the library's own.

**Per Field**

```html
<formidable-input-field
  name="price"
  [mask]="'000.00'"
  [maskConfig]="{ prefix: 'CHF ', decimalMarker: ',' }"
  ngModel />
```

Set `mask` when you want masking; `maskConfig` is optional on top of it.

**App-Wide**

```ts
bootstrapApplication(AppComponent, {
  providers: [
    ...provideNgxFormidable({
      globalMaskConfig: { validation: true, dropSpecialCharacters: true }
    })
  ]
});
```

`NgxFormidableModule.forRoot()` takes the same object. Either way it lands on the `FORMIDABLE_MASK_DEFAULTS` token.

**A Masked Field Commits On Blur.** A half-typed date is not a date, so the masked fields keep what is typed in the DOM until focus leaves. The one exception is wiping the text: clearing a committed value reports `null` immediately, so the field is empty rather than stale.

### The Caret In A Masked Field

A mask renders a `_` slot for every character not yet typed, and those slots are part of what a pointer can aim at.

| Field Holds           |     Focused By      | Caret Lands                                                        |
| :-------------------- | :-----------------: | :----------------------------------------------------------------- |
| Nothing but slots     | Keyboard or pointer | At the front, where typing starts                                  |
| Some text, some slots |      Keyboard       | In front of the first unfilled slot, where the next character goes |
| Some text, some slots |       Pointer       | Where the click landed, on text or on a slot alike                 |
| Text, no slots left   |      Keyboard       | At the end                                                         |
| Text, no slots left   |       Pointer       | Where the click landed                                             |

`Arrow Left` and `Arrow Right` always move the caret. Select all covers the text that has been typed and never the slots, so it selects nothing in a field holding only slots.
