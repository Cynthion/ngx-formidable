# UI Components

Catalogue of every public component and directive exported from `public-api.ts`. This is the authoritative detailed reference — the root `README.md` lists components abstractly and links here for the full API.

Every component is `standalone`, and uses `ChangeDetectionStrategy.OnPush` except `FieldDecoratorComponent` — it resolves its label state from field state it cannot observe, so it is checked every cycle. Field components implement `ControlValueAccessor` (usable with `ngModel`) and extend `BaseFieldDirective`; their shared surface is documented once below and not repeated per entry.

## Base Field Directive

`BaseFieldDirective<T = string | null>` — exported abstract `@Directive()` (no selector). The base class for every field and the extension point for custom fields (reference implementation: `example-custom-color-picker` in the demo). Implements `ControlValueAccessor` + `IFormidableField<T>`.

Inherited by every field:

| Member             | Kind        | Description                                                                                         |
| :----------------- | :---------- | :-------------------------------------------------------------------------------------------------- |
| `name`             | `@Input()`  | Field name (`''`)                                                                                   |
| `placeholder`      | `@Input()`  | Placeholder text (`''`)                                                                             |
| `readonly`         | `@Input()`  | Blocks input, still focusable (`false`)                                                             |
| `disabled`         | `@Input()`  | Fully disabled (`false`)                                                                            |
| `valueChanged`     | `@Output()` | `EventEmitter<T>` on value change                                                                   |
| `focusChanged`     | `@Output()` | `EventEmitter<boolean>` on focus/blur                                                               |
| `valueChange$`     | Observable  | Value stream                                                                                        |
| `focusChange$`     | Observable  | Focus stream                                                                                        |
| `fieldId`          | getter      | Generated unique id                                                                                 |
| `value`            | getter      | Current value                                                                                       |
| `canLabelRest`     | getter      | Whether nothing occupies the value area, so a label may rest there like a placeholder               |
| `hasInFieldToggle` | optional    | Whether the field renders a panel toggle inside its own box, which the value and a label must clear |
| `valueAlignment`   | optional    | Where the value sits vertically, which a prefix/suffix aligns with: `'center'` (default) or `'top'` |

**Extension Contract**: subclasses supply `keyboardCallback`, `externalClickCallback`, `windowResizeScrollCallback`, `registeredKeys`, `fieldRef`, `decoratorLayout`, a `value` getter, and `doWriteValue` / `doOnValueChange` / `doOnFocusChange`. The base handles global keydown / outside-click / resize-scroll listeners (run outside the Angular zone), readonly/disabled blocking, and label-rest state. `canLabelRest` is false while the field is focused, filled, readonly, disabled, or has a `placeholder`; a field that renders something else in its value area while empty says so by overriding the protected `showsEmptyValueHint` getter (`input-field` and `textarea-field` when their mask shows its slots, `select-field`, `date-field` and `time-field` always). A field whose value is top-aligned rather than centered — `textarea-field` — declares `valueAlignment: 'top'`, which moves a projected prefix/suffix onto the value's first line instead of centring it in a box that grows. A field that draws something of its own inside its box at the right edge — `dropdown-field` and `date-field`, with their panel toggle — declares `hasInFieldToggle`, which widens the value inset by `--formidable-field-toggle-size` so the value and a label stop short of it.

---

## Field Components

All extend `BaseFieldDirective<T>` (inherited API above). Tables list each field's OWN inputs only.

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

Native-style single select. Options come from the `options` input or projected `formidable-field-option` children.

| Input           | Type                       | Default                   | Description            |
| :-------------- | :------------------------- | :------------------------ | :--------------------- |
| `options`       | `IFormidableFieldOption[]` | `[]`                      | Option list            |
| `noOptionsText` | `string`                   | `'No options available.'` | Empty-state text       |
| `sortFn`        | `(a, b) => number`         | —                         | Optional option sorter |

Collects options via `@ContentChildren(FORMIDABLE_FIELD_OPTION)` and provides `FORMIDABLE_OPTION_FIELD`. **Use when** a compact single-choice control fits.

### Dropdown Field

**Selector** `formidable-dropdown-field` · **Value** `string | null`

Custom single-select with a floating panel.

| Input           | Type                       | Default                   | Description                |
| :-------------- | :------------------------- | :------------------------ | :------------------------- |
| `options`       | `IFormidableFieldOption[]` | `[]`                      | Option list                |
| `noOptionsText` | `string`                   | `'No options available.'` | Empty-state text           |
| `sortFn`        | `(a, b) => number`         | —                         | Optional option sorter     |
| `isPanelOpen`   | `boolean`                  | `false`                   | Panel open state (get/set) |
| `panelPosition` | `FormidablePanelPosition`  | `'full'`                  | Panel alignment            |

Supports projected `formidable-field-option` children. **Use when** you need a styled dropdown with rich option content.

### Autocomplete Field

**Selector** `formidable-autocomplete-field` · **Value** `string | null`

Dropdown panel plus a filter input. Emits filter text; the consumer supplies filtered options (the demo pairs it with fuse.js).

| Input           | Type                       | Default                   | Description                |
| :-------------- | :------------------------- | :------------------------ | :------------------------- |
| `options`       | `IFormidableFieldOption[]` | `[]`                      | Option list                |
| `noOptionsText` | `string`                   | `'No options available.'` | Empty-state text           |
| `sortFn`        | `(a, b) => number`         | —                         | Optional option sorter     |
| `isPanelOpen`   | `boolean`                  | `false`                   | Panel open state (get/set) |
| `panelPosition` | `FormidablePanelPosition`  | `'full'`                  | Panel alignment            |

**Output** `filterChanged: EventEmitter<string>` (+ `filterChange$`). **Use when** the option set is large or fetched/filtered dynamically.

### Date Field

**Selector** `formidable-date-field` · **Value** `Date | null`

Date picker backed by Pikaday.

| Input                | Type                      | Default         | Description                 |
| :------------------- | :------------------------ | :-------------- | :-------------------------- |
| `unicodeTokenFormat` | `string`                  | `'yyyy-MM-dd'`  | date-fns parse/format token |
| `emptyHint`          | `FormidableEmptyHint`     | `'underscores'` | Resting empty display       |
| `isPanelOpen`        | `boolean`                 | `false`         | Panel open state            |
| `panelPosition`      | `FormidablePanelPosition` | `'right'`       | Panel alignment             |

**Toggle icon**: the panel toggle draws a CSS arrow by default. Project `[formidableFieldToggleIcon]` content into the field to replace it — the library ships no SVG, so the consumer owns everything about the projected markup: size, color and hover feedback. The toggle centers it and carries the `open` class while the panel is open.

**Pikaday passthrough** inputs, each applied to the calendar when it changes at runtime: `ariaLabel`, `defaultDate`, `setDefaultDate`, `firstDay`, `minDate`, `maxDate`, `disableWeekends`, `disableDayFn`, `yearRange`, `i18n`, `yearSuffix`, `showMonthAfterYear`, `showDaysInNextAndPreviousMonths`, `enableSelectionDaysInNextAndPreviousMonths`, `numberOfMonths`.

**Use when** you need calendar date selection.

### Time Field

**Selector** `formidable-time-field` · **Value** `Date | null`

Masked time input.

| Input                | Type                  | Default         | Description                 |
| :------------------- | :-------------------- | :-------------- | :-------------------------- |
| `unicodeTokenFormat` | `string`              | `'HH.mm'`       | date-fns parse/format token |
| `emptyHint`          | `FormidableEmptyHint` | `'underscores'` | Resting empty display       |

**Use when** you need time-of-day entry.

### Toggle Field

**Selector** `formidable-toggle-field` · **Value** `boolean | null`

On/off switch with keyboard support (Space/Enter).

| Input           | Type                  | Default    | Description          |
| :-------------- | :-------------------- | :--------- | :------------------- |
| `labelPosition` | `'before' \| 'after'` | `'before'` | Label side           |
| `onLabel`       | `string`              | —          | Label shown when on  |
| `offLabel`      | `string`              | —          | Label shown when off |

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

Single choice from projected options.

| Input           | Type                       | Default                   | Description      |
| :-------------- | :------------------------- | :------------------------ | :--------------- |
| `options`       | `IFormidableFieldOption[]` | `[]`                      | Option list      |
| `noOptionsText` | `string`                   | `'No options available.'` | Empty-state text |
| `sortFn`        | `(a, b) => number`         | —                         | Optional sorter  |

Collects `formidable-field-option` children. **Use when** all choices should be visible and mutually exclusive.

### Checkbox Group Field

**Selector** `formidable-checkbox-group-field` · **Value** `string[]`

Multi-select from projected options.

| Input           | Type                       | Default                   | Description      |
| :-------------- | :------------------------- | :------------------------ | :--------------- |
| `options`       | `IFormidableFieldOption[]` | `[]`                      | Option list      |
| `noOptionsText` | `string`                   | `'No options available.'` | Empty-state text |
| `sortFn`        | `(a, b) => number`         | —                         | Optional sorter  |

Collects `formidable-field-option` children. **Use when** multiple choices may be selected.

---

## Structural Components

### Field Decorator

**Selector** `formidable-field-decorator`

Wraps a field and its label, label adornment, prefix, suffix and errors into one decorated control. Discovers the field via the `FORMIDABLE_FIELD` token and projects the decoration directives via `@ContentChild`. Forwards the field's `valueChanged` / `focusChanged`. Exposes `decoratorLayout: 'horizontal' | 'vertical' | 'inline'` and measures a projected prefix/suffix in the `horizontal` layout. No inputs.

**Label Adornment**: a slot beside the label, in the same row, for whatever the consumer wants next to it — the library owns the slot only, never its content. It collapses with that row: a label rendered over the field takes its row with it, and an adornment left above a field it no longer decorates is worse than no adornment, so it hides too.

**Prefix And Suffix Placement**: a `horizontal` and `inline` concept only. The `vertical` layout stacks its group inside a fieldset, which leaves a prefix/suffix nothing to sit beside and no value to inset, so the slots are not rendered there at all.

**Prefix And Suffix Measurement**: a projected prefix/suffix takes horizontal space the field has to give up, so the decorator measures its wrapper — which shrink-wraps the projected content, padding included — and publishes the width on its own host as `--formidable-field-prefix-inset` / `--formidable-field-suffix-inset`. The stylesheet turns those into the field's `padding-left` / `padding-right` and into the bounds of a label rendered over the value; both fall back to `--formidable-field-padding-x` when unset. The measurement runs in a `ResizeObserver` over both wrappers, so it follows content being added or removed, a font loading, or a wrapper being hidden — and a hidden wrapper measures zero, which removes the property and gives the field its own padding back. CSS owns the padding throughout; the decorator never writes an inline `style.padding`.

**In-Field Toggle**: `dropdown-field` and `date-field` draw a panel toggle inside their own box, at the field's inner right edge. It is not projected content, so instead of measuring it the field declares `hasInFieldToggle` and the decorator turns that into a `has-in-field-toggle` host class, which raises `--formidable-field-toggle-inset` to `--formidable-field-toggle-size`. Only the value inset adds it: the toggle is a flex item inside the field's `padding-right`, so a projected suffix — measured into that padding — already pushes the toggle left of itself.

**Label Position**: `formidableFieldLabel`'s `position: FieldLabelPosition` (default `'inside'`) chooses between five mutually exclusive, statically-configured modes.

The decorator resolves the configured position against the field's own state into one `labelState`, emitted as a `label-*` class on `.label-wrapper`, plus a `label-inside` class on its own host whenever the label sits over the value area. Any position other than `outside` needs a `horizontal` `decoratorLayout` — the only layout with room for a label over the field — so all of them are a no-op for `toggle-field`, `radio-group-field`, `checkbox-group-field` and `slider-field`.

| `labelState`          | Resolved From                                                       |
| :-------------------- | :------------------------------------------------------------------ |
| `label-outside`       | `position: 'outside'`, or a field whose layout has no room          |
| `label-resting`       | `position: 'inside'` and the field's `canLabelRest`                 |
| `label-floating`      | `position: 'inside'` without `canLabelRest`, or `'inside-floating'` |
| `label-border`        | `position: 'border'`                                                |
| `label-border-prefix` | `position: 'border-prefix'`                                         |

Because `labelState` reads field state the decorator cannot observe — `readonly`, `disabled`, `placeholder`, mask configuration — the decorator is deliberately **not** `OnPush`.

**Label Geometry**: an `outside` label sits in `.before-wrapper` in normal flow. Every other position renders the label over the field, which puts it in `.container-horizontal` — the field's own positioning context, whose top edge is the field's border-box top. Each offset is therefore a plain distance from that edge, unreachable by anything around the label, and `.before-wrapper` collapses entirely once the label has left it.

| Offset                               | Lands At                                                                                              |
| :----------------------------------- | :---------------------------------------------------------------------------------------------------- |
| `--formidable-label-floating-offset` | The top of the centered label-plus-value block, `--formidable-label-inside-slack` below the inner top |
| `--formidable-label-resting-offset`  | `--formidable-field-value-centered-top`, so an empty field's label is centered in the inner height    |
| `--formidable-label-border-offset`   | Negative — the label's line-box straddles the field's top border                                      |

A floating label's value clears it because the `label-inside` host hands the field a `--formidable-field-value-padding-top`; a `textarea`, whose value is top-aligned rather than centered, uses `--formidable-field-value-top` instead. The `border` positions get neither, so their value stays centered exactly as with `outside`. Horizontally, a label is bounded by the same value inset the field's own padding is built from — see **Prefix And Suffix Measurement** and **In-Field Toggle** above — plus one `--formidable-field-border-thickness`, because that padding is measured from the field's content box while the label is positioned from its border-box. The label therefore stays aligned with the value instead of colliding with a prefix or disappearing behind a panel toggle. A panel field renders its value in an inner `.wrapped-input` that the field's own padding cannot reach, so that input carries no padding of its own beyond the label's clearance — a user agent's default input padding is left placing the value otherwise. A `border` label additionally shrink-wraps and is pulled left by `--formidable-label-border-gap`, so it hides only the stretch of border it covers while its text still starts where the value does; `border-prefix` is the same mixin anchored to `--formidable-field-padding-x` instead, which is where a projected prefix's text starts. The border is hidden by a `linear-gradient` band one `--formidable-field-border-thickness` tall, painted in `--formidable-color-label-border-band` — its own variable, because `readonly` / `disabled` remap the field's fill on the field element, out of the label's reach, so the decorator's host remaps the band's colour instead. Any label rendered over the field stays on one line and ellipsizes.

### Field Option

**Selector** `formidable-field-option`

A single option inside an option-based field. Provides `FORMIDABLE_FIELD_OPTION` and throws if used outside a `FORMIDABLE_OPTION_FIELD` parent. Supports projected template content.

| Input         | Type                  | Default    | Description           |
| :------------ | :-------------------- | :--------- | :-------------------- |
| `value`       | `string` (required)   | —          | Option value          |
| `label`       | `string`              | —          | Display label         |
| `readonly`    | `boolean`             | `false`    | Read-only option      |
| `disabled`    | `boolean`             | `false`    | Disabled option       |
| `selected`    | `boolean`             | `false`    | Selected state        |
| `highlighted` | `boolean`             | `false`    | Highlighted state     |
| `select`      | `() => void`          | —          | Custom select handler |
| `match`       | `(filter) => boolean` | —          | Custom filter matcher |
| `layout`      | `FieldOptionLayout`   | `'inline'` | Option layout         |

### Field Errors

**Selector** `formidable-field-errors`

Renders validation error messages for a control. Reads the `errors` array off `control.errors['errors']`; `invalid` is true when touched and errored. Error strings pass through `FORMIDABLE_ERROR_TRANSLATOR`. The container always reserves one line of height (`--formidable-field-support-min-height`) so a single-line error doesn't shift later fields; longer, wrapping errors still push later content down.

Usually created by `FieldErrorsDirective` rather than written by hand. Inside a decorator it renders in that decorator's errors slot, after the field's layout container — never inside it, since that container is the positioning context for the label and the prefix/suffix and has to stay exactly the field's box. Placement is therefore the same for all three `decoratorLayout`s.

| Input          | Type           | Description                 |
| :------------- | :------------- | :-------------------------- |
| `ngModel`      | `NgModel`      | Control to read errors from |
| `ngModelGroup` | `NgModelGroup` | Group to read errors from   |

---

## Directives

### Form-Level

| Directive                                   | Selector                                             | Purpose / API                                                                                                                                                                                                                                                                                                               |
| :------------------------------------------ | :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NgxFormidableFormDirective<T>`             | `form[formidableForm]`                               | Bridges `NgForm` to a Vest suite. Signal inputs `formValue`, `formFrame: DeepRequired<T>`, `formSuite: StaticSuite`, `validationConfig`. Observable outputs `formValueChange$`, `errorsChange$`, `dirtyChange$`, `validChange$`, `pending$`, `idle$`. Method `createAsyncValidator(fieldPath, { debounceValidationInMs })`. |
| `NgxFormidableFormModelDirective`           | `[ngModel]`                                          | Registers as `NG_ASYNC_VALIDATORS`; delegates the control's validation to the host `NgxFormidableFormDirective`. Signal input `validationOptions`. No-op outside a formidable form (injects `NgxFormidableFormDirective` optionally).                                                                                       |
| `NgxFormidableFormModelGroupDirective`      | `[ngModelGroup]`                                     | As above, for group paths.                                                                                                                                                                                                                                                                                                  |
| `NgxFormidableFormRootValidateDirective<T>` | `form[formidableRootValidate][formValue][formSuite]` | Root / cross-field validation under the `ROOT_FORM` key. Signal inputs `formidableValidateRootForm`, `formValue`, `formSuite`, `validationOptions`.                                                                                                                                                                         |

### Field-Decoration

| Directive                      | Selector                          | Purpose                                                                                                                                                                                            |
| :----------------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FieldErrorsDirective`         | `[formidableFieldErrors]`         | Instantiates a `FieldErrorsComponent` and wires its `ngModel`/`ngModelGroup` from DI — into the surrounding decorator's errors slot if there is one, beside the host control otherwise. No inputs. |
| `FieldLabelAdornmentDirective` | `[formidableFieldLabelAdornment]` | Projects content beside the label. Exposes `elementRef`.                                                                                                                                           |
| `FieldLabelDirective`          | `[formidableFieldLabel]`          | Projects label content. `@Input() position: FieldLabelPosition` (`'outside'`).                                                                                                                     |
| `FieldPrefixDirective`         | `[formidableFieldPrefix]`         | Projects prefix content, in the `horizontal` and `inline` layouts. Exposes `elementRef`.                                                                                                           |
| `FieldSuffixDirective`         | `[formidableFieldSuffix]`         | Projects suffix content, in the `horizontal` and `inline` layouts. Exposes `elementRef`.                                                                                                           |
| `FieldToggleIconDirective`     | `[formidableFieldToggleIcon]`     | Marks projected content as a field's panel-toggle icon (date field). Exposes `elementRef`.                                                                                                         |

---

## Injection Tokens And Constants

| Token / Constant              | Purpose                                                 |
| :---------------------------- | :------------------------------------------------------ |
| `FORMIDABLE_FIELD`            | Identifies a field component to the decorator           |
| `FORMIDABLE_OPTION_FIELD`     | Identifies an option-hosting field                      |
| `FORMIDABLE_FIELD_OPTION`     | Identifies an option within an option field             |
| `FORMIDABLE_MASK_DEFAULTS`    | Global ngx-mask config (set via `provideNgxFormidable`) |
| `FORMIDABLE_ERROR_TRANSLATOR` | i18n hook for error strings (default: identity)         |
| `ROOT_FORM`                   | Cross-field validation key (`'rootForm'`)               |
| `NO_OPTIONS_TEXT`             | Default empty-options text                              |

---

## Type Aliases And Key Interfaces

| Name                                 | Definition                                                                                                       |
| :----------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| `FieldDecoratorLayout`               | `'horizontal' \| 'vertical' \| 'inline'`                                                                         |
| `FieldLabelPosition`                 | `'outside' \| 'inside' \| 'inside-floating' \| 'border' \| 'border-prefix'`                                      |
| `FieldOptionLayout`                  | `'inline' \| 'radio-group' \| 'checkbox-group'`                                                                  |
| `FieldValueAlignment`                | `'center' \| 'top'`                                                                                              |
| `FormidableEmptyHint`                | `'underscores' \| 'format'`                                                                                      |
| `FormidablePanelPosition`            | `'left' \| 'right' \| 'full'`                                                                                    |
| `FormidableToggleFieldLabelPosition` | `'before' \| 'after'`                                                                                            |
| `IFormidableFieldOption`             | `{ value: string; label?; template?; readonly?; disabled?; selected?; highlighted?; select?(); match?(filter) }` |

`FormidableEmptyHint` sets what the date/time fields show while empty **and unfocused** — `_` slots or the `unicodeTokenFormat` itself. A focused empty field always shows `_` slots, because ngx-mask's caret arithmetic only recognizes its own placeholder character.

`DeepPartial<T>` and `DeepRequired<T>` (from `utility-types.ts`) build the form model and frame types.

---

## Catalogue Summary

| Component / Directive                    | Selector                                             | Kind       | Value `T`         |
| :--------------------------------------- | :--------------------------------------------------- | :--------- | :---------------- |
| `InputFieldComponent`                    | `formidable-input-field`                             | Field      | `string \| null`  |
| `TextareaFieldComponent`                 | `formidable-textarea-field`                          | Field      | `string \| null`  |
| `SelectFieldComponent`                   | `formidable-select-field`                            | Field      | `string \| null`  |
| `DropdownFieldComponent`                 | `formidable-dropdown-field`                          | Field      | `string \| null`  |
| `AutocompleteFieldComponent`             | `formidable-autocomplete-field`                      | Field      | `string \| null`  |
| `DateFieldComponent`                     | `formidable-date-field`                              | Field      | `Date \| null`    |
| `TimeFieldComponent`                     | `formidable-time-field`                              | Field      | `Date \| null`    |
| `ToggleFieldComponent`                   | `formidable-toggle-field`                            | Field      | `boolean \| null` |
| `SliderFieldComponent`                   | `formidable-slider-field`                            | Field      | `number \| null`  |
| `RadioGroupFieldComponent`               | `formidable-radio-group-field`                       | Field      | `string \| null`  |
| `CheckboxGroupFieldComponent`            | `formidable-checkbox-group-field`                    | Field      | `string[]`        |
| `FieldDecoratorComponent`                | `formidable-field-decorator`                         | Structural | —                 |
| `FieldOptionComponent`                   | `formidable-field-option`                            | Structural | —                 |
| `FieldErrorsComponent`                   | `formidable-field-errors`                            | Structural | —                 |
| `NgxFormidableFormDirective`             | `form[formidableForm]`                               | Directive  | —                 |
| `NgxFormidableFormModelDirective`        | `[ngModel]`                                          | Directive  | —                 |
| `NgxFormidableFormModelGroupDirective`   | `[ngModelGroup]`                                     | Directive  | —                 |
| `NgxFormidableFormRootValidateDirective` | `form[formidableRootValidate][formValue][formSuite]` | Directive  | —                 |
| `FieldErrorsDirective`                   | `[formidableFieldErrors]`                            | Directive  | —                 |
| `FieldLabelAdornmentDirective`           | `[formidableFieldLabelAdornment]`                    | Directive  | —                 |
| `FieldLabelDirective`                    | `[formidableFieldLabel]`                             | Directive  | —                 |
| `FieldPrefixDirective`                   | `[formidableFieldPrefix]`                            | Directive  | —                 |
| `FieldSuffixDirective`                   | `[formidableFieldSuffix]`                            | Directive  | —                 |
| `FieldToggleIconDirective`               | `[formidableFieldToggleIcon]`                        | Directive  | —                 |
