# Fields

How the library's fields behave: what every field shares, how options are supplied, where a panel opens, what the keyboard does, and how dates, times and masks are configured.

Which field to pick, and the full input list for each, is in [Components](components.md). What goes _around_ a field (label, prefix, suffix, hint, required marker) is in [Decoration](decoration.md). How a field binds to each forms API is in [Forms](forms.md).

## What Every Field Shares

Every field is Angular's `FormValueControl`: `[formField]`, `[formControl]`, `formControlName` and `ngModel` all bind it through its `value`, and each forms API writes the state it holds into the field's inputs.

| Input         | Does                                                                                              |
| :------------ | :------------------------------------------------------------------------------------------------ |
| `name`        | The native `name` of the field's control. `[formField]` writes it                                 |
| `placeholder` | Placeholder text. A field with one leaves an `inside` label nothing to rest in                    |
| `readonly`    | Blocks edits and leaves the tab order. A click or `focus()` still focuses it, focus ring included |
| `disabled`    | Blocks edits and leaves the tab order                                                             |
| `required`    | Marks the label and sets `aria-required`, and validates nothing. See [Decoration](decoration.md)  |
| `autoFocus`   | Focuses the field once its view is ready                                                          |
| `revealOn`    | When the field's messages appear, see [Validation](validation.md)                                 |

`readonly`, `disabled` and `required` come from the forms API wherever it holds them. Bind one by hand only where it does not, as **Compatibility By Feature** in [Forms](forms.md) lists, and never beside `[formField]`, which owns all three.

| Output        | Emits                                                  |
| :------------ | :----------------------------------------------------- |
| `valueChange` | The new value, for a user's edit and never otherwise   |
| `touch`       | As the last act of a blur, when focus leaves the field |

---

## Focus

Every field has a `focus()` method. `autoFocus` calls it once the view is ready, which is how a field is focused on page load:

```html
<!-- focused on load -->
<formidable-input-field
  [autoFocus]="true"
  [formField]="form.firstName" />

<!-- or from anywhere that can reach the field -->
<formidable-dropdown-field
  #nationality
  [formField]="form.nationality" />
<button
  type="button"
  (click)="nationality.focus()">
  Jump to Nationality
</button>
```

**Focusing Never Opens A Panel**: the dropdown opens on click, on `ArrowDown` or on typing, the autocomplete on `ArrowDown` or on typing, and the date field from its toggle or `Alt` plus `ArrowDown`, so a focused field is ready for input without a list covering the page. A `disabled` field ignores `focus()` entirely.

### The Caret On Focus

| Field Holds     |     Focused By     | Caret Lands                                                    |
| :-------------- | :----------------: | :------------------------------------------------------------- |
| Nothing         | Keyboard / Pointer | At the front, wherever the pointer aimed                       |
| Text or a value |      Keyboard      | Selecting the content, so the next character typed replaces it |
| Text or a value |      Pointer       | Where the click landed, and never behind the value             |

`focus()` and `autoFocus` count as the keyboard. `textarea-field` is the exception and keeps the browser's own behaviour (a caret, no selection), because a paragraph should not be one keystroke from being wiped, and no browser does it either.

The rules run on the way in and then stop. Clicking again, moving the caret, typing or a repaint never re-runs them, so a field is never locked to one caret position; leaving the field and coming back reads the rules again against whatever it holds by then. Focusing a field never changes its value.

Browsers disagree about the keyboard half of this (Chrome selects an input's content on `Tab`, Firefox leaves a caret), so the library settles it rather than inheriting the difference.

---

## Options

Five fields take options: `select-field`, `dropdown-field`, `autocomplete-field`, `radio-group-field` and `checkbox-group-field`. Options come from an input, from projected components, or from both at once.

```html
<formidable-dropdown-field
  [options]="hobbyOptions"
  [defaultOption]="{ value: '', label: 'None' }"
  [formField]="form.hobby">
  <!-- projected options may sit anywhere inside the field, including in a @for or a wrapper element -->
  <formidable-field-option [value]="'gardening'">Gardening</formidable-field-option>
</formidable-dropdown-field>
```

| Input               | Does                                                                                           |
| :------------------ | :--------------------------------------------------------------------------------------------- |
| `options`           | The option list, as `FormidableOption[]`                                                       |
| `defaultOption`     | One option pinned to the top, exempt from `sortFn` and from filtering                          |
| `defaultOptionMode` | `'always'` (pinned whatever else is there) or `'fallback'` (only when the list would be empty) |
| `sortFn`            | Comparator applied to the combined list                                                        |
| `noOptionsText`     | What an empty list says                                                                        |

**Projected Options Must Be Written Inside The Field**: Angular resolves both the parent injection and the content query from where the option is _declared_, not from where it renders, so an option in a shared template outside the field cannot join it.

**An Option Owns Its Own Content**: anything projected into `formidable-field-option` becomes that option's template, which is how an option carries a subtitle, an icon or highlighted match text. Its `match` input overrides how the autocomplete filter matches it.

**The Autocomplete Filters, And Reports The Filter**: typing narrows the list to the options whose `match` accepts the text, by default a case-insensitive substring of the label. It also emits the text as `filterChange`, so the options can be fetched or ranked for it instead (fuzzy, a server call). Give an option a `match` of your own where your matching keeps more than a substring would.

**`filterChange` Reports More Than Typing**: a value written from outside takes the filter with it: to its option's label, or to nothing while no option carries the value. Those moves are reported too, so the list you supply can follow the value the field was given. Without them, a value written from outside names an option your filter has excluded, and the field has nothing to display it with. The one thing never reported is the field's own narrowing while it is **focused**: there the typed text is the filter, and reporting would pull the list out from under whoever is typing.

**An Action Row Is Not A Value**: `dropdown-field` and `autocomplete-field` take an `actionOption`: an entry at the end of the list that runs an action instead of committing a value. `actionOptionMode` decides whether it is always there or only when the list would otherwise be empty. What the action does is entirely yours; the field closes its panel, runs it and touches nothing else. The following is an example.

```ts
readonly filter = signal('');
readonly addresses = signal<FormidableOption[]>([...ADDRESSES]);

readonly addAddress: FormidableActionOption = {
  value: 'add-address',
  label: 'Add A New Address…',
  action: () => this.createAddress()
};

private async createAddress(): Promise<void> {
  const created = await this.dialog.open(NewAddressDialog, { street: this.filter() });
  if (!created) return;

  this.addresses.update((list) => [...list, created]);
  this.form.address().value.set(created.value);
}
```

```html
<formidable-autocomplete-field
  [options]="addresses()"
  [actionOption]="addAddress"
  [formField]="form.address"
  (filterChange)="filter.set($event)" />
```

Three things that recipe relies on:

- **The Typed Text Is Yours Already**: `filterChange` carries it, which is what lets the dialog open on "Wiesenstrasse 5" rather than on nothing.
- **The Order Of Those Two Writes Does Not Matter**: a value no option carries yet stays in the model, and the field selects it once its option arrives.
- **The List Still Reports Itself Empty**: `noOptionsText` renders beside the action entry rather than being replaced by it: nothing matched _and_ here is what to do about it.

---

## Panels

`dropdown-field`, `autocomplete-field` and `date-field` render their content in a panel, placed by `panelPosition`.

| Value   | Places The Panel                                                               |
| :------ | :----------------------------------------------------------------------------- |
| `left`  | Anchored to the field's left edge                                              |
| `right` | Anchored to the field's right edge                                             |
| `full`  | Anchored across the field's full width                                         |
| `sheet` | Fixed across the bottom of the viewport, full width, square at the screen edge |

The three anchored values flip above the field when the panel fits there and not below, measured within the viewport and every ancestor that clips its overflow, and adopt the two field corners they sit against so the pair reads as one box. A sheet never flips.

Opening a panel scrolls the field, or the panel, into view, but only the one that the viewport actually cuts off.

```html
<formidable-date-field
  [panelPosition]="'sheet'"
  [formField]="form.birthdate" />
```

Two things to know before reaching for a sheet:

- **A Sheet Is `position: fixed`**: any ancestor with a `transform`, `filter` or `contain` turns it back into an ordinary absolute box. Keep those off the elements the field sits in.
- **A Sheet Keeps Focus In The Field's Input**: as every panel does, because that is what makes the autocomplete type-ahead. A soft keyboard can therefore cover it.

Whatever the placement, the calendar scales to the width its panel has: `--formidable-date-field-panel-width` is the width it _prefers_, not one it is fixed at.

---

## Keyboard

Every control is operable from the keyboard. Disabled and readonly fields ignore navigation.

- **Panel**: the dropdown, autocomplete or date overlay. A panel closes on `Esc`, on `Tab`, on a pick, and on a click outside the field.
- **Segment**: the part of the `unicodeTokenFormat` under the caret: the year, month or day of a date field, the hour, minute, second or AM/PM of a time field.

| Key                  | Inputs / Textareas | Dropdown / Autocomplete                             | Radio / Checkbox Groups | Date Field                                         | Time Field                |
| :------------------- | :----------------- | :-------------------------------------------------- | :---------------------- | :------------------------------------------------- | :------------------------ |
| `Tab`                | Move to next       | Close panel (if open), then move                    | Move to next            | Close panel (if open), then move                   | Move to next              |
| `Shift` + `Tab`      | Move to previous   | Close panel (if open), then move                    | Move to previous        | Close panel (if open), then move                   | Move to previous          |
| `Enter`              |                    | If panel open: pick highlighted option              | Pick highlighted option | Parse and accept the date, and close the panel     | Parse and accept the time |
| `Esc`                |                    | If panel open: close panel                          |                         | Parse and accept the date; if panel open: close it |                           |
| `Space`              |                    | Typed like any character, see **Type-Ahead**        | Pick highlighted option |                                                    |                           |
| `Arrow Up`           |                    | If open: previous option (wraps)                    | Previous option (wraps) | If panel open: previous week; else segment up      | Segment up                |
| `Arrow Down`         |                    | If closed: open panel; if open: next option (wraps) | Next option (wraps)     | If panel open: next week; else segment down        | Segment down              |
| `Alt` + `Arrow Up`   |                    |                                                     |                         | Close panel                                        |                           |
| `Alt` + `Arrow Down` |                    |                                                     |                         | Open panel                                         |                           |
| `Arrow Left`         |                    |                                                     |                         | If panel open: previous day; else move caret       | Move caret                |
| `Arrow Right`        |                    |                                                     |                         | If panel open: next day; else move caret           | Move caret                |

An empty cell is a key the field does not act on, and it keeps its native effect: `Enter` on a dropdown or autocomplete with its panel closed submits the form, and `Esc` with no panel open reaches the dialog around the field. Picking a highlighted option in a checkbox group toggles it. Arrows skip disabled and readonly options.

The rest keep the platform's keys: `select-field` is a native `<select>` and `slider-field` a native range input. `toggle-field` flips on `Space` and `Enter`.

### Type-Ahead

Typing into a dropdown builds a short buffer and highlights the first option whose label starts with it. Backspace edits the buffer, the first character opens a closed panel, and the buffer clears itself after a pause.

The autocomplete has no buffer: what is typed is its filter, and typing an option's exact label picks it.

### Stepping A Date Or Time Segment

`ArrowUp` and `ArrowDown` step the segment under the caret and leave it selected, so repeated arrows stay on it and the next digit typed replaces it.

- **An Empty Field Is Seeded First**: a date with `defaultDate`, else today, kept within `minDate` and `maxDate`; a time with midnight. So the arrows alone can fill one.
- **A Date Step Past A Limit Is Refused**: a step that would leave `minDate` or `maxDate` is refused rather than clamped.
- **A Plain `ArrowDown` Does Not Open The Date Panel**: `Alt` plus the arrows works the panel, per the ARIA combobox pattern.

---

## Dates And Times

Both fields parse and format through one `unicodeTokenFormat`, a date-fns token string, and both hold a `Date | null`.

| Input                | Does                                                                |
| :------------------- | :------------------------------------------------------------------ |
| `unicodeTokenFormat` | The token string the field masks, parses and formats with           |
| `emptyHint`          | What an empty, unfocused field shows: `'underscores'` or `'format'` |

A focused empty field always shows underscore slots, because the mask's caret arithmetic only recognises its own placeholder character.

- **Typed Text Commits On Blur**: a half-typed date is not a date, so what is typed reaches the model on blur or on `Enter`. The arrow keys and the calendar commit at once.
- **Text That Does Not Parse Stays As Typed**: the model keeps its value, and the field reports a `parse` error to whichever forms API binds it, which the decorator renders once revealed. Text that parses again drops it.
- **Emptying The Text Commits `null`**: at once, with no error.

The date field passes a set of options straight through to Pikaday: `minDate`, `maxDate`, `firstDay`, `i18n`, `yearRange`, `disableWeekends`, `disableDayFn` and the rest, listed in [Components](components.md). Each is applied to the calendar when it changes at runtime.

**The Toggle Icon**: the date field's panel toggle draws a CSS arrow by default. The library ships no icons, so to replace it, project your own:

```html
<formidable-date-field [formField]="form.birthdate">
  <span formidableFieldToggleIcon>📅</span>
</formidable-date-field>
```

The toggle centres what is projected; its size, colour and hover feedback are yours.

---

## Masking

`input-field` and `textarea-field` mask through ngx-mask, and take almost all of its options. Config resolves in three layers: a per-field `maskConfig` overrides the app-wide defaults, which override the library's own. A masked field writes the model on every keystroke, as an unmasked one does.

### Per Field

```html
<formidable-input-field
  [mask]="'000.00'"
  [maskConfig]="{ prefix: 'CHF ', decimalMarker: ',' }"
  [formField]="form.price" />
```

Set `mask` when you want masking; `maskConfig` is optional on top of it.

### App-Wide

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [...provideNgxFormidable({ globalMaskConfig: { validation: true, dropSpecialCharacters: true } })]
};
```

It lands on the `FORMIDABLE_MASK_DEFAULTS` token.

**The Slot Character Is The Field's, Not The App's**: a field reads its value back out of what the mask renders, by looking for the character drawn in a position nobody has filled. So every masked field binds `placeHolderCharacter` itself, and an `ngx-mask` setting made globally, through `provideNgxMask`, does not reach it. Set it per field through `maskConfig`, or app-wide through `globalMaskConfig`, and the display and the caret move together.

Pick one the mask cannot produce on its own. Where a token pattern accepts it, or the mask draws it as a literal, a filled position and an empty one look identical and the field cannot tell them apart. It logs a warning naming the field when it spots the collision. The default `_` is safe for every built-in pattern; a mask like `000_000`, or a custom pattern such as `/\w/` that accepts `_`, needs a different character.

```html
<formidable-input-field
  [mask]="'XXXXXX'"
  [maskConfig]="{ patterns: wordPatterns, placeHolderCharacter: '•' }"
  [formField]="form.serial" />
```

### The Caret In A Masked Field

A mask renders a `_` slot for every character not yet typed. Those slots are not a value, so they are not somewhere the caret goes: [The Caret On Focus](#the-caret-on-focus) above is the whole rule, and a mask only changes where the content is taken to end.

| Mask State        | Counts As | Content Ends                                                           |
| :---------------- | :-------: | :--------------------------------------------------------------------- |
| Nothing but slots |   Empty   | At the front: literals and unfilled slots are not a value              |
| Some filled       |  Content  | After the last filled slot, short of the separator leading to the rest |
| Every slot filled |  Content  | After the whole display, trailing literals included                    |

So keyboard focus on `12/3_/____` selects `12/3` and stops, and a click anywhere in the empty tail of `079 ___ __ __` puts the caret behind the `9`, not out among the slots.

`Arrow Left` and `Arrow Right` always move the caret. Select all covers the text that has been typed and never the slots, so it selects nothing in a field holding only slots.

---

## Related

- [Components](components.md): every public component, directive, token and type
- [Forms](forms.md): how the fields meet Signal Forms, reactive forms and template-driven forms
- [Decoration](decoration.md): labels, adornments, prefixes, suffixes, hints, required marker
- [Custom Fields](custom-fields.md): building a field or an option of your own
