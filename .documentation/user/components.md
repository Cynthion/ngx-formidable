# Components

Catalogue of the library's public API: everything exported from `public-api.ts`, plus `NgxFormidableVestValidatorDirective` from the `@cynthion/ngx-formidable/vest` entry point. This is the authoritative detailed reference — the root `README.md` lists components abstractly and links here for the full API, and the `user/` guides teach the topics this file only lists.

Every component is `standalone` and uses `ChangeDetectionStrategy.OnPush`, with no exception. Field components implement `ControlValueAccessor` (usable with `ngModel`) and extend `BaseFieldDirective`; their shared surface is documented once below and not repeated per entry.

**Signal Surface**: every input is a signal `input()` and every output an `output()`. A template binds both exactly as a decorated one (`[readonly]="…"`, `(valueChanged)="…"`), so the tables below name the value a binding accepts rather than the signal wrapping it. Reaching one from code is Angular's own API in every case:

| From code           | What applies                                                                                                                                                                                                                                                                     |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read an input       | Call it: `field.readonly()`                                                                                                                                                                                                                                                      |
| Write an input      | `componentRef.setInput('readonly', true)` — a signal input is read-only from outside. `disabled` is the exception: a `model()` is a `WritableSignal`, so `field.disabled.set(true)` works                                                                                        |
| Listen to an output | `output.subscribe(callback)`, unsubscribed for you when the component is destroyed. `outputToObservable(output)` from `@angular/core/rxjs-interop` returns an `Observable` where the RxJS operators are wanted — a field also publishes `valueChange$` / `focusChange$` directly |
| Emit from an output | `output.emit(value)`, on an `output()`. `NgxFormidableFormDirective`'s four are `outputFromObservable()`, which is a plain `OutputRef`: subscribe only, nothing to emit                                                                                                          |

## Setup

Wire the library once, then import the standalone components where they are used. Both paths register the same providers, so neither is primary.

| Symbol                                 | Kind      | Purpose                                                               |
| :------------------------------------- | :-------- | :-------------------------------------------------------------------- |
| `provideNgxFormidable(config?)`        | function  | Standalone path. Put it in `app.config.ts` providers                  |
| `NgxFormidableModule.forRoot(config?)` | NgModule  | NgModule path. Import it once in the root module                      |
| `NgxFormidableModule`                  | NgModule  | Re-exports every component and directive, for NgModule consumers      |
| `NgxFormidableConfig`                  | interface | `{ globalMaskConfig?: Partial<NgxMaskConfig> }`, the argument to both |

Both register ngx-mask and set `FORMIDABLE_MASK_DEFAULTS` from `globalMaskConfig`. Styling is a separate stylesheet import — see `user/getting-started.md`.

---

## Base Field Directive

`BaseFieldDirective<T = string | null>` — exported abstract `@Directive()` (no selector). The base class for every field and the extension point for custom fields (reference implementation: `example-counter-field` in the portal, walked through in `user/custom-fields.md`). Implements `ControlValueAccessor` + `IFormidableField<T>`.

Inherited by every field:

| Member               | Kind            | Description                                                                                         |
| :------------------- | :-------------- | :-------------------------------------------------------------------------------------------------- |
| `name`               | input           | Field name (`''`)                                                                                   |
| `placeholder`        | input           | Placeholder text (`''`)                                                                             |
| `readonly`           | input           | Blocks input, still focusable (`false`)                                                             |
| `disabled`           | model           | Fully disabled (`false`) — see **Disabled**                                                         |
| `showRequiredMarker` | input           | Suffixes the required marker to the label (`false`) — presentational, see **Required Marker**       |
| `autoFocus`          | input           | Focuses the field once its view is ready (`false`) — see **Focus**                                  |
| `valueChanged`       | output          | `T` on value change                                                                                 |
| `focusChanged`       | output          | `boolean` on focus/blur                                                                             |
| `disabledChange`     | output          | `boolean` — the `model`'s own output, see **Disabled**                                              |
| `valueChange$`       | Observable      | Value stream                                                                                        |
| `focusChange$`       | Observable      | Focus stream                                                                                        |
| `fieldId`            | getter          | Generated unique id                                                                                 |
| `value`              | getter          | Current value                                                                                       |
| `canLabelRest`       | signal          | Whether nothing occupies the value area, so a label may rest there like a placeholder               |
| `focus()`            | method          | Focuses the field — see **Focus**                                                                   |
| `hasInFieldToggle`   | optional signal | Whether the field renders a panel toggle inside its own box, which the value and a label must clear |
| `valueAlignment`     | optional        | Where the value sits vertically, which a prefix/suffix aligns with: `'center'` (default) or `'top'` |

**Extension Contract**: subclasses supply `keyboardCallback`, `externalClickCallback`, `windowResizeScrollCallback`, `registeredKeys`, `fieldRef`, `decoratorLayout`, a `value` getter, and `doWriteValue` / `doOnValueChange` / `doOnFocusChange`. The base handles global keydown / outside-click / resize-scroll listeners, readonly/disabled blocking, and label-rest state. `canLabelRest` is false while the field is focused, filled, readonly or disabled. A `placeholder` is not part of it — whether that blocks a resting label belongs to the label's position (see **Label As Placeholder** below). A field that renders something else in its value area while empty says so by overriding the protected `showsEmptyValueHint` **signal** (`input-field` and `textarea-field` when their mask shows its slots, `select-field`, `date-field` and `time-field` always) — a signal and not a getter, because `canLabelRest` is a `computed` over it and a computed would cache whatever a getter returned first. A field whose value is top-aligned rather than centered — `textarea-field` — declares `valueAlignment: 'top'`, which moves a projected prefix/suffix onto the value's first line instead of centring it in a box that grows. A field that draws something of its own inside its box at the right edge — `dropdown-field` and `date-field` with their panel toggle, `select-field` with its dropdown arrow — declares `hasInFieldToggle` as a signal, which widens the value inset by `--formidable-field-toggle-size` so the value and a label stop short of it. A field whose `fieldRef` is not the element that takes focus overrides the protected `focusElement` getter (see **Focus**).

**Disabled**: `disabled` has two writers, so it is the one member of the surface that is a `model` rather than an `input`. A consumer binds `[disabled]`, and Angular's own forms write the same state through `setDisabledState` when the control is disabled programmatically (`control.disable()`); neither goes through the other, and whichever wrote last is what the field renders. A binding that does not change is not a writer, so a `[disabled]="false"` left in place does not undo a `control.disable()`. The `model` brings a `disabledChange` output with it, which reports either writer — including Angular's.

**Focus**: `focus()` focuses the field, and `autoFocus` calls it once, from the base's `ngAfterViewInit` — a field can therefore be focused on page load. Neither opens a panel: no panel field opens on focus, they open on click, on `ArrowDown`, or on typing. `focus()` does nothing while the field is `disabled`. The element it focuses is the protected `focusElement` getter, which defaults to `fieldRef.nativeElement`; the five fields that wrap their control in a `div` override it — `dropdown-field`, `autocomplete-field`, `date-field` and `time-field` to their `input`, `slider-field` to its `input[type=range]`. The container-focused fields (`toggle-field`, and the two groups) need no override: their wrapper carries a `tabindex` and is focusable itself. `focus()` is deliberately not on `IFormidableField` — the decorator has no use for it, and putting it there would break a field that implements the interface without extending `BaseFieldDirective`.

**Accessibility**: the base gives every field three protected getters its template binds onto whichever element actually takes focus — `labelledBy`, `describedBy` and `isInvalid`. All three come from the surrounding decorator, injected optionally, so a field used on its own emits none of the attributes rather than pointing at ids that do not exist. See **Field Accessibility** under **Field Decorator** for the ids and what each field carries.

The base also **mints** an id of its own from `fieldId`, the mirror of the decorator's rule: the decorator owns what it renders around the field, the field owns what lives inside its own box. `panelId` (`{fieldId}-panel`) names the popup a panel field's `aria-controls` points at; it is `protected`, for the field's own template. The matching `optionId(index)` sits one level down, on **Base Option Field Directive**, because only an option field has options to name. See **Combobox And Options** below.

All three repaint on their own. `isInvalid` reads the decorator, which reads the errors component's `invalid` signal, so `aria-invalid` follows validity across the sibling boundary with nothing pumping the field; `labelledBy` reads a `contentChild()` query on the decorator, so a label added or removed at runtime lands on the next pass.

---

## Base Option Field Directive

`BaseOptionFieldDirective<T = string | null>` — exported abstract `@Directive()` (no selector), extends `BaseFieldDirective<T>`. The base for the four fields that render a list of options and walk it with a highlight: `dropdown-field`, `autocomplete-field`, `radio-group-field` and `checkbox-group-field`. `select-field` is an option field too but stays on `BaseFieldDirective` — a native `<select>` has no highlight of its own, so it would only inherit dead state.

Inherited by those four:

| Member                   | Kind                        | Description                                                                                     |
| :----------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------- |
| `options`                | input                       | The option list (`[]`)                                                                          |
| `defaultOption`          | input                       | An option pinned to the top of the list                                                         |
| `defaultOptionMode`      | input                       | When the default renders: `'always'` (default) or `'fallback'`                                  |
| `noOptionsText`          | input                       | Text for the empty list (`NO_OPTIONS_TEXT`)                                                     |
| `sortFn`                 | input                       | Comparator applied to the combined list                                                         |
| `optionComponents`       | `contentChildren()`         | The projected option components as `IFormidableOptionSource`, `{ descendants: true }`           |
| `optionRefs`             | `viewChildren()`, protected | The rendered `#optionRef` options, used to scroll the highlight into view                       |
| `highlightedOptionIndex` | signal, protected           | The highlighted index, `-1` for none — drives both `is-highlighted` and `aria-activedescendant` |
| `optionId(index)`        | method, protected           | `{fieldId}-option-{index}`, or `null` for a negative index                                      |

`optionComponents` is the only public member of the four. The other three are `protected`: they exist for a subclass, not for a template or a `viewChild()` handle.

**Extension Contract**: subclasses supply `onOptionsChanged()` — recombine the options, then reconcile selection and highlight against them — and `activeOptions`, a signal holding the rendered list the highlight walks (`autocomplete-field` holds its filtered list, the other three their full one) — the same signal the field's own template renders from. A single-select field additionally overrides `selectedOptionValue` so the selection can claim the highlight; the multi-select `checkbox-group-field` leaves it `null`, which is what drops the selection-wins step for it. The base owns the rest: one effect calls `onOptionsChanged()` whenever any of the four option inputs or the `optionComponents` query moves, and it implements `setHighlightedIndex`, `highlightSelectedOption` and `reconcileHighlightAfterOptionsChanged`. The last one follows the previously highlighted **value** across a changed list before falling back to a clamped index, and skips disabled options either way; a field that only wants a live highlight while its panel is open guards its own call, as the two panel fields do.

---

## Field Components

All extend `BaseFieldDirective<T>` (inherited API above); the four option fields extend `BaseOptionFieldDirective<T>`. Tables list each field's OWN inputs only.

**Panel Control**: the three fields with a panel — `dropdown-field`, `autocomplete-field` and `date-field` — expose `isPanelOpen` as a signal to read and `togglePanel(isOpen)` as the way to open or close it from outside. There is no `isPanelOpen` input: a panel is state the field owns and closes by itself (on a selection, an outside click, `Escape`), so a one-way binding would go stale the moment it did. Reach the method through a template reference (`#field`) or a `viewChild()`, exactly as `focus()` is reached.

### Input Field

**Selector** `formidable-input-field` · **Value** `string | null`

Text input with optional ngx-mask masking.

| Input          | Type                     | Default | Description              |
| :------------- | :----------------------- | :------ | :----------------------- |
| `autocomplete` | `AutoFill`               | `'off'` | Native autocomplete hint |
| `minLength`    | `number`                 | `-1`    | Min length (`-1` = off)  |
| `maxLength`    | `number`                 | `-1`    | Max length (`-1` = off)  |
| `mask`         | `string`                 | —       | ngx-mask pattern         |
| `maskConfig`   | `Partial<NgxMaskConfig>` | —       | Per-field mask overrides |

**Use when** you need a single-line text field, optionally masked (phone, IBAN, etc.).

### Textarea Field

**Selector** `formidable-textarea-field` · **Value** `string | null`

Multi-line text with optional autosize and a length indicator.

| Input                 | Type                     | Default | Description              |
| :-------------------- | :----------------------- | :------ | :----------------------- |
| `autocomplete`        | `AutoFill`               | `'off'` | Native autocomplete hint |
| `minLength`           | `number`                 | `-1`    | Min length (`-1` = off)  |
| `maxLength`           | `number`                 | `-1`    | Max length (`-1` = off)  |
| `enableAutosize`      | `boolean`                | `true`  | Grow height with content |
| `showLengthIndicator` | `boolean`                | `false` | Show a character counter |
| `mask`                | `string`                 | —       | ngx-mask pattern         |
| `maskConfig`          | `Partial<NgxMaskConfig>` | —       | Per-field mask overrides |

**Use when** you need free-form multi-line input.

### Select Field

**Selector** `formidable-select-field` · **Value** `string | null`

Native-style single select. Options come from the `options` input or projected `formidable-field-option` children. The field draws its own dropdown arrow, from the same icon and `--formidable-field-toggle-size` box as the panel fields' toggle, because the shared field reset takes the user agent's away with `appearance: none`. The arrow overlays the control and takes no pointer events, so a click anywhere in the field still opens the platform's list; it is not projected content and, unlike the date field's toggle, has no icon slot.

| Input               | Type                     | Default                   | Description                                                                                  |
| :------------------ | :----------------------- | :------------------------ | :------------------------------------------------------------------------------------------- |
| `options`           | `IFormidableOption[]`    | `[]`                      | Option list                                                                                  |
| `defaultOption`     | `IFormidableOption`      | —                         | Option pinned first                                                                          |
| `defaultOptionMode` | `FieldDefaultOptionMode` | `'always'`                | When it renders                                                                              |
| `noOptionsText`     | `string`                 | `'No options available.'` | Empty-state text, rendered as a disabled `<option>` — the one field that puts it in the list |
| `sortFn`            | `(a, b) => number`       | —                         | Optional option sorter                                                                       |

These five look like the option inputs above but are declared on the field itself, because `select-field` stays on `BaseFieldDirective`: a native `<select>` has no highlight, so inheriting the option base would only add dead state. Collects option components via `contentChildren(FORMIDABLE_OPTION, { descendants: true })` and provides `FORMIDABLE_OPTION_FIELD`. **Use when** a compact single-choice control fits.

### Dropdown Field

**Selector** `formidable-dropdown-field` · **Value** `string | null`

Custom single-select with a floating panel. Option inputs come from **Base Option Field Directive**.

| Input           | Type                      | Default  | Description     |
| :-------------- | :------------------------ | :------- | :-------------- |
| `panelPosition` | `FormidablePanelPosition` | `'full'` | Panel placement |

Supports projected `formidable-field-option` children. **Use when** you need a styled dropdown with rich option content. The panel is opened and closed from outside through `togglePanel(isOpen)` — see **Panel Control**.

### Autocomplete Field

**Selector** `formidable-autocomplete-field` · **Value** `string | null`

Dropdown panel plus a filter input. Emits filter text; the consumer supplies filtered options (the portal pairs it with fuse.js). Option inputs come from **Base Option Field Directive**.

| Input           | Type                      | Default  | Description     |
| :-------------- | :------------------------ | :------- | :-------------- |
| `panelPosition` | `FormidablePanelPosition` | `'full'` | Panel placement |

The default option is pinned after filtering, so an `always` default stays visible even when the filter matches nothing. **Output** `filterChanged: string` (+ `filterChange$`). The panel is opened and closed from outside through `togglePanel(isOpen)` — see **Panel Control**. **Use when** the option set is large or fetched/filtered dynamically.

### Date Field

**Selector** `formidable-date-field` · **Value** `Date | null`

Date picker backed by Pikaday.

| Input                | Type                      | Default         | Description                 |
| :------------------- | :------------------------ | :-------------- | :-------------------------- |
| `unicodeTokenFormat` | `string`                  | `'yyyy-MM-dd'`  | date-fns parse/format token |
| `emptyHint`          | `FormidableEmptyHint`     | `'underscores'` | Resting empty display       |
| `panelPosition`      | `FormidablePanelPosition` | `'right'`       | Panel placement             |

The calendar is opened and closed from outside through `togglePanel(isOpen)` — see **Panel Control**.

**Toggle icon**: the panel toggle draws a CSS arrow by default. Project `[formidableFieldToggleIcon]` content into the field to replace it — the library ships no SVG, so the consumer owns everything about the projected markup: size, color and hover feedback. The toggle centers it and carries the `open` class while the panel is open.

**Pikaday passthrough** inputs, each applied to the calendar when it changes at runtime: `ariaLabel`, `defaultDate`, `setDefaultDate`, `firstDay`, `minDate`, `maxDate`, `disableWeekends`, `disableDayFn`, `yearRange`, `i18n`, `yearSuffix`, `showMonthAfterYear`, `showDaysInNextAndPreviousMonths`, `enableSelectionDaysInNextAndPreviousMonths`, `numberOfMonths`.

**Keyboard**: `ArrowUp` / `ArrowDown` step the `unicodeTokenFormat` segment under the caret — year, month or day — and leave it selected; a step outside `minDate`/`maxDate` is refused. `Alt` + those keys work the panel, and while it is open the arrows move the calendar instead. Plain arrows never open it. Full table in `user/fields.md`.

**Use when** you need calendar date selection.

### Time Field

**Selector** `formidable-time-field` · **Value** `Date | null`

Masked time input.

| Input                | Type                  | Default         | Description                 |
| :------------------- | :-------------------- | :-------------- | :-------------------------- |
| `unicodeTokenFormat` | `string`              | `'HH.mm'`       | date-fns parse/format token |
| `emptyHint`          | `FormidableEmptyHint` | `'underscores'` | Resting empty display       |

**Keyboard**: `ArrowUp` / `ArrowDown` step the `unicodeTokenFormat` segment under the caret — hour, minute, second or AM/PM — and leave it selected. Full table in `user/fields.md`.

**Use when** you need time-of-day entry.

### Toggle Field

**Selector** `formidable-toggle-field` · **Value** `boolean | null`

On/off switch with keyboard support (Space/Enter).

| Input           | Type                                 | Default    | Description          |
| :-------------- | :----------------------------------- | :--------- | :------------------- |
| `labelPosition` | `FormidableToggleFieldLabelPosition` | `'before'` | Label side, optional |
| `onLabel`       | `string`                             | —          | Label shown when on  |
| `offLabel`      | `string`                             | —          | Label shown when off |

**Use when** you need a boolean toggle.

### Slider Field

**Selector** `formidable-slider-field` · **Value** `number | null`

Range slider with optional tick marks and labels.

| Input                        | Type                    | Default | Description                 |
| :--------------------------- | :---------------------- | :------ | :-------------------------- |
| `min`                        | `number`                | `0`     | Minimum                     |
| `max`                        | `number`                | `100`   | Maximum                     |
| `step`                       | `number`                | `1`     | Step increment              |
| `minLabel`                   | `string`                | —       | Label at the minimum        |
| `maxLabel`                   | `string`                | —       | Label at the maximum        |
| `showThumbLabel`             | `boolean`               | `true`  | Show the thumb value bubble |
| `showTickMarks`              | `boolean`               | `false` | Render tick marks           |
| `showMinMaxLabels`           | `boolean`               | `false` | Show min/max labels         |
| `showTickLabels`             | `boolean`               | `false` | Label the tick marks        |
| `tickInterval`               | `number`                | —       | Interval between ticks      |
| `transformValueToThumbLabel` | `(v: number) => string` | —       | Format the thumb label      |
| `transformTickToTickLabel`   | `(v: number) => string` | —       | Format tick labels          |

**Use when** you need numeric selection within a range.

### Radio Group Field

**Selector** `formidable-radio-group-field` · **Value** `string | null`

Single choice from projected options. No inputs of its own — everything comes from **Base Option Field Directive**.

Collects `formidable-field-option` children. With no options it renders `noOptionsText` as plain text, not as an option. **Use when** all choices should be visible and mutually exclusive.

### Checkbox Group Field

**Selector** `formidable-checkbox-group-field` · **Value** `string[]`

Multi-select from projected options. No inputs of its own — everything comes from **Base Option Field Directive**.

Collects `formidable-field-option` children. With no options it renders `noOptionsText` as plain text, not as an option. **Use when** multiple choices may be selected.

---

## Structural Components

### Field Decorator

**Selector** `formidable-field-decorator`

Wraps a field and its label, label adornment, prefix, suffix, hints and errors into one decorated control. Discovers the field via the `FORMIDABLE_FIELD` token and projects the decoration directives via `contentChild()`. Forwards the field's `valueChanged` / `focusChanged` as outputs of its own. Exposes `decoratorLayout: 'horizontal' | 'vertical' | 'inline'` and measures a projected prefix/suffix in the `horizontal` layout. No inputs. It mirrors a field's surface as plain getters but does not implement `IFormidableField`, which is signal-typed; the getters are reactive all the same, since each reads a signal.

**Label Adornment**: a slot beside the label, in the same row, for whatever the consumer wants next to it — the library owns the slot only, never its content. It collapses with that row: a label rendered over the field takes its row with it, and an adornment left above a field it no longer decorates is worse than no adornment, so it hides too.

**Prefix And Suffix Placement**: a `horizontal` and `inline` concept only. The `vertical` layout stacks its group inside a fieldset, which leaves a prefix/suffix nothing to sit beside and no value to inset, so the slots are not rendered there at all.

**Prefix And Suffix Measurement**: a projected prefix/suffix takes horizontal space the field has to give up, so the decorator measures its wrapper — which shrink-wraps the projected content, padding included — and publishes the width on its own host as `--formidable-field-prefix-inset` / `--formidable-field-suffix-inset`. The stylesheet turns those into the field's `padding-left` / `padding-right` and into the bounds of a label rendered over the value; both fall back to `--formidable-field-padding-x` when unset. The measurement runs in a `ResizeObserver` over both wrappers, so it follows content being added or removed, a font loading, or a wrapper being hidden — and a hidden wrapper measures zero, which removes the property and gives the field its own padding back. CSS owns the padding throughout; the decorator never writes an inline `style.padding`.

**Prefix And Suffix Alignment**: each slot's `align: FieldAdornmentAlignment` (default `'center'`) chooses what it follows vertically — the `center` of the field's box, or the `value`, which an inside label pushes down. `value` adds the value's own `--formidable-field-value-padding-top` to a wrapper that stays centred, which moves its content by half that padding: exactly where the value's text lands. It is therefore a no-op wherever nothing displaces the value (`outside`, `border` and `border-prefix` labels). A field that declares `valueAlignment: 'top'` already aligns with its value and keeps doing so, so `align` does not apply there. Horizontal layout only — `inline` is a centred flex row.

**Prefix And Suffix Actions**: the wrappers are `pointer-events: none`, so a text adornment over the field's edge still focuses the field. `_globals.scss` excepts a projected `button` and `a`, which is what makes a clear, copy, retry or loading action possible; the library ships none of them, only the slot. Such an action needs no refresh call — the `ResizeObserver` above already re-insets the field when the action appears, disappears or swaps its content.

**Hints**: `formidableFieldHint` elements share one row below the field and above the errors, outside the layout container — so, like the errors, they render identically in all three `decoratorLayout`s. The row is content-only: the library owns the slot, never what goes in it, and there are no pre-defined hints. Hints split the row in equal parts and each aligns its own text via `align`, so a `start` note and an `end` counter sit on one line. The row is sized by its content and collapses entirely when nothing is projected. Both the equal split and the per-hint alignment live in `_globals.scss`: the hint element belongs to the consumer's view, which the decorator's encapsulated stylesheet cannot reach.

**In-Field Toggle**: `dropdown-field` and `date-field` draw a panel toggle inside their own box, at the field's inner right edge, and `select-field` draws its dropdown arrow in the same place. It is not projected content, so instead of measuring it the field declares `hasInFieldToggle` and the decorator turns that into a `has-in-field-toggle` host class, which raises `--formidable-field-toggle-inset` to `--formidable-field-toggle-size`. All three report it as `!readonly && !disabled` rather than as a constant, because none renders the toggle in those states: the class and the inset go away with it, and the value reclaims the space. Only the value inset adds it: in the two panel fields the toggle is a flex item inside the field's `padding-right`, so a projected suffix — measured into that padding — already pushes the toggle left of itself. `select-field` cannot put anything in flow beside its value, since the value area is a native `<select>`, so its host is a one-cell grid that stacks the arrow over the control; the arrow takes no pointer events and the select reserves the room with its own `padding-right`, which is what keeps the whole box clickable.

**Field State**: the decorator is where all of the field's state is reachable at once, so it mirrors it onto its own host as `is-readonly`, `is-disabled`, `is-focused`, `is-invalid`, `label-resting`, `label-inside`, `has-in-field-toggle`, `has-open-panel` and `has-open-sheet`. The last two lift the decorator into the consumer's stack for as long as a panel is open, and only then — see `tech/layering.md`. A field used **without** a decorator carries `is-undecorated`, `has-open-panel` and `has-open-sheet` on its own host instead, so its panel still paints correctly. `is-invalid` comes from the `FieldErrorsComponent` that `FieldErrorsDirective` registers with the decorator — nothing else in the library knows a control's validity, so a field used without a decorator has no invalid styling.

Each state is a set of `--formidable-color-field-*` remaps rather than a set of property declarations, so a field picks up whichever set applies without every rule restating `background`, `color` and `border-color`. Four of the five are applied on the field element itself, where their order in the `field` and `group-field` mixins is their precedence: `hovered` < `focused` < `readonly` < `disabled`. `invalid` is the exception — it is applied on the decorator's host and inherited, which makes its precedence a matter of _which_ variables it remaps: it points the base, hover and focus colours at the invalid ones and leaves the readonly and disabled ones alone, so it survives hover and focus but yields to readonly and disabled. The group fields reuse the field's state colours; the toggle's track and the slider's track follow the same variables.

**Field Accessibility**: the decorator owns the label, the hint row and the errors slot, so it is what mints the ids they carry — `{fieldId}-label`, `{fieldId}-hint` and `{fieldId}-errors` — and exposes `labelledById` and `describedByIds` for the field to bind. `describedByIds` names both wrappers unconditionally: they always render, and a reference to a hidden or empty element contributes nothing to the accessible description, so there is no state to track. `labelledById` is `null` until a label is projected, because an `aria-labelledby` pointing at nothing would suppress whatever else might have named the field. The errors slot is an `aria-live="polite"` region, so an error appearing while the field is already focused is announced rather than waiting for the next focus.

`aria-labelledby` is what the `vertical` layout has instead of a `<label for>`, which its `div` label cannot be. It is also the toggle's only name: the toggle's `[id]` is on its hidden checkbox while the focusable element is the `role="switch"` `div`, and its own `onLabel` / `offLabel` is state text rather than a name. For the same reason the `vertical` layout renders no `legend` — the field inside carries the group role and is named from the projected label, so a legend would only add a second announcement of the raw control name.

| Field                                                | Element carrying the state                  | Attributes beyond `aria-required` / `aria-invalid` / `aria-describedby`           |
| :--------------------------------------------------- | :------------------------------------------ | :-------------------------------------------------------------------------------- |
| `input-field`, `textarea-field`                      | the `input` / `textarea`                    | — native `readonly` and `disabled` already speak                                  |
| `select-field`                                       | the `select`                                | `aria-readonly` (native `readonly` is inert on a `select`)                        |
| `dropdown-field`, `autocomplete-field`, `date-field` | the wrapped `input[role=combobox]`          | `aria-readonly`, plus the combobox set below                                      |
| `time-field`                                         | the wrapped `input`                         | `aria-readonly`                                                                   |
| `slider-field`                                       | the `input[type=range]`                     | `aria-labelledby`, `aria-readonly`, `aria-valuetext`                              |
| `toggle-field`                                       | the `div[role=switch]`                      | `aria-labelledby`, `aria-checked`, `aria-readonly`, `aria-disabled`               |
| `radio-group-field`, `checkbox-group-field`          | the `div[role=radiogroup]` / `[role=group]` | `aria-labelledby`, `aria-readonly`, `aria-disabled`, plus `aria-activedescendant` |

`aria-readonly` and `aria-disabled` are set only where no native attribute does the job — a `div`, or a `select` / range input that ignores `readonly`. The slider gets no `aria-valuenow`, `aria-valuemin` or `aria-valuemax`: a native range already reports all three. `aria-valuetext` is the exception, set only once `transformValueToThumbLabel` makes the value read as something other than its number. The hidden `input`s inside the groups and the toggle stay out of the accessibility tree entirely.

**Combobox And Options**: the ids for everything inside a field's own box are the field's to mint — see **Accessibility** under **Base Field Directive**. `time-field` and `select-field` take none of this: one has no panel, the other is a native `select` the platform already speaks for.

| Field                                       | Popup                                      | On the control                                                                |
| :------------------------------------------ | :----------------------------------------- | :---------------------------------------------------------------------------- |
| `dropdown-field`                            | `.panel-scrollcontainer[role=listbox]`     | `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`  |
| `autocomplete-field`                        | `.panel-scrollcontainer[role=listbox]`     | as above, plus `aria-autocomplete="list"`                                     |
| `date-field`                                | `.panel-scrollcontainer[role=dialog]`      | `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` |
| `radio-group-field`, `checkbox-group-field` | — the options are the group's own children | `aria-activedescendant`                                                       |

The role sits on `.panel-scrollcontainer` rather than on the panel itself, so the options a listbox owns are its direct children. `aria-expanded` and the option state attributes bind their boolean raw, because a closed combobox has to report `false` rather than fall silent — unlike every `|| null` state attribute. `aria-activedescendant` is bound off the same stream that drives the `is-highlighted` class, so the highlight and the active descendant cannot name different options; a panel starts with nothing highlighted, while a group highlights its first option straight away so the arrows have somewhere to start.

`date-field` is deliberately a `dialog` rather than a listbox: a Pikaday calendar is not a list, and its cells are third-party markup with no ids of ours, so there is nothing to point `aria-activedescendant` at. The dialog is named from the same `labelledBy` as everything else, and stays unnamed without a projected label.

The two panel fields render their empty state as plain text, exactly as the groups do — a listbox must not offer "no options available" as something to pick, and it also means an empty panel contains no `role="option"` at all.

**Label Position**: `formidableFieldLabel`'s `position: FieldLabelPosition` (default `'inside'`) chooses between six mutually exclusive, statically-configured modes.

The decorator resolves the configured position against the field's own state into one `labelState`, emitted as a `label-*` class on `.label-wrapper`, plus a `label-inside` class on its own host whenever the label sits over the value area. Any position other than `outside` needs a `horizontal` `decoratorLayout` — the only layout with room for a label over the field — so all of them are a no-op for `toggle-field`, `radio-group-field`, `checkbox-group-field` and `slider-field`.

| `labelState`          | Resolved From                                                                               |
| :-------------------- | :------------------------------------------------------------------------------------------ |
| `label-outside`       | `position: 'outside'`, or a field whose layout has no room                                  |
| `label-resting`       | `position: 'inside'` with no `placeholder`, or `'inside-placeholder'` — plus `canLabelRest` |
| `label-floating`      | either `inside` position without that, or `'inside-floating'`                               |
| `label-border`        | `position: 'border'`                                                                        |
| `label-border-prefix` | `position: 'border-prefix'`                                                                 |

`labelState` reads field state that is none of the decorator's own inputs — `readonly`, `disabled`, `placeholder`, mask configuration — so the decorator has nothing of its own to change. It follows them because each is a signal, and reading one is what marks the decorator's view.

**Label As Placeholder**: `inside` and `inside-placeholder` differ only in what they do about the field's `placeholder`. `inside` yields the value area to it: a field with a placeholder has nothing left to rest in, so its label floats throughout. `inside-placeholder` takes the area over instead — the label rests in the placeholder's position and the decorator's `label-resting` host blanks `--formidable-color-field-placeholder`, so the field's own does not render behind it; focus floats the label and reveals it.

Whether a placeholder blocks a resting label is therefore the position's call, made in `labelState`, not the field's. `canLabelRest` covers only what a field renders of its own accord — a value, or a mask showing its slots (via `showsEmptyValueHint`) — and vetoes both positions alike. The resting label takes `--formidable-color-field-label-resting`, its own variable, precisely so blanking the placeholder cannot blank the label with it.

**Label Geometry**: an `outside` label sits in `.before-wrapper` in normal flow. Every other position renders the label over the field, which puts it in `.container-horizontal` — the field's own positioning context, whose top edge is the field's border-box top. Each offset is therefore a plain distance from that edge, unreachable by anything around the label, and `.before-wrapper` collapses entirely once the label has left it.

| Offset                               | Lands At                                                                                              |
| :----------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `--formidable-label-floating-offset` | The top of the centered label-plus-value block, `--formidable-label-inside-slack` below the inner top |
| `--formidable-label-resting-offset`  | `--formidable-field-value-centered-top`, so an empty field's label is centered in the inner height    |
| `--formidable-label-border-offset`   | Negative — the label's line-box straddles the field's top border                                      |

A floating label's value clears it because the `label-inside` host hands the field a `--formidable-field-value-padding-top`; a `textarea`, whose value is top-aligned rather than centered, uses `--formidable-field-value-top` instead. The `border` positions get neither, so their value stays centered exactly as with `outside`. Horizontally, a label is bounded by the same value inset the field's own padding is built from — see **Prefix And Suffix Measurement** and **In-Field Toggle** above — plus one `--formidable-field-border-thickness`, because that padding is measured from the field's content box while the label is positioned from its border-box. The label therefore stays aligned with the value instead of colliding with a prefix or disappearing behind a panel toggle. A panel field renders its value in an inner `.wrapped-input` that the field's own padding cannot reach, so that input carries no padding of its own beyond the label's clearance — a user agent's default input padding is left placing the value otherwise. A `border` label additionally shrink-wraps and is pulled left by `--formidable-label-border-gap`, so it hides only the stretch of border it covers while its text still starts where the value does; `border-prefix` is the same mixin anchored to `--formidable-field-padding-x` instead, which is where a projected prefix's text starts. The border is hidden by a `linear-gradient` band one `--formidable-field-border-thickness` tall, painted in `--formidable-color-label-border-band` — its own variable, because `readonly` / `disabled` remap the field's fill on the field element, out of the label's reach, so the decorator's host remaps the band's colour instead. Any label rendered over the field stays on one line and ellipsizes.

**Required Marker**: a field's `showRequiredMarker` input suffixes a marker to its label, in every label position and in the group layout's `div` label alike. `showRequiredMarkers` on `NgxFormidableFormDirective` withholds the marker from every field on that form, so one switch answers whether this form marks its required fields at all; it hides the glyph only, and `aria-required` keeps following the field's own input. The glyph is `--formidable-label-required-marker`, a `content` string, so a theme can swap `*` for a word without touching markup. It carries no colour of its own — it inherits the label, and so follows every state with it — and it is `aria-hidden`, because a glyph is no way to say "required"; the accessible form of the same fact is `aria-required` on the field. `.label-wrapper` is a flex row for it, and the marker is a sibling of the projected label rather than part of it: when a label runs out of room, the consumer's own text is what ellipsizes and the marker survives. A field with no label projected has nothing to suffix, and the wrapper collapses with it.

`showRequiredMarker` is **presentational only**. It validates nothing, so a field marked with it and a validator without a matching rule can drift apart, and keeping the two in step is the consumer's job. The field sets no native `required` attribute and registers no validator of its own — which validator decides the field is invalid is entirely the consumer's choice. It is not called `required` because Angular's own `RequiredValidator` matches `[required][ngModel]` on any element, so that name would attach a validator alongside the marker. See `user/validation.md`.

### Field Option

**Selector** `formidable-field-option`

A single option inside an option-based field. Provides `FORMIDABLE_OPTION` and throws if used outside a `FORMIDABLE_OPTION_FIELD` parent. Supports projected template content. It may sit anywhere inside the field element — directly, inside a `@for` / `*ngIf` / `<ng-template>`, or nested in a wrapper element — but it must be **written inside** that element: Angular resolves both the parent injection and the content query from where the option is declared, not from where it renders.

| Member        | Type                  | Default                            | Description                                                        |
| :------------ | :-------------------- | :--------------------------------- | :----------------------------------------------------------------- |
| `value`       | `string` (required)   | —                                  | Option value                                                       |
| `label`       | `string`              | The projected content's text       | Display label                                                      |
| `readonly`    | `boolean`             | `false`                            | Read-only option                                                   |
| `disabled`    | `boolean`             | `false`                            | Disabled option                                                    |
| `selected`    | `boolean`             | `false`                            | Selected state                                                     |
| `highlighted` | `boolean`             | `false`                            | Highlighted state                                                  |
| `select`      | `() => void`          | Selects it in the parent field     | Overrides what picking the option does                             |
| `match`       | `(filter) => boolean` | Case-insensitive `label` substring | Overrides how the autocomplete filter matches it                   |
| `layout`      | `FieldOptionLayout`   | `'inline'`                         | Option layout, a look only. The ARIA role follows the parent field |
| `template`    | getter                | —                                  | The projected content, or `undefined` when none was projected      |
| `option`      | computed              | —                                  | The plain `IFormidableOption` the owning field reads — see below   |

**Component And Data**: `IFormidableOption` is plain data — the shape a consumer writes into a field's `options` input, and the shape every field works with internally. A component is a different thing: its members are signals. `option` is the one boundary between them, and it is what `FORMIDABLE_OPTION` provides: the component folds its inputs, its projected content and its two behaviour defaults into one plain option, and the owning field reads that. `label` therefore falls back to the text taken off the projected content, and `select` and `match` resolve their defaults there rather than on the input — which is why the plain option a field holds always carries both.

**Accessibility**: the option's ARIA lands on its host element, not on the inner `div` — the host is the direct child of the `listbox` / `radiogroup` / `group` that owns it, and an element with no role in between would break that ownership. The role comes from the parent field's `optionRole`, never from `layout`: `layout` is a look a consumer may set freely, while the role has to follow the container. It is also what chooses the state attribute — `aria-selected` for an `option`, `aria-checked` for a `radio` or a `checkbox`, each binding its boolean raw so an unselected option reports `false`. `readonly` folds into `aria-disabled` alongside `disabled`: ARIA has no `aria-readonly` for these roles, and both flags mean the same thing here. The option's `id` is bound by the parent, which is what knows the index — see **Combobox And Options**.

### Field Errors

**Selector** `formidable-field-errors`

Renders validation error messages for a control. Reads `control.errors` through `FORMIDABLE_ERROR_EXTRACTOR`, whose default takes the `errors` array the form directive writes and otherwise falls back to Angular's own error keys, so built-in validators render with nothing wired. Error strings then pass through `FORMIDABLE_ERROR_TRANSLATOR`. `invalid` is true once the control has errors **and** its `revealOn` says so: `always` immediately, `dirty` once edited, `submitted` once the form is submitted, and `touched` (the default) once visited. The message list renders only while `invalid` is true, so a field that never fails costs nothing below itself and a message appearing pushes later content down. Reserving space against that shift is the consumer's own layout, on the `formidable-field-errors` host, which is always present.

Usually created by `FieldErrorsDirective` rather than written by hand. Inside a decorator it renders in that decorator's errors slot, after the field's layout container — never inside it, since that container is the positioning context for the label and the prefix/suffix and has to stay exactly the field's box. Placement is therefore the same for all three `decoratorLayout`s.

`invalid` is mirrored onto its own host as `is-invalid`, and the directive registers the component with the surrounding decorator so the same flag reaches that decorator's host — see **Field State** above. It is the only source of validity in the library, and `invalid` is a signal — which is what carries it to the decorator's host class and on to the field's `aria-invalid`, with nothing repainting either by hand. See **Field Accessibility**.

| Input          | Type               | Default | Description                                                         |
| :------------- | :----------------- | :------ | :------------------------------------------------------------------ |
| `ngModel`      | `NgModel`          | —       | Control to read errors from                                         |
| `ngModelGroup` | `NgModelGroup`     | —       | Group to read errors from                                           |
| `revealOn`     | `FormidableReveal` | unset   | When the messages appear. Left unset, the form's `revealOn` applies |

---

## Directives

### Form-Level

| Directive                                 | Selector                            | Purpose / API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :---------------------------------------- | :---------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NgxFormidableFormDirective<T>`           | `form[formidableForm]`              | Turns `NgForm` into a reactive value/validity surface and delegates the rules to an optional `FORMIDABLE_VALIDATOR`. Inputs `formValue` (`null`), `formShape: DeepRequired<T>` (`null`), `debounceMs` (`0`), `dependentFields` (`null`), `showRequiredMarkers` (`true`), `revealOn: FormidableReveal` (`'touched'`). Outputs `formValueChange`, `errorsChange: FormidableFormErrors`, `dirtyChange`, `validChange`. Plain observable properties, **not** outputs, so subscribe to them rather than binding: `pending$`, `idle$`. Method `createAsyncValidator(target)`. |
| `NgxFormidableFieldValidateDirective`     | `[ngModel]`                         | Registers as `NG_ASYNC_VALIDATORS` and validates the control as a **field rule**, resolving its dotted target and delegating to the host form directive. No inputs. No-op outside a formidable form, and again with no `FORMIDABLE_VALIDATOR` provided.                                                                                                                                                                                                                                                                                                                 |
| `NgxFormidableGroupValidateDirective`     | `[ngModelGroup]`                    | As above, as a **group rule** on the group's own target. No inputs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `NgxFormidableWholeFormValidateDirective` | `form[formidableValidateWholeForm]` | Validates the form as a **whole-form rule** under the `WHOLE_FORM` target, delegating to the host form directive. Input `formidableValidateWholeForm` (boolean attribute, default `true`).                                                                                                                                                                                                                                                                                                                                                                              |
| `NgxFormidableVestValidatorDirective<T>`  | `form[formSuite]`                   | **From `@cynthion/ngx-formidable/vest`.** Provides `FORMIDABLE_VALIDATOR` from a Vest suite. Input `formSuite: Suite`. The library's only Vest-aware code — see `user/validation.md`.                                                                                                                                                                                                                                                                                                                                                                                   |

### Field-Decoration

| Directive                      | Selector                          | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :----------------------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FieldErrorsDirective`         | `[formidableFieldErrors]`         | Instantiates a `FieldErrorsComponent` and wires its `ngModel`/`ngModelGroup` from DI — into the surrounding decorator's errors slot if there is one, beside the host control otherwise. Needs no form directive, so it also serves fields validated by Angular's own validators. Input `revealOn?: FormidableReveal` overrides the form's `revealOn` for this field; leaving it unset is what lets the form's setting through. |
| `FieldHintDirective`           | `[formidableFieldHint]`           | Projects always-visible support text into the decorator's hint row. Input `align: FieldHintAlignment` (`'start'`), emitted as `data-align`.                                                                                                                                                                                                                                                                                    |
| `FieldLabelAdornmentDirective` | `[formidableFieldLabelAdornment]` | Projects content beside the label. Exposes `elementRef`.                                                                                                                                                                                                                                                                                                                                                                       |
| `FieldLabelDirective`          | `[formidableFieldLabel]`          | Projects label content. Input `position: FieldLabelPosition` (`'inside'`).                                                                                                                                                                                                                                                                                                                                                     |
| `FieldPrefixDirective`         | `[formidableFieldPrefix]`         | Projects prefix content, in the `horizontal` and `inline` layouts. Input `align: FieldAdornmentAlignment` (`'center'`). Exposes `elementRef`.                                                                                                                                                                                                                                                                                  |
| `FieldSuffixDirective`         | `[formidableFieldSuffix]`         | Projects suffix content, in the `horizontal` and `inline` layouts. Input `align: FieldAdornmentAlignment` (`'center'`). Exposes `elementRef`.                                                                                                                                                                                                                                                                                  |
| `FieldToggleIconDirective`     | `[formidableFieldToggleIcon]`     | Marks projected content as a field's panel-toggle icon (date field). Exposes `elementRef`.                                                                                                                                                                                                                                                                                                                                     |

---

## Injection Tokens And Constants

| Token / Constant              | Purpose                                                                                    |
| :---------------------------- | :----------------------------------------------------------------------------------------- |
| `FORMIDABLE_FIELD`            | Identifies a field component to the decorator                                              |
| `FORMIDABLE_OPTION_FIELD`     | Identifies an option-hosting field                                                         |
| `FORMIDABLE_OPTION`           | Identifies an option within an option field                                                |
| `FORMIDABLE_MASK_DEFAULTS`    | Global ngx-mask config (set via `provideNgxFormidable`)                                    |
| `FORMIDABLE_ERROR_EXTRACTOR`  | `ValidationErrors` → displayed messages (default: the `errors` array, else the error keys) |
| `FORMIDABLE_ERROR_TRANSLATOR` | i18n hook for error strings (default: identity)                                            |
| `FORMIDABLE_VALIDATOR`        | The validator the form directive delegates to (unset: nothing validates)                   |
| `WHOLE_FORM`                  | The target a whole-form rule reports under (`'wholeForm'`)                                 |
| `NO_OPTIONS_TEXT`             | Default empty-options text                                                                 |

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
| `FormidableReveal`                   | `'touched' \| 'dirty' \| 'submitted' \| 'always'`                                                   |
| `FormidableToggleFieldLabelPosition` | `'before' \| 'after'`                                                                               |
| `IFormidableOption`                  | `{ value: string; label?; template?; readonly?; disabled?; select?(); match?(filter) }`             |

`FieldDefaultOptionMode` decides when an option field renders its `defaultOption`: `always`, pinned first and exempt from both `sortFn` and the autocomplete filter, or as a `fallback` only when the list would otherwise be empty.

`FieldOptionRole` is the optional `optionRole` member of `IFormidableOptionField` — the ARIA role that field's options take, and so also whether they report `aria-selected` or `aria-checked`. Optional, and an option falls back to `option` when its parent says nothing, so a custom option field that implements the interface without it still works.

`FormidableEmptyHint` sets what the date/time fields show while empty **and unfocused** — `_` slots or the `unicodeTokenFormat` itself. A focused empty field always shows `_` slots, because ngx-mask's caret arithmetic only recognizes its own placeholder character.

`FormidablePanelPosition` picks between two kinds of panel. `left`, `right` and `full` are **anchored**: absolutely positioned against the field, flipping above it when there is no room below and adopting the two field corners they sit against. The room is the viewport cropped by every ancestor that clips its overflow, so a field in a scrolling pane is placed against that pane rather than against the window. `sheet` is a **sheet**: `position: fixed` across the bottom of the viewport, full width, square where it meets the screen edge, and it never flips. A sheet is what a phone wants — an anchored panel in a narrow column is not. Two limits, both the consumer's to weigh: `fixed` is defeated by an ancestor `transform`, `filter` or `contain`, and an `autocomplete-field` sheet keeps focus in its filter input, so a soft keyboard can cover it. The date field moves focus to the panel when it opens, so its sheet is clear of the keyboard.

`DeepPartial<T>` and `DeepRequired<T>` (from `utility-types.ts`) build the form model and shape types. `formShape` takes a `DeepRequired<T>`.

### Interfaces

The contracts a custom field, option or validator implements. Every field component already satisfies its own through `BaseFieldDirective`; these matter when writing one from scratch. Every member that is an input is typed as the `Signal` the component declares for it — `IFormidableOption` is the exception, because it is data a consumer also writes by hand.

| Interface                 | Implemented by                  | Contract                                                                           |
| :------------------------ | :------------------------------ | :--------------------------------------------------------------------------------- |
| `IFormidableField<T>`     | every field, and the decorator  | What the decorator reads off a field: refs, id, state, value and both streams      |
| `IFormidableOptionField`  | the five option fields          | `options`, `defaultOption`, `defaultOptionMode`, `selectOption`, `optionRole`      |
| `IFormidableOption<T>`    | plain data, written by hand     | One option: `value`, `label`, `template`, its flags, `select` and `match`          |
| `IFormidableOptionSource` | `FieldOptionComponent`          | `option` — the plain option a component hands to the field that owns it            |
| `IFormidablePanelField`   | dropdown, autocomplete, date    | `panelRef`, `isPanelOpen`, `togglePanel`, `panelPosition`                          |
| `IFormidableMaskField`    | input, textarea                 | `mask`, `maskConfig`                                                               |
| `IFormidableValidator<T>` | the Vest validator, or your own | `validate(model, target): Observable<string[] \| null>` — see `user/validation.md` |

Per-field interfaces name the exact surface of one component: `IFormidableInputField`, `IFormidableTextareaField`, `IFormidableSelectField`, `IFormidableDropdownField`, `IFormidableAutocompleteField`, `IFormidableRadioGroupField`, `IFormidableCheckboxGroupField`, `IFormidableDateField`, `IFormidableTimeField`, `IFormidableToggleField`, `IFormidableSliderField`, and `IFormidablePikadayOptions` for the calendar passthrough set.

| Validation type               | Definition                                                                         |
| :---------------------------- | :--------------------------------------------------------------------------------- |
| `FormidableFormErrors`        | `Record<string, string[]>`, every message keyed by the target that reported it     |
| `FormidableErrorExtractorFn`  | `(errors: ValidationErrors \| null) => string[]`, for `FORMIDABLE_ERROR_EXTRACTOR` |
| `FormidableErrorTranslatorFn` | `(error: string) => string`, for `FORMIDABLE_ERROR_TRANSLATOR`                     |

---

## Catalogue Summary

| Component / Directive                     | Selector                            | Kind       | Value `T`         |
| :---------------------------------------- | :---------------------------------- | :--------- | :---------------- |
| `InputFieldComponent`                     | `formidable-input-field`            | Field      | `string \| null`  |
| `TextareaFieldComponent`                  | `formidable-textarea-field`         | Field      | `string \| null`  |
| `SelectFieldComponent`                    | `formidable-select-field`           | Field      | `string \| null`  |
| `DropdownFieldComponent`                  | `formidable-dropdown-field`         | Field      | `string \| null`  |
| `AutocompleteFieldComponent`              | `formidable-autocomplete-field`     | Field      | `string \| null`  |
| `DateFieldComponent`                      | `formidable-date-field`             | Field      | `Date \| null`    |
| `TimeFieldComponent`                      | `formidable-time-field`             | Field      | `Date \| null`    |
| `ToggleFieldComponent`                    | `formidable-toggle-field`           | Field      | `boolean \| null` |
| `SliderFieldComponent`                    | `formidable-slider-field`           | Field      | `number \| null`  |
| `RadioGroupFieldComponent`                | `formidable-radio-group-field`      | Field      | `string \| null`  |
| `CheckboxGroupFieldComponent`             | `formidable-checkbox-group-field`   | Field      | `string[]`        |
| `FieldDecoratorComponent`                 | `formidable-field-decorator`        | Structural | —                 |
| `FieldOptionComponent`                    | `formidable-field-option`           | Structural | —                 |
| `FieldErrorsComponent`                    | `formidable-field-errors`           | Structural | —                 |
| `NgxFormidableFormDirective`              | `form[formidableForm]`              | Directive  | —                 |
| `NgxFormidableFieldValidateDirective`     | `[ngModel]`                         | Directive  | —                 |
| `NgxFormidableGroupValidateDirective`     | `[ngModelGroup]`                    | Directive  | —                 |
| `NgxFormidableWholeFormValidateDirective` | `form[formidableValidateWholeForm]` | Directive  | —                 |
| `NgxFormidableVestValidatorDirective`     | `form[formSuite]`                   | Directive  | —                 |
| `FieldErrorsDirective`                    | `[formidableFieldErrors]`           | Directive  | —                 |
| `FieldHintDirective`                      | `[formidableFieldHint]`             | Directive  | —                 |
| `FieldLabelAdornmentDirective`            | `[formidableFieldLabelAdornment]`   | Directive  | —                 |
| `FieldLabelDirective`                     | `[formidableFieldLabel]`            | Directive  | —                 |
| `FieldPrefixDirective`                    | `[formidableFieldPrefix]`           | Directive  | —                 |
| `FieldSuffixDirective`                    | `[formidableFieldSuffix]`           | Directive  | —                 |
| `FieldToggleIconDirective`                | `[formidableFieldToggleIcon]`       | Directive  | —                 |
