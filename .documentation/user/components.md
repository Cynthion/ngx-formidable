# Components

Catalogue of the library's public API: everything exported from `public-api.ts`. This is the authoritative detailed reference: the root `README.md` lists components abstractly and links here for the full API, and the `user/` guides teach the topics this file only lists.

Every component is `standalone` and uses `ChangeDetectionStrategy.OnPush`, with no exception. Field components extend `BaseField` and implement Angular's `FormValueControl<T>`, so `[formField]`, `ngModel`, `[formControl]` and `formControlName` all bind them through their `value` model, with no value accessor; their shared surface is documented once below and not repeated per entry.

**Signal Surface**: every input is a signal `input()` and every output an `output()`. A template binds both exactly as a decorated one (`[readonly]="…"`, `(touch)="…"`), so the tables below name the value a binding accepts rather than the signal wrapping it. Reaching one from code is Angular's own API in every case:

| From Code           | What Applies                                                                                                                                                                                                   |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read an input       | Call it: `field.readonly()`                                                                                                                                                                                    |
| Write an input      | `componentRef.setInput('readonly', true)`, because a signal input is read-only from outside. `value` is the exception: a `model()` is a `WritableSignal`, so `field.value.set(…)` works                        |
| Listen to an output | `output.subscribe(callback)`, unsubscribed for you when the component is destroyed. `outputToObservable(output)` from `@angular/core/rxjs-interop` returns an `Observable` where the RxJS operators are wanted |
| Emit from an output | `output.emit(value)`, on an `output()`                                                                                                                                                                         |

## Setup

Wire the library once with `provideNgxFormidable()`, then import the standalone components where they are used.

| Symbol                          | Kind      | Purpose                                                                        |
| :------------------------------ | :-------- | :----------------------------------------------------------------------------- |
| `provideNgxFormidable(config?)` | function  | Put it in the `app.config.ts` providers, or an NgModule app's root `providers` |
| `NgxFormidableConfig`           | interface | `{ globalMaskConfig?, defaults?: FormidableDefaults }`, its argument           |
| `FormidableDefaults`            | interface | App-wide defaults for the inputs every template would repeat                   |

It registers ngx-mask, sets `FORMIDABLE_MASK_DEFAULTS` from `globalMaskConfig` and `FORMIDABLE_DEFAULTS` from `defaults`. The defaults below are the library's own; which inputs `FormidableDefaults` overrides, and how, is in [`user/getting-started.md`](getting-started.md). Styling is a separate stylesheet import, also in [`user/getting-started.md`](getting-started.md).

---

## Base Field Directive

`BaseField<T = string | null>`: an exported abstract `@Directive` with no selector. The base class for every field and the extension point for custom fields (reference implementation: `example-counter-field` in the portal, walked through in [`user/custom-fields.md`](custom-fields.md)). Implements `FormValueControl<T>` + `FormidableField<T>`.

Inherited by every field:

| Member             | Kind            | Description                                                                                                 |
| :----------------- | :-------------- | :---------------------------------------------------------------------------------------------------------- |
| `value`            | model           | The model, `T`, bound two-way by the forms API and written back only for a user's edit, see **Model**       |
| `name`             | input           | Field name (`''`)                                                                                           |
| `placeholder`      | input           | Placeholder text (`''`)                                                                                     |
| `readonly`         | input           | Blocks input, still focusable (`false`), see **State From The Forms API**                                   |
| `disabled`         | input           | Fully disabled (`false`), see **State From The Forms API**                                                  |
| `required`         | input           | Suffixes the required marker and sets `aria-required` (`false`). Validates nothing, see **Required Marker** |
| `autoFocus`        | input           | Focuses the field once its view is ready (`false`), see **Focus**                                           |
| `errors`           | input           | `readonly ValidationError[]` the forms API holds (`[]`), see **Errors And Reveal**                          |
| `invalid`          | input           | Whether the forms API holds the field invalid (`false`), see **Errors And Reveal**                          |
| `pending`          | input           | Whether a validator is still running (`false`), see **Errors And Reveal**                                   |
| `touched`          | input           | Whether the user has left the field (`false`), see **Errors And Reveal**                                    |
| `dirty`            | input           | Whether the user has edited the field (`false`), see **Errors And Reveal**                                  |
| `revealOn`         | input           | `FormidableReveal`, when the messages appear (unset), see **Errors And Reveal**                             |
| `valueChange`      | output          | `T` on a user's edit: the `model`'s own output                                                              |
| `touch`            | output          | `void`, as the last act of a blur, which marks the control touched                                          |
| `fieldId`          | getter          | Generated unique id                                                                                         |
| `isFieldFocused`   | signal          | Whether focus is inside the field, which the decorator's `is-focused` follows                               |
| `canLabelRest`     | signal          | Whether nothing occupies the value area, so a label may rest there like a placeholder                       |
| `showErrors`       | signal          | Whether the field shows its errors: invalid, and revealed. Drives `aria-invalid` and the decorator's state  |
| `shownErrors`      | signal          | The errors the decorator renders as messages: none until `showErrors`, the last ones while `pending`        |
| `focus(options?)`  | method          | Focuses the field, taking the platform's `FocusOptions`, see **Focus**                                      |
| `hasInFieldToggle` | optional signal | Whether the field renders a panel toggle inside its own box, which the value and a label must clear         |
| `valueAlignment`   | optional        | Where the value sits vertically, which a prefix/suffix aligns with: `'center'` (default) or `'top'`         |

**Extension Contract**: subclasses supply `keyboardCallback`, `registeredKeys`, `fieldRef`, `decoratorLayout`, a `value` **`model()`**, and `doOnFocusChange`. `keyboardCallback` returns whether it acted on the key, and only such a key is `preventDefault`ed. One the field ignores keeps its native effect, so an `Enter` still submits the form, an `Escape` still closes a dialog and a `Tab` still moves on. A subclass renders from `value()` and hands a user's edit to the protected `setValue(next)`, which writes nothing for an edit equal to what the model holds; the protected `isSameValue(a, b)` decides that, and a field whose value is a `Date` or an array overrides it. The base handles the keydown listener, readonly/disabled blocking, and label-rest state; its protected `canEdit` signal is false while either holds, and a subclass's public mutators return early on it: `toggle()`, `selectValue()`, `selectDate()`, `selectTime()` and `selectOption()` change nothing on a readonly or disabled field. A field whose focus can move between elements of its own, such as its input and its panel, binds `onFocusChange` to `focusin` and `focusout` on `fieldRef` and passes the event, so such a move is neither a focus nor a blur. A field with a panel implements `FormidablePanelField`, returns itself from the protected `panel` getter, binds `onPanelToggleMouseDown` to its toggle and `onPanelMouseDown` to its panel, and calls `onPanelToggle(isOpen)` from `togglePanel`; the base then keeps focus in the field while the panel is used, closes it on a click outside the field, and places it on open and on a scroll or resize while it is open. `canLabelRest` is false while the field is focused, filled, readonly or disabled. A `placeholder` is not part of it: whether that blocks a resting label belongs to the label's position (see **Label As Placeholder** below). A field that renders something else in its value area while empty says so by overriding the protected `showsEmptyValueHint` **signal** (`input-field` and `textarea-field` when their mask shows its slots, `date-field` and `time-field` always). It is a signal and not a getter, because `canLabelRest` is a `computed` over it and a computed would cache whatever a getter returned first. A field whose value is top-aligned rather than centered (`textarea-field`) declares `valueAlignment: 'top'`, which moves a projected prefix/suffix onto the value's first line instead of centring it in a box that grows. A field that draws something of its own inside its box at the right edge (`dropdown-field` and `date-field` with their panel toggle, `select-field` with its dropdown arrow) declares `hasInFieldToggle` as a signal, which widens the value inset by `--formidable-field-toggle-size` so the value and a label stop short of it. A field whose `fieldRef` is not the element that takes focus overrides the protected `focusElement` getter (see **Focus**).

**Model**: the model is the only source of truth. A field renders `value()` and writes it only for a user's edit, never to correct what it was given, so a programmatic write leaves the control pristine and reports nothing. A `slider-field` shows a value outside `min` / `max` at the nearest end, a masked field shows a value through its mask, and an option field shows no selection for a value no option carries, `null` included, until its option arrives, at which point it shows it; each leaves the model as it is. The classic APIs' `updateOn` holds nothing back: an edit reaches the model at once, and Signal Forms' `debounce(path, 'blur')` is what defers one to the `touch`. A classic control is `null` until something writes it, which a field renders as its empty state.

**State From The Forms API**: `disabled`, `readonly`, `required`, `name`, `errors`, `invalid`, `pending`, `touched` and `dirty` are plain inputs that each forms API writes from what it holds. `[formField]` writes all of them from its schema, and `min`, `max`, `minLength` and `maxLength` into a field that has them. `ngModel`, `[formControl]` and `formControlName` write `disabled`, `errors`, `invalid`, `pending`, `touched` and `dirty`; `[formControl]` and `formControlName` also write `required`, from `Validators.required`. What an API does not write is bound on the field directly: `readonly` under the classic APIs, and `required` under `ngModel`. Under `ngModel`, `[formControl]` and `formControlName`, Angular attaches no directive validator, such as `required` or `minlength`, to a field bound through its `value` model. Every one of these inputs takes `undefined` as its default, so a consumer binding them by hand can leave any out.

**Errors And Reveal**: the field decides when its errors show, from the state the forms API writes. `showErrors` is true once the field is invalid (it has errors, or `invalid` is true) **and** its reveal has come: `touched` (the default) once the user has left the field, `dirty` once they have edited it, `always` at once. Signal Forms' `submit()` touches every field, so `touched` covers a submit there; a classic `ngSubmit` touches none, and `markAllAsTouched()` is what does. `revealOn` unset falls back to `FORMIDABLE_DEFAULTS.revealOn`, then to `touched`; a change to it takes effect at once. While `pending`, the forms API holds none of the running validator's errors, so the field keeps its last ones rather than flickering them away. `showErrors` sets the field's `aria-invalid`; `shownErrors` is what the decorator renders, each through `FORMIDABLE_ERROR_MESSAGE`. A classic API's error arrives as `{ kind, context }` with no `message` (`Validators.minLength(3)` as `{ kind: 'minlength', context: { requiredLength: 3, actualLength: 2 } }`), so its default message is its `kind`.

**Focus**: `focus(options?)` focuses the field, and `autoFocus` calls it once, from the base's `ngAfterViewInit`, so a field can be focused on page load. Neither opens a panel: no panel field opens on focus, they open on click, on `ArrowDown`, or on typing. `focus()` does nothing while the field is `disabled`. The element it focuses is the protected `focusElement` getter, which defaults to `fieldRef.nativeElement`; the five fields that wrap their control in a `div` override it: `dropdown-field`, `autocomplete-field`, `date-field` and `time-field` to their `input`, `slider-field` to its `input[type=range]`. The container-focused fields (`toggle-field`, and the two groups) need no override: their wrapper carries a `tabindex` and is focusable itself. `focus()` is deliberately not on `FormidableField`: the decorator has no use for it, and putting it there would break a field that implements the interface without extending `BaseField`.

**Accessibility**: the base gives every field two protected getters, `labelledBy` and `describedBy`, which its template binds onto whichever element actually takes focus, and the element's `aria-invalid` binds `showErrors()`. The two getters come from the surrounding decorator, injected optionally, so a field used on its own emits neither attribute rather than pointing at ids that do not exist. See **Field Accessibility** under **Field Decorator** for the ids and what each field carries.

The base also **mints** an id of its own from `fieldId`, the mirror of the decorator's rule: the decorator owns what it renders around the field, the field owns what lives inside its own box. `panelId` (`{fieldId}-panel`) names the popup a panel field's `aria-controls` points at; it is `protected`, for the field's own template. The matching `optionId(index)` sits one level down, on **Base Option Field Directives**, because only an option field has options to name. See **Combobox And Options** below.

All three repaint on their own. `showErrors` is a signal over the field's own inputs, which the forms API writes, so `aria-invalid` follows it with nothing pumping the field; `labelledBy` reads a `contentChild()` query on the decorator, so a label added or removed at runtime lands on the next pass.

---

## Base Option Field Directives

Two exported abstract `@Directive()`s (no selector), one layered on the other:

- **`BaseOptionListField<T = string | null>`** extends `BaseField<T>`: the list layer, behind every field that renders a list of options. `select-field` extends it directly, because a native `<select>` walks its own list.
- **`BaseOptionField<T = string | null>`** extends `BaseOptionListField<T>`: the highlight layer, behind the four fields that walk their list with a highlight (`dropdown-field`, `autocomplete-field`, `radio-group-field` and `checkbox-group-field`).

| Member                   | Layer     | Kind                        | Description                                                                                    |
| :----------------------- | :-------- | :-------------------------- | :--------------------------------------------------------------------------------------------- |
| `options`                | List      | input                       | The option list (`[]`)                                                                         |
| `defaultOption`          | List      | input                       | An option pinned to the top of the list                                                        |
| `defaultOptionMode`      | List      | input                       | When the default renders: `'always'` (default) or `'fallback'`                                 |
| `noOptionsText`          | List      | input                       | Text for the empty list (`NO_OPTIONS_TEXT`)                                                    |
| `sortFn`                 | List      | input                       | Comparator applied to the combined list                                                        |
| `optionComponents`       | List      | `contentChildren()`         | The projected option components as `FormidableOptionSource`, `{ descendants: true }`           |
| `optionRefs`             | Highlight | `viewChildren()`, protected | The rendered `#optionRef` options, used to scroll the highlight into view                      |
| `highlightedOptionIndex` | Highlight | signal, protected           | The highlighted index, `-1` for none. Drives both `is-highlighted` and `aria-activedescendant` |
| `optionId(index)`        | Highlight | method, protected           | `{fieldId}-option-{index}`, or `null` for a negative index                                     |

`optionComponents` is the only public member of the four that are not inputs. The other three are `protected`: they exist for a subclass, not for a template or a `viewChild()` handle.

**Extension Contract**: a subclass of either layer supplies `onOptionsChanged()`, which recombines the options starting from `computeAllOptions()`: the bound and the projected options merged and sorted, with `defaultOption` still to pin, because `autocomplete-field` pins it only after filtering. The model is left alone, since the selection is derived from `value()`. One effect on the list layer calls `onOptionsChanged()` whenever any of the option inputs or the `optionComponents` query moves.

A subclass of the highlight layer also reconciles the highlight there, and supplies `activeOptions` and `selectOption(option)`. `activeOptions` is a signal holding the rendered list the highlight walks (`autocomplete-field` holds its filtered list, the other three their full one), the same signal the field's own template renders from. A single-select field additionally overrides `selectedOptionValue` so the selection can claim the highlight; the multi-select `checkbox-group-field` leaves it `null`, which is what drops the selection-wins step for it. The layer owns the rest: `setHighlightedIndex`, `highlightSelectedOption` and `reconcileHighlightAfterOptionsChanged`. The last one follows the previously highlighted **value** across a changed list before falling back to a clamped index, and skips disabled options either way; a field that only wants a live highlight while its panel is open guards its own call, as the two panel fields do.

It owns the keys, too, as two `keyboardCallback`s that each return whether they acted. `navigateOptions(event)` is the groups': the arrows walk the list, and `Enter` or `Space` pick the highlighted option. `navigatePanelOptions(event, panel)` is the panel fields': `ArrowDown` opens the panel, `Escape` and `Tab` close it, and while it is open the list is walked as a group's is, with every key it is walked with kept, so an `Enter` meant for the list never submits the form behind it. Closed, the panel keeps only the `ArrowDown` that opens it.

---

## Base Text Field Directive

`BaseTextField`: an exported abstract `@Directive()` with no selector, extending `BaseField<string>`, behind the two text fields, `input-field` and `textarea-field`. It holds their `value` (the text, unmasked) and everything they share:

| Input          | Type                     | Default     | Description              |
| :------------- | :----------------------- | :---------- | :----------------------- |
| `autocomplete` | `AutoFill`               | `'off'`     | Native autocomplete hint |
| `minLength`    | `number`                 | `undefined` | Min length, unset = off  |
| `maxLength`    | `number`                 | `undefined` | Max length, unset = off  |
| `mask`         | `string`                 | `undefined` | ngx-mask pattern         |
| `maskConfig`   | `Partial<NgxMaskConfig>` | `undefined` | Per-field mask overrides |

`minLength` and `maxLength` are the native attributes and validate nothing; a `mask` that cannot satisfy either logs a warning, as does a `placeHolderCharacter` the mask can also draw as content.

---

## Base Date Time Field Directive

`BaseDateTimeField`: an exported abstract `@Directive()` with no selector, extending `BaseField<Date | null>`, behind `date-field` and `time-field`. It holds their `value`, the mask derived from each field's own `unicodeTokenFormat`, and the arrow-key steps:

| Input       | Type                  | Default         | Description           |
| :---------- | :-------------------- | :-------------- | :-------------------- |
| `emptyHint` | `FormidableEmptyHint` | `'underscores'` | Resting empty display |

- **Commit**: typed text commits on blur and on `Enter`. The arrow keys, and the date field's calendar, commit at once.
- **Parse Error**: text that does not parse stays as typed, leaves the model alone and reports a `{ kind: 'parse' }` error to whichever forms API binds the field (`[formField]`, `ngModel` or `[formControl]`), so the field shows it as a message once revealed. Text that parses again drops the error.
- **Empty Text**: emptying the text commits `null` at once, with no error.
- **Unsupported Format**: a `unicodeTokenFormat` with a token the field does not support logs a warning and falls back to the field's default format, whenever it is set.

---

## Field Components

All extend `BaseField<T>` (inherited API above); `input-field` and `textarea-field` extend `BaseTextField`, `date-field` and `time-field` extend `BaseDateTimeField`, `select-field` extends `BaseOptionListField<T>`, and the four other option fields `BaseOptionField<T>`. Tables list each field's OWN inputs only.

**Panel Control**: the three fields with a panel, `dropdown-field`, `autocomplete-field` and `date-field`, expose `isPanelOpen` as a signal to read and `togglePanel(isOpen)` as the way to open or close it from outside. There is no `isPanelOpen` input: a panel is state the field owns and closes by itself (on a selection, an outside click, `Escape`), so a one-way binding would go stale the moment it did. Reach the method through a template reference (`#field`) or a `viewChild()`, exactly as `focus()` is reached.

**Action Option**: the two panel fields take an `actionOption`: an entry pinned to the end of the list that runs an action instead of becoming a value, which is what an "Add A New Address…" row is. It renders as an option and the keyboard walks it as one, because `aria-activedescendant` may only name an option the `listbox` owns; what separates it is every value path, none of which it takes. Picking it closes the panel, runs its `action` and commits nothing; a model written to its value finds no option; the autocomplete never auto-selects it off an exact label and the dropdown's type-ahead walks past it. It never stands in for a result either: an otherwise empty list still renders `noOptionsText`, because that is a status and the action is a control. What happens next is the consumer's: see **An Action Row Is Not A Value** in [`user/fields.md`](fields.md) for the round trip.

### Input Field

**Selector** `formidable-input-field` · **Value** `string`

Text input with optional ngx-mask masking. No inputs of its own: everything comes from **Base Text Field Directive**.

**Use When**: you need a single-line text field, optionally masked (phone, IBAN, etc.).

### Textarea Field

**Selector** `formidable-textarea-field` · **Value** `string`

Multi-line text with optional autosize and a length indicator. The text, mask and length inputs come from **Base Text Field Directive**. The length indicator keeps the value's right padding, so it stays clear of a projected suffix.

| Input                 | Type      | Default | Description              |
| :-------------------- | :-------- | :------ | :----------------------- |
| `enableAutosize`      | `boolean` | `true`  | Grow height with content |
| `showLengthIndicator` | `boolean` | `false` | Show a character counter |

**Use When**: you need free-form multi-line input.

### Select Field

**Selector** `formidable-select-field` · **Value** `string | null`

Native-style single select. Option inputs come from the list layer of **Base Option Field Directives**, with no highlight: a native `<select>` walks its own list. Options come from the `options` input or projected `formidable-field-option` children. The field draws its own dropdown arrow, from the same icon and `--formidable-field-toggle-size` box as the panel fields' toggle, because the shared field reset takes the user agent's away with `appearance: none`. The arrow overlays the control and takes no pointer events, so a click anywhere in the field still opens the platform's list; it is not projected content and, unlike the date field's toggle, has no icon slot.

A value no option carries, `null` included, selects a disabled option of the field's own showing the `placeholder`, or nothing, and never the first option the platform would otherwise put in its place. With no options at all, `noOptionsText` renders as a disabled `<option>`: the one field that puts it in the list. **Use When**: a compact single-choice control fits.

### Dropdown Field

**Selector** `formidable-dropdown-field` · **Value** `string | null`

Custom single-select with a floating panel. Option inputs come from **Base Option Field Directives**.

| Input              | Type                      | Default     | Description                                                  |
| :----------------- | :------------------------ | :---------- | :----------------------------------------------------------- |
| `panelPosition`    | `FormidablePanelPosition` | `'full'`    | Panel placement                                              |
| `actionOption`     | `FormidableActionOption`  | `undefined` | An entry that runs an action instead of becoming a value     |
| `actionOptionMode` | `FieldDefaultOptionMode`  | `'always'`  | When it renders: always last, or only when the list is empty |

Supports projected `formidable-field-option` children. **Use When**: you need a styled dropdown with rich option content. The panel is opened and closed from outside through `togglePanel(isOpen)`, see **Panel Control**.

### Autocomplete Field

**Selector** `formidable-autocomplete-field` · **Value** `string | null`

Dropdown panel plus a filter input. Emits filter text; the consumer supplies filtered options (the portal pairs it with fuse.js). Option inputs come from **Base Option Field Directives**.

| Input              | Type                      | Default     | Description                                                  |
| :----------------- | :------------------------ | :---------- | :----------------------------------------------------------- |
| `panelPosition`    | `FormidablePanelPosition` | `'full'`    | Panel placement                                              |
| `actionOption`     | `FormidableActionOption`  | `undefined` | An entry that runs an action instead of becoming a value     |
| `actionOptionMode` | `FieldDefaultOptionMode`  | `'always'`  | When it renders: always last, or only when the list is empty |

The default option and the action entry are both applied after filtering, so an `always` default and the action entry stay visible even when the filter matches nothing, which is the moment the action entry exists for. **Output** `filterChange: string`, which reports the filter the field moves itself as well as the text typed into it, see **`filterChange` Reports More Than Typing** in [`user/fields.md`](fields.md). The panel is opened and closed from outside through `togglePanel(isOpen)`, see **Panel Control**. **Use When**: the option set is large or fetched/filtered dynamically.

### Date Field

**Selector** `formidable-date-field` · **Value** `Date | null`

Date picker backed by Pikaday. The mask, the empty display, the commit and the parse error come from **Base Date Time Field Directive**.

| Input                | Type                      | Default        | Description                 |
| :------------------- | :------------------------ | :------------- | :-------------------------- |
| `unicodeTokenFormat` | `string`                  | `'yyyy-MM-dd'` | date-fns parse/format token |
| `panelPosition`      | `FormidablePanelPosition` | `'right'`      | Panel placement             |

The calendar is opened and closed from outside through `togglePanel(isOpen)`, see **Panel Control**.

**Toggle Icon**: the panel toggle draws a CSS arrow by default. Project `[formidableFieldToggleIcon]` content into the field to replace it. The library ships no SVG, so the consumer owns everything about the projected markup: size, color and hover feedback. The toggle centers it and carries the `open` class while the panel is open.

**Pikaday Passthrough**: inputs handed to the calendar, each applied when it changes at runtime: `ariaLabel`, `defaultDate`, `setDefaultDate`, `firstDay`, `minDate`, `maxDate`, `disableWeekends`, `disableDayFn`, `yearRange`, `i18n`, `yearSuffix`, `showMonthAfterYear`, `showDaysInNextAndPreviousMonths`, `enableSelectionDaysInNextAndPreviousMonths`, `numberOfMonths`.

**Keyboard**: `ArrowUp` / `ArrowDown` step the `unicodeTokenFormat` segment under the caret (year, month or day) and leave it selected; a step outside `minDate`/`maxDate` is refused. `Alt` + those keys work the panel, and while it is open the arrows move the calendar instead. Plain arrows never open it. Full table in [`user/fields.md`](fields.md).

**Use When**: you need calendar date selection.

### Time Field

**Selector** `formidable-time-field` · **Value** `Date | null`

Masked time input. The mask, the empty display, the commit and the parse error come from **Base Date Time Field Directive**.

| Input                | Type     | Default   | Description                 |
| :------------------- | :------- | :-------- | :-------------------------- |
| `unicodeTokenFormat` | `string` | `'HH.mm'` | date-fns parse/format token |

**Keyboard**: `ArrowUp` / `ArrowDown` step the `unicodeTokenFormat` segment under the caret (hour, minute, second or AM/PM) and leave it selected. Full table in [`user/fields.md`](fields.md).

**Use When**: you need time-of-day entry.

### Toggle Field

**Selector** `formidable-toggle-field` · **Value** `boolean`

On/off switch with keyboard support (Space/Enter). A `FormValueControl<boolean>` rather than a `FormCheckboxControl`, so it binds through `value` like every other field.

| Input           | Type                                 | Default     | Description                                          |
| :-------------- | :----------------------------------- | :---------- | :--------------------------------------------------- |
| `labelPosition` | `FormidableToggleFieldLabelPosition` | `'before'`  | Label side, optional                                 |
| `onLabel`       | `string`                             | `undefined` | Label shown when on                                  |
| `offLabel`      | `string`                             | `undefined` | Label shown when off. Unset, `onLabel` shows in both |

**Use When**: you need a boolean toggle.

### Slider Field

**Selector** `formidable-slider-field` · **Value** `number`

Range slider with optional tick marks and labels. A drag lands inside `min` / `max` and on the `step` grid; a model value outside them is left as it is, see **Model**.

| Input                        | Type                    | Default     | Description                 |
| :--------------------------- | :---------------------- | :---------- | :-------------------------- |
| `min`                        | `number`                | `0`         | Minimum a drag reaches      |
| `max`                        | `number`                | `100`       | Maximum a drag reaches      |
| `step`                       | `number`                | `1`         | Step increment              |
| `minLabel`                   | `string`                | `undefined` | Label at the minimum        |
| `maxLabel`                   | `string`                | `undefined` | Label at the maximum        |
| `showThumbLabel`             | `boolean`               | `true`      | Show the thumb value bubble |
| `showTickMarks`              | `boolean`               | `false`     | Render tick marks           |
| `showMinMaxLabels`           | `boolean`               | `false`     | Show min/max labels         |
| `showTickLabels`             | `boolean`               | `false`     | Label the tick marks        |
| `tickInterval`               | `number`                | `undefined` | Interval between ticks      |
| `transformValueToThumbLabel` | `(v: number) => string` | `undefined` | Format the thumb label      |
| `transformTickToTickLabel`   | `(v: number) => string` | `undefined` | Format tick labels          |

**Use When**: you need numeric selection within a range.

### Radio Group Field

**Selector** `formidable-radio-group-field` · **Value** `string | null`

Single choice from projected options. No inputs of its own: everything comes from **Base Option Field Directives**.

Collects `formidable-field-option` children. With no options it renders `noOptionsText` as plain text, not as an option. **Use When**: all choices should be visible and mutually exclusive.

### Checkbox Group Field

**Selector** `formidable-checkbox-group-field` · **Value** `string[]`

Multi-select from projected options. No inputs of its own: everything comes from **Base Option Field Directives**.

Collects `formidable-field-option` children. With no options it renders `noOptionsText` as plain text, not as an option. **Use When**: multiple choices may be selected.

---

## Structural Components

### Field Decorator

**Selector** `formidable-field-decorator`

Wraps a field and its label, label adornment, prefix, suffix, hints and errors into one decorated control. Discovers the field via the `FORMIDABLE_FIELD` token and projects the decoration directives via `contentChild()`. It reads the field's signals (`isFieldFocused`, `readonly`, `disabled`, `required`, `showErrors`, `shownErrors`) and nothing of any forms API. Exposes `decoratorLayout: 'horizontal' | 'vertical' | 'inline'` and measures a projected prefix/suffix in the `horizontal` layout. No inputs. It mirrors a field's surface as plain getters but does not implement `FormidableField`, which is signal-typed; the getters are reactive all the same, since each reads a signal.

**Label Adornment**: a slot beside the label, in the same row, for whatever the consumer wants next to it. The library owns the slot only, never its content. It collapses with that row: a label rendered over the field takes its row with it, and an adornment left above a field it no longer decorates is worse than no adornment, so it hides too.

**Prefix And Suffix Placement**: a `horizontal` and `inline` concept only. The `vertical` layout stacks its group inside a fieldset, which leaves a prefix/suffix nothing to sit beside and no value to inset, so the slots are not rendered there at all.

**Prefix And Suffix Measurement**: a projected prefix/suffix takes horizontal space the field has to give up, so the decorator measures its wrapper (which shrink-wraps the projected content, padding included) and publishes the width on its own host as `--formidable-field-prefix-inset` / `--formidable-field-suffix-inset`. The stylesheet turns those into the field's `padding-left` / `padding-right` and into the bounds of a label rendered over the value; both fall back to `--formidable-field-padding-x` when unset. The measurement runs in a `ResizeObserver` over both wrappers, so it follows content being added or removed, a font loading, or a wrapper being hidden. A hidden wrapper measures zero, which removes the property and gives the field its own padding back. CSS owns the padding throughout; the decorator never writes an inline `style.padding`.

**Prefix And Suffix Alignment**: each slot's `align: FieldAdornmentAlignment` (default `'center'`) chooses what it follows vertically: the `center` of the field's box, or the `value`, which an inside label pushes down. `value` adds the value's own `--formidable-field-value-padding-top` to a wrapper that stays centred, which moves its content by half that padding: exactly where the value's text lands. It is therefore a no-op wherever nothing displaces the value (`outside`, `border` and `border-prefix` labels). A field that declares `valueAlignment: 'top'` already aligns with its value and keeps doing so, so `align` does not apply there. Horizontal layout only: `inline` is a centred flex row.

**Prefix And Suffix Actions**: the wrappers are `pointer-events: none`, so a text adornment over the field's edge still focuses the field. `_globals.scss` excepts a projected `button` and `a`, which is what makes a clear, copy, retry or loading action possible; the library ships none of them, only the slot. Such an action needs no refresh call: the `ResizeObserver` above already re-insets the field when the action appears, disappears or swaps its content.

**Hints**: `formidableFieldHint` elements share one row below the field and above the errors, outside the layout container. Like the errors, they therefore render identically in all three `decoratorLayout`s. The row is content-only: the library owns the slot, never what goes in it, and there are no pre-defined hints. Hints split the row in equal parts and each aligns its own text via `align`, so a `start` note and an `end` counter sit on one line. The row is sized by its content and collapses entirely when nothing is projected. Both the equal split and the per-hint alignment live in `_globals.scss`: the hint element belongs to the consumer's view, which the decorator's encapsulated stylesheet cannot reach.

**In-Field Toggle**: `dropdown-field` and `date-field` draw a panel toggle inside their own box, at the field's inner right edge, and `select-field` draws its dropdown arrow in the same place. It is not projected content, so instead of measuring it the field declares `hasInFieldToggle` and the decorator turns that into a `has-in-field-toggle` host class, which raises `--formidable-field-toggle-inset` to `--formidable-field-toggle-size`. All three report it as `!readonly && !disabled` rather than as a constant, because none renders the toggle in those states: the class and the inset go away with it, and the value reclaims the space. Only the value inset adds it: in the two panel fields the toggle is a flex item inside the field's `padding-right`, so a projected suffix, measured into that padding, already pushes the toggle left of itself. `select-field` cannot put anything in flow beside its value, since the value area is a native `<select>`, so its host is a one-cell grid that stacks the arrow over the control; the arrow takes no pointer events and the select reserves the room with its own `padding-right`, which is what keeps the whole box clickable.

**Field State**: the decorator is where all of the field's state is reachable at once, so it mirrors it onto its own host as `is-readonly`, `is-disabled`, `is-focused`, `is-invalid`, `label-resting`, `label-inside`, `has-in-field-toggle`, `has-open-panel` and `has-open-sheet`. The last two lift the decorator into the consumer's stack for as long as a panel is open, and only then. See [`tech/layering.md`](../tech/layering.md). A field used **without** a decorator carries `is-undecorated`, `has-open-panel` and `has-open-sheet` on its own host instead, so its panel still paints correctly. `is-invalid` is the field's `showErrors`, so it appears and clears with the field's `aria-invalid`. A field used without a decorator has no invalid styling and renders no messages.

Each state is a set of `--formidable-color-field-*` remaps rather than a set of property declarations, so a field picks up whichever set applies without every rule restating `background`, `color` and `border-color`. Four of the five are applied on the field element itself, where their order in the `field` and `group-field` mixins is their precedence: `hovered` < `focused` < `readonly` < `disabled`. `invalid` is the exception. It is applied on the decorator's host and inherited, which makes its precedence a matter of _which_ variables it remaps: it points the base, hover and focus colours at the invalid ones and leaves the readonly and disabled ones alone, so it survives hover and focus but yields to readonly and disabled. The group fields reuse the field's state colours; the toggle's track and the slider's track follow the same variables.

**Field Accessibility**: the decorator owns the label, the hint row and the errors slot, so it is what mints the ids they carry (`{fieldId}-label`, `{fieldId}-hint` and `{fieldId}-errors`) and exposes `labelledById` and `describedByIds` for the field to bind. `describedByIds` names both wrappers unconditionally: they always render, and a reference to a hidden or empty element contributes nothing to the accessible description, so there is no state to track. `labelledById` is `null` until a label is projected, because an `aria-labelledby` pointing at nothing would suppress whatever else might have named the field. The errors slot is a `formidable-field-errors`, an `aria-live="polite"` region, so an error appearing while the field is already focused is announced rather than waiting for the next focus.

`aria-labelledby` is what the `vertical` layout has instead of a `<label for>`, which its `div` label cannot be. It is also the toggle's only name: the toggle's `[id]` is on its hidden checkbox while the focusable element is the `role="switch"` `div`, and its own `onLabel` / `offLabel` is state text rather than a name. For the same reason the `vertical` layout renders no `legend`: the field inside carries the group role and is named from the projected label, so a legend would only add a second announcement of the raw control name.

| Field                                                | Element Carrying The State                  | Attributes Beyond `aria-required` / `aria-invalid` / `aria-describedby`           |
| :--------------------------------------------------- | :------------------------------------------ | :-------------------------------------------------------------------------------- |
| `input-field`, `textarea-field`                      | the `input` / `textarea`                    | None: native `readonly` and `disabled` already speak                              |
| `select-field`                                       | the `select`                                | `aria-readonly` (native `readonly` is inert on a `select`)                        |
| `dropdown-field`, `autocomplete-field`, `date-field` | the wrapped `input[role=combobox]`          | `aria-readonly`, plus the combobox set below                                      |
| `time-field`                                         | the wrapped `input`                         | `aria-readonly`                                                                   |
| `slider-field`                                       | the `input[type=range]`                     | `aria-labelledby`, `aria-readonly`, `aria-valuetext`                              |
| `toggle-field`                                       | the `div[role=switch]`                      | `aria-labelledby`, `aria-checked`, `aria-readonly`, `aria-disabled`               |
| `radio-group-field`, `checkbox-group-field`          | the `div[role=radiogroup]` / `[role=group]` | `aria-labelledby`, `aria-readonly`, `aria-disabled`, plus `aria-activedescendant` |

`aria-readonly` and `aria-disabled` are set only where no native attribute does the job: a `div`, or a `select` / range input that ignores `readonly`. The slider gets no `aria-valuenow`, `aria-valuemin` or `aria-valuemax`: a native range already reports all three. `aria-valuetext` is the exception, set only once `transformValueToThumbLabel` makes the value read as something other than its number. The hidden `input`s inside the groups and the toggle stay out of the accessibility tree entirely.

**Combobox And Options**: the ids for everything inside a field's own box are the field's to mint, see **Accessibility** under **Base Field Directive**. `time-field` and `select-field` take none of this: one has no panel, the other is a native `select` the platform already speaks for.

| Field                                       | Popup                                          | On The Control                                                                |
| :------------------------------------------ | :--------------------------------------------- | :---------------------------------------------------------------------------- |
| `dropdown-field`                            | `.panel-scrollcontainer[role=listbox]`         | `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`  |
| `autocomplete-field`                        | `.panel-scrollcontainer[role=listbox]`         | as above, plus `aria-autocomplete="list"`                                     |
| `date-field`                                | `.panel-scrollcontainer[role=dialog]`          | `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` |
| `radio-group-field`, `checkbox-group-field` | None: the options are the group's own children | `aria-activedescendant`                                                       |

The role sits on `.panel-scrollcontainer` rather than on the panel itself, so the options a listbox owns are its direct children. `aria-expanded` and the option state attributes bind their boolean raw, unlike every `|| null` state attribute, because a closed combobox has to report `false` rather than fall silent. `aria-activedescendant` is bound off the same stream that drives the `is-highlighted` class, so the highlight and the active descendant cannot name different options; a panel starts with nothing highlighted, while a group highlights its first option straight away so the arrows have somewhere to start.

`date-field` is deliberately a `dialog` rather than a listbox: a Pikaday calendar is not a list, and its cells are third-party markup with no ids of ours, so there is nothing to point `aria-activedescendant` at. The dialog is named from the same `labelledBy` as everything else, and stays unnamed without a projected label.

The two panel fields render their empty state as plain text, exactly as the groups do: a listbox must not offer "no options available" as something to pick, and it also means an empty panel contains no `role="option"` at all.

**Label Position**: `formidableFieldLabel`'s `position: FieldLabelPosition` (default `'inside'`) chooses between six mutually exclusive, statically-configured modes.

The decorator resolves the configured position against the field's own state into one `labelState`, emitted as a `label-*` class on `.label-wrapper`, plus a `label-inside` class on its own host whenever the label sits over the value area. Any position other than `outside` needs a `horizontal` `decoratorLayout`, the only layout with room for a label over the field, so all of them are a no-op for `toggle-field`, `radio-group-field`, `checkbox-group-field` and `slider-field`.

| `labelState`          | Resolved From                                                                              |
| :-------------------- | :----------------------------------------------------------------------------------------- |
| `label-outside`       | `position: 'outside'`, or a field whose layout has no room                                 |
| `label-resting`       | `position: 'inside'` with no `placeholder`, or `'inside-placeholder'`, plus `canLabelRest` |
| `label-floating`      | either `inside` position without that, or `'inside-floating'`                              |
| `label-border`        | `position: 'border'`                                                                       |
| `label-border-prefix` | `position: 'border-prefix'`                                                                |

`labelState` reads field state that is none of the decorator's own inputs (`readonly`, `disabled`, `placeholder`, mask configuration), so the decorator has nothing of its own to change. It follows them because each is a signal, and reading one is what marks the decorator's view.

**Label As Placeholder**: `inside` and `inside-placeholder` differ only in what they do about the field's `placeholder`. `inside` yields the value area to it: a field with a placeholder has nothing left to rest in, so its label floats throughout. `inside-placeholder` takes the area over instead: the label rests in the placeholder's position and the decorator's `label-resting` host blanks `--formidable-color-field-placeholder`, so the field's own does not render behind it; focus floats the label and reveals it.

Whether a placeholder blocks a resting label is therefore the position's call, made in `labelState`, not the field's. `canLabelRest` covers only what a field renders of its own accord, a value or a mask showing its slots (via `showsEmptyValueHint`), and vetoes both positions alike. The resting label takes `--formidable-color-field-label-resting`, its own variable, precisely so blanking the placeholder cannot blank the label with it.

**Label Geometry**: an `outside` label sits in `.before-wrapper` in normal flow. Every other position renders the label over the field, which puts it in `.container-horizontal`, the field's own positioning context, whose top edge is the field's border-box top. Each offset is therefore a plain distance from that edge, unreachable by anything around the label, and `.before-wrapper` collapses entirely once the label has left it.

| Offset                               | Lands At                                                                                              |
| :----------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `--formidable-label-floating-offset` | The top of the centered label-plus-value block, `--formidable-label-inside-slack` below the inner top |
| `--formidable-label-resting-offset`  | `--formidable-field-value-centered-top`, so an empty field's label is centered in the inner height    |
| `--formidable-label-border-offset`   | Negative: the label's line-box straddles the field's top border                                       |

A floating label's value clears it because the `label-inside` host hands the field a `--formidable-field-value-padding-top`; a `textarea`, whose value is top-aligned rather than centered, uses `--formidable-field-value-top` instead. The `border` positions get neither, so their value stays centered exactly as with `outside`. Horizontally, a label is bounded by the same value inset the field's own padding is built from (see **Prefix And Suffix Measurement** and **In-Field Toggle** above), plus one `--formidable-field-border-thickness`, because that padding is measured from the field's content box while the label is positioned from its border-box. The label therefore stays aligned with the value instead of colliding with a prefix or disappearing behind a panel toggle. A panel field renders its value in an inner `.wrapped-input` that the field's own padding cannot reach, so that input carries no padding of its own beyond the label's clearance; otherwise a user agent's default input padding would place the value. A `border` label additionally shrink-wraps and is pulled left by `--formidable-label-border-gap`, so it hides only the stretch of border it covers while its text still starts where the value does; `border-prefix` is the same mixin anchored to `--formidable-field-padding-x` instead, which is where a projected prefix's text starts. The border is hidden by a `linear-gradient` band one `--formidable-field-border-thickness` tall, painted in `--formidable-color-label-border-band`, its own variable, because `readonly` / `disabled` remap the field's fill on the field element, out of the label's reach, so the decorator's host remaps the band's colour instead. Any label rendered over the field stays on one line and ellipsizes.

**Required Marker**: a field's `required` input suffixes a marker to its label, in every label position and in the group layout's `div` label alike. `FORMIDABLE_DEFAULTS.hideRequiredMarkers` withholds the marker from every field it reaches (the app, or the subtree of a component that provides it); it hides the glyph only, and `aria-required` keeps following the field's own input. The glyph is `--formidable-label-required-marker`, a `content` string, so a theme can swap `*` for a word without touching markup. It carries no colour of its own (it inherits the label, and so follows every state with it), and it is `aria-hidden`, because a glyph is no way to say "required"; the accessible form of the same fact is `aria-required` on the field. `.label-wrapper` is a flex row for it, and the marker is a sibling of the projected label rather than part of it: when a label runs out of room, the consumer's own text is what ellipsizes and the marker survives. A field with no label projected has nothing to suffix, and the wrapper collapses with it.

`required` **validates nothing** on the field's side: the field sets no native `required` attribute and registers no validator of its own. `[formField]` and `[formControl]` write it from their own rules, so marker and rule cannot drift there. Under `ngModel` it is the `required` attribute, which also matches Angular's `RequiredValidator`: that API's rule, not the field's, and one Angular leaves unattached, see **State From The Forms API**. See [`user/validation.md`](validation.md).

### Field Option

**Selector** `formidable-field-option`

A single option inside an option-based field. Provides `FORMIDABLE_OPTION` and throws if used outside a `FORMIDABLE_OPTION_FIELD` parent. Supports projected template content. It may sit anywhere inside the field element (directly, inside a `@for` / `*ngIf` / `<ng-template>`, or nested in a wrapper element), but it must be **written inside** that element: Angular resolves both the parent injection and the content query from where the option is declared, not from where it renders.

| Member        | Type                  | Default                            | Description                                                          |
| :------------ | :-------------------- | :--------------------------------- | :------------------------------------------------------------------- |
| `value`       | `string` (required)   |                                    | Option value                                                         |
| `label`       | `string`              | The projected content's text       | Display label                                                        |
| `readonly`    | `boolean`             | `false`                            | Read-only option                                                     |
| `disabled`    | `boolean`             | `false`                            | Disabled option                                                      |
| `selected`    | `boolean`             | `false`                            | Selected state                                                       |
| `highlighted` | `boolean`             | `false`                            | Highlighted state                                                    |
| `content`     | `TemplateRef`         | `undefined`                        | What a rendered option shows in place of its label. Set by the field |
| `match`       | `(filter) => boolean` | Case-insensitive `label` substring | Overrides how the autocomplete filter matches it                     |
| `layout`      | `FieldOptionLayout`   | `'inline'`                         | Option layout, a look only. The ARIA role follows the parent field   |
| `template`    | getter                |                                    | The projected content, or `undefined` when none was projected        |
| `option`      | computed              |                                    | The plain `FormidableOption` the owning field reads, see below       |

**Component And Data**: `FormidableOption` is plain data: the shape a consumer writes into a field's `options` input, and the shape every field works with internally. A component is a different thing: its members are signals. `option` is the one boundary between them, and it is what `FORMIDABLE_OPTION` provides: the component folds its inputs, its projected content and its `match` default into one plain option, and the owning field reads that. `label` therefore falls back to the text taken off the projected content, and `match` resolves its default there rather than on the input, which is why the plain option a field holds always carries one.

**Accessibility**: the option's ARIA lands on its host element, not on the inner `div`: the host is the direct child of the `listbox` / `radiogroup` / `group` that owns it, and an element with no role in between would break that ownership. The role comes from the parent field's `optionRole`, never from `layout`: `layout` is a look a consumer may set freely, while the role has to follow the container. It is also what chooses the state attribute: `aria-selected` for an `option`, `aria-checked` for a `radio` or a `checkbox`, each binding its boolean raw so an unselected option reports `false`. `readonly` folds into `aria-disabled` alongside `disabled`: ARIA has no `aria-readonly` for these roles, and both flags mean the same thing here. The option's `id` is bound by the parent, which is what knows the index. See **Combobox And Options**.

### Field Errors

**Selector** `formidable-field-errors`

Renders a list of errors as messages, each through `FORMIDABLE_ERROR_MESSAGE`, in an `aria-live="polite"` region. Presentational: it shows what it is given and decides nothing about when. The message list renders only while `errors` is non-empty, so a field that never fails costs nothing below itself and a message appearing pushes later content down. Reserving space against that shift is the consumer's own layout, on the `formidable-field-errors` host, which is always present.

Every decorator renders one for its field's `shownErrors`, after the field's layout container and never inside it, since that container is the positioning context for the label and the prefix/suffix and has to stay exactly the field's box. Placement is therefore the same for all three `decoratorLayout`s. Place one by hand for a group's errors, the form's, or a spot of your own, and pass it the errors to show when they should show.

| Input    | Type                         | Default | Description                                    |
| :------- | :--------------------------- | :------ | :--------------------------------------------- |
| `errors` | `readonly ValidationError[]` | `[]`    | The errors to render; `undefined` renders none |

---

## Directives

### Field-Decoration

| Directive             | Selector                          | Purpose                                                                                                                                       |
| :-------------------- | :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `FieldHint`           | `[formidableFieldHint]`           | Projects always-visible support text into the decorator's hint row. Input `align: FieldHintAlignment` (`'start'`), emitted as `data-align`.   |
| `FieldLabelAdornment` | `[formidableFieldLabelAdornment]` | Projects content beside the label. Exposes `elementRef`.                                                                                      |
| `FieldLabel`          | `[formidableFieldLabel]`          | Projects label content. Input `position: FieldLabelPosition` (`'inside'`).                                                                    |
| `FieldPrefix`         | `[formidableFieldPrefix]`         | Projects prefix content, in the `horizontal` and `inline` layouts. Input `align: FieldAdornmentAlignment` (`'center'`). Exposes `elementRef`. |
| `FieldSuffix`         | `[formidableFieldSuffix]`         | Projects suffix content, in the `horizontal` and `inline` layouts. Input `align: FieldAdornmentAlignment` (`'center'`). Exposes `elementRef`. |
| `FieldToggleIcon`     | `[formidableFieldToggleIcon]`     | Marks projected content as a field's panel-toggle icon (date field). Exposes `elementRef`.                                                    |

---

## Injection Tokens And Constants

| Token / Constant           | Purpose                                                                                          |
| :------------------------- | :----------------------------------------------------------------------------------------------- |
| `FORMIDABLE_FIELD`         | Identifies a field component to the decorator                                                    |
| `FORMIDABLE_OPTION_FIELD`  | Identifies an option-hosting field                                                               |
| `FORMIDABLE_OPTION`        | Identifies an option within an option field                                                      |
| `FORMIDABLE_MASK_DEFAULTS` | Global ngx-mask config (set via `provideNgxFormidable`)                                          |
| `FORMIDABLE_DEFAULTS`      | App-wide `FormidableDefaults` (set via `provideNgxFormidable`, or scoped by a component)         |
| `FORMIDABLE_ERROR_MESSAGE` | An error's message text, for every message the library renders (default: `message`, else `kind`) |
| `NO_OPTIONS_TEXT`          | Default empty-options text                                                                       |

---

## Type Aliases And Key Interfaces

| Name                                 | Definition                                                                                          |
| :----------------------------------- | :-------------------------------------------------------------------------------------------------- |
| `FieldAdornmentAlignment`            | `'center' \| 'value'`                                                                               |
| `FieldDecoratorLayout`               | `'horizontal' \| 'vertical' \| 'inline'`                                                            |
| `FieldDefaultOptionMode`             | `'always' \| 'fallback'`                                                                            |
| `FieldHintAlignment`                 | `'start' \| 'center' \| 'end'`                                                                      |
| `FieldLabelPosition`                 | `'outside' \| 'inside' \| 'inside-placeholder' \| 'inside-floating' \| 'border' \| 'border-prefix'` |
| `FieldOptionLayout`                  | `'inline' \| 'radio-group' \| 'checkbox-group'`                                                     |
| `FieldOptionRole`                    | `'option' \| 'radio' \| 'checkbox'`                                                                 |
| `FieldValueAlignment`                | `'center' \| 'top'`                                                                                 |
| `FormidableEmptyHint`                | `'underscores' \| 'format'`                                                                         |
| `FormidablePanelPosition`            | `'left' \| 'right' \| 'full' \| 'sheet'`                                                            |
| `FormidableReveal`                   | `'touched' \| 'dirty' \| 'always'`                                                                  |
| `FormidableToggleFieldLabelPosition` | `'before' \| 'after'`                                                                               |
| `FormidableOption`                   | `{ value: string; label?; template?; readonly?; disabled?; match?(filter) }`                        |
| `FormidableActionOption`             | `FormidableOption` plus a required `action(): void`                                                 |

`FieldDefaultOptionMode` decides when an option field renders its `defaultOption`: `always`, pinned first and exempt from both `sortFn` and the autocomplete filter, or as a `fallback` only when the list would otherwise be empty.

`FieldOptionRole` is the optional `optionRole` member of `FormidableOptionField`: the ARIA role that field's options take, and so also whether they report `aria-selected` or `aria-checked`. Optional, and an option falls back to `option` when its parent says nothing, so a custom option field that implements the interface without it still works.

`FormidableEmptyHint` sets what the date/time fields show while empty **and unfocused**: `_` slots or the `unicodeTokenFormat` itself. A focused empty field always shows `_` slots, because ngx-mask's caret arithmetic only recognizes its own placeholder character.

`FormidablePanelPosition` picks between two kinds of panel. `left`, `right` and `full` are **anchored**: absolutely positioned against the field, flipping above it when there is no room below and adopting the two field corners they sit against. The room is the viewport cropped by every ancestor that clips its overflow, so a field in a scrolling pane is placed against that pane rather than against the window. `sheet` is a **sheet**: `position: fixed` across the bottom of the viewport, full width, square where it meets the screen edge, and it never flips. A sheet is what a phone wants; an anchored panel in a narrow column is not. Two limits, both the consumer's to weigh: `fixed` is defeated by an ancestor `transform`, `filter` or `contain`, and an `autocomplete-field` sheet keeps focus in its filter input, so a soft keyboard can cover it. The date field moves focus to the panel when it opens, so its sheet is clear of the keyboard.

### Interfaces

The contracts a custom field or option implements. Every field component already satisfies its own through `BaseField`; these matter when writing one from scratch. Every member that is an input is typed as the `Signal` the component declares for it. `FormidableOption` is the exception, because it is data a consumer also writes by hand.

| Interface                | Implemented By               | Contract                                                                                            |
| :----------------------- | :--------------------------- | :-------------------------------------------------------------------------------------------------- |
| `FormidableField<T>`     | every field                  | What the decorator reads off a field: refs, id, state, value, focus, `showErrors` and `shownErrors` |
| `FormidableOptionField`  | the five option fields       | `options`, `defaultOption`, `defaultOptionMode`, `selectOption`, `optionRole`                       |
| `FormidableOption<T>`    | plain data, written by hand  | One option: `value`, `label`, `template`, its flags and `match`                                     |
| `FormidableActionOption` | plain data, written by hand  | An option plus the `action` that replaces committing it, see **Action Option**                      |
| `FormidableOptionSource` | `FieldOption`                | `option`: the plain option a component hands to the field that owns it                              |
| `FormidablePanelField`   | dropdown, autocomplete, date | `panelRef`, `isPanelOpen`, `togglePanel`, `panelPosition`                                           |

| Validation Type            | Definition                                                           |
| :------------------------- | :------------------------------------------------------------------- |
| `FormidableErrorMessageFn` | `(error: ValidationError) => string`, for `FORMIDABLE_ERROR_MESSAGE` |

---

## Catalogue Summary

| Component / Directive | Selector                          | Kind       | Value `T`        |
| :-------------------- | :-------------------------------- | :--------- | :--------------- |
| `InputField`          | `formidable-input-field`          | Field      | `string`         |
| `TextareaField`       | `formidable-textarea-field`       | Field      | `string`         |
| `SelectField`         | `formidable-select-field`         | Field      | `string \| null` |
| `DropdownField`       | `formidable-dropdown-field`       | Field      | `string \| null` |
| `AutocompleteField`   | `formidable-autocomplete-field`   | Field      | `string \| null` |
| `DateField`           | `formidable-date-field`           | Field      | `Date \| null`   |
| `TimeField`           | `formidable-time-field`           | Field      | `Date \| null`   |
| `ToggleField`         | `formidable-toggle-field`         | Field      | `boolean`        |
| `SliderField`         | `formidable-slider-field`         | Field      | `number`         |
| `RadioGroupField`     | `formidable-radio-group-field`    | Field      | `string \| null` |
| `CheckboxGroupField`  | `formidable-checkbox-group-field` | Field      | `string[]`       |
| `FieldDecorator`      | `formidable-field-decorator`      | Structural |                  |
| `FieldOption`         | `formidable-field-option`         | Structural |                  |
| `FieldErrors`         | `formidable-field-errors`         | Structural |                  |
| `FieldHint`           | `[formidableFieldHint]`           | Directive  |                  |
| `FieldLabelAdornment` | `[formidableFieldLabelAdornment]` | Directive  |                  |
| `FieldLabel`          | `[formidableFieldLabel]`          | Directive  |                  |
| `FieldPrefix`         | `[formidableFieldPrefix]`         | Directive  |                  |
| `FieldSuffix`         | `[formidableFieldSuffix]`         | Directive  |                  |
| `FieldToggleIcon`     | `[formidableFieldToggleIcon]`     | Directive  |                  |

---

## Related

- [`user/getting-started.md`](getting-started.md): install, wiring, the stylesheet, a first form
- [`user/forms.md`](forms.md): how the fields meet Signal Forms, reactive forms and template-driven forms
- [`user/fields.md`](fields.md): options, panels, keyboard, dates and times, masking, focus
- [`user/decoration.md`](decoration.md): labels, adornments, prefixes, suffixes, hints, required marker
- [`user/validation.md`](validation.md): Angular's rules, Vest, Zod or none; messages and their reveal
- [`user/custom-fields.md`](custom-fields.md): building a field or an option of your own
