# UI Components

Catalogue of every public component and directive exported from `public-api.ts`. This is the authoritative detailed reference — the root `README.md` lists components abstractly and links here for the full API.

Every component is `standalone` and uses `ChangeDetectionStrategy.OnPush`. Field components implement `ControlValueAccessor` (usable with `ngModel`) and extend `BaseFieldDirective`; their shared surface is documented once below and not repeated per entry.

## Base Field Directive

`BaseFieldDirective<T = string | null>` — exported abstract `@Directive()` (no selector). The base class for every field and the extension point for custom fields (reference implementation: `example-custom-color-picker` in the demo). Implements `ControlValueAccessor` + `IFormidableField<T>`.

Inherited by every field:

| Member            | Kind        | Description                             |
| :---------------- | :---------- | :-------------------------------------- |
| `name`            | `@Input()`  | Field name (`''`)                       |
| `placeholder`     | `@Input()`  | Placeholder text (`''`)                 |
| `readonly`        | `@Input()`  | Blocks input, still focusable (`false`) |
| `disabled`        | `@Input()`  | Fully disabled (`false`)                |
| `valueChanged`    | `@Output()` | `EventEmitter<T>` on value change       |
| `focusChanged`    | `@Output()` | `EventEmitter<boolean>` on focus/blur   |
| `valueChange$`    | Observable  | Value stream                            |
| `focusChange$`    | Observable  | Focus stream                            |
| `fieldId`         | getter      | Generated unique id                     |
| `value`           | getter      | Current value                           |
| `isLabelFloating` | getter      | Whether the decorator label floats      |

**Extension Contract**: subclasses supply `keyboardCallback`, `externalClickCallback`, `windowResizeScrollCallback`, `registeredKeys`, `fieldRef`, `decoratorLayout`, a `value` getter, and `doWriteValue` / `doOnValueChange` / `doOnFocusChange`. The base handles global keydown / outside-click / resize-scroll listeners (run outside the Angular zone), readonly/disabled blocking, and label-float state.

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

| Input                | Type                      | Default             | Description                 |
| :------------------- | :------------------------ | :------------------ | :-------------------------- |
| `unicodeTokenFormat` | `string`                  | `'yyyy-MM-dd'`      | date-fns parse/format token |
| `emptyHint`          | `FormidableEmptyHint`     | `'underscores'`     | Resting empty display       |
| `toggleIconClosed`   | `string`                  | `calendarArrowDown` | Icon when panel closed      |
| `toggleIconOpen`     | `string`                  | `calendarArrowUp`   | Icon when panel open        |
| `isPanelOpen`        | `boolean`                 | `false`             | Panel open state            |
| `panelPosition`      | `FormidablePanelPosition` | `'right'`           | Panel alignment             |

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

Wraps a field and its label, tooltip, prefix, suffix and errors into one decorated control. Discovers the field via the `FORMIDABLE_FIELD` token and projects the decoration directives via `@ContentChild`. Forwards the field's `valueChanged` / `focusChanged`. Exposes `decoratorLayout: 'single' | 'group' | 'inline'` and auto-adjusts prefix/suffix padding in the `single` layout. No inputs.

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

Renders validation error messages for a control. Reads the `errors` array off `control.errors['errors']`; `invalid` is true when touched and errored. Error strings pass through `FORMIDABLE_ERROR_TRANSLATOR`.

| Input          | Type           | Description                 |
| :------------- | :------------- | :-------------------------- |
| `ngModel`      | `NgModel`      | Control to read errors from |
| `ngModelGroup` | `NgModelGroup` | Group to read errors from   |

### Icon

**Selector** `formidable-icon`

Renders an inline SVG string (sanitized via `DomSanitizer`).

| Input   | Type     | Default          | Description         |
| :------ | :------- | :--------------- | :------------------ |
| `svg`   | `string` | —                | SVG markup (setter) |
| `size`  | `number` | `32`             | Square size in px   |
| `color` | `string` | `'currentColor'` | Fill color          |

---

## Directives

### Form-Level

| Directive                      | Selector                                             | Purpose / API                                                                                                                                                                                                                                                                                                               |
| :----------------------------- | :--------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormDirective<T>`             | `form[formidableForm]`                               | Bridges `NgForm` to a Vest suite. Signal inputs `formValue`, `formFrame: DeepRequired<T>`, `formSuite: StaticSuite`, `validationConfig`. Observable outputs `formValueChange$`, `errorsChange$`, `dirtyChange$`, `validChange$`, `pending$`, `idle$`. Method `createAsyncValidator(fieldPath, { debounceValidationInMs })`. |
| `FormModelDirective`           | `[ngModel]`                                          | Registers as `NG_ASYNC_VALIDATORS`; delegates the control's validation to the host `FormDirective`. Signal input `validationOptions`. No-op outside a formidable form (injects `FormDirective` optionally).                                                                                                                 |
| `FormModelGroupDirective`      | `[ngModelGroup]`                                     | As above, for group paths.                                                                                                                                                                                                                                                                                                  |
| `FormRootValidateDirective<T>` | `form[formidableRootValidate][formValue][formSuite]` | Root / cross-field validation under the `ROOT_FORM` key. Signal inputs `formidableValidateRootForm`, `formValue`, `formSuite`, `validationOptions`.                                                                                                                                                                         |

### Field-Decoration

| Directive               | Selector                   | Purpose                                                                                                                  |
| :---------------------- | :------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `FieldErrorsDirective`  | `[formidableFieldErrors]`  | Instantiates a `FieldErrorsComponent` beside the host control and wires its `ngModel`/`ngModelGroup` from DI. No inputs. |
| `FieldLabelDirective`   | `[formidableFieldLabel]`   | Projects label content. `@Input() isFloating` (`false`).                                                                 |
| `FieldPrefixDirective`  | `[formidableFieldPrefix]`  | Projects prefix content. Exposes `elementRef`.                                                                           |
| `FieldSuffixDirective`  | `[formidableFieldSuffix]`  | Projects suffix content. Exposes `elementRef`.                                                                           |
| `FieldTooltipDirective` | `[formidableFieldTooltip]` | Projects tooltip content. Exposes `elementRef`.                                                                          |

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
| `FieldDecoratorLayout`               | `'single' \| 'group' \| 'inline'`                                                                                |
| `FieldOptionLayout`                  | `'inline' \| 'radio-group' \| 'checkbox-group'`                                                                  |
| `FormidableEmptyHint`                | `'underscores' \| 'format'`                                                                                      |
| `FormidablePanelPosition`            | `'left' \| 'right' \| 'full'`                                                                                    |
| `FormidableToggleFieldLabelPosition` | `'before' \| 'after'`                                                                                            |
| `IFormidableFieldOption`             | `{ value: string; label?; template?; readonly?; disabled?; selected?; highlighted?; select?(); match?(filter) }` |

`FormidableEmptyHint` sets what the date/time fields show while empty **and unfocused** — `_` slots or the `unicodeTokenFormat` itself. A focused empty field always shows `_` slots, because ngx-mask's caret arithmetic only recognizes its own placeholder character.

`DeepPartial<T>` and `DeepRequired<T>` (from `utility-types.ts`) build the form model and frame types.

---

## Catalogue Summary

| Component / Directive         | Selector                                             | Kind       | Value `T`         |
| :---------------------------- | :--------------------------------------------------- | :--------- | :---------------- |
| `InputFieldComponent`         | `formidable-input-field`                             | Field      | `string \| null`  |
| `TextareaFieldComponent`      | `formidable-textarea-field`                          | Field      | `string \| null`  |
| `SelectFieldComponent`        | `formidable-select-field`                            | Field      | `string \| null`  |
| `DropdownFieldComponent`      | `formidable-dropdown-field`                          | Field      | `string \| null`  |
| `AutocompleteFieldComponent`  | `formidable-autocomplete-field`                      | Field      | `string \| null`  |
| `DateFieldComponent`          | `formidable-date-field`                              | Field      | `Date \| null`    |
| `TimeFieldComponent`          | `formidable-time-field`                              | Field      | `Date \| null`    |
| `ToggleFieldComponent`        | `formidable-toggle-field`                            | Field      | `boolean \| null` |
| `SliderFieldComponent`        | `formidable-slider-field`                            | Field      | `number \| null`  |
| `RadioGroupFieldComponent`    | `formidable-radio-group-field`                       | Field      | `string \| null`  |
| `CheckboxGroupFieldComponent` | `formidable-checkbox-group-field`                    | Field      | `string[]`        |
| `FieldDecoratorComponent`     | `formidable-field-decorator`                         | Structural | —                 |
| `FieldOptionComponent`        | `formidable-field-option`                            | Structural | —                 |
| `FieldErrorsComponent`        | `formidable-field-errors`                            | Structural | —                 |
| `IconComponent`               | `formidable-icon`                                    | Structural | —                 |
| `FormDirective`               | `form[formidableForm]`                               | Directive  | —                 |
| `FormModelDirective`          | `[ngModel]`                                          | Directive  | —                 |
| `FormModelGroupDirective`     | `[ngModelGroup]`                                     | Directive  | —                 |
| `FormRootValidateDirective`   | `form[formidableRootValidate][formValue][formSuite]` | Directive  | —                 |
| `FieldErrorsDirective`        | `[formidableFieldErrors]`                            | Directive  | —                 |
| `FieldLabelDirective`         | `[formidableFieldLabel]`                             | Directive  | —                 |
| `FieldPrefixDirective`        | `[formidableFieldPrefix]`                            | Directive  | —                 |
| `FieldSuffixDirective`        | `[formidableFieldSuffix]`                            | Directive  | —                 |
| `FieldTooltipDirective`       | `[formidableFieldTooltip]`                           | Directive  | —                 |
