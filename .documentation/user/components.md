# Components

Every public component, directive, token and type, and what each accepts. How the fields behave is taught in the guides linked from each entry.

- **Standalone And `OnPush`**: every component, with no exception.
- **Signal Inputs And Outputs**: every input is a signal `input()` and every output an `output()`. A template binds them as usual (`[readonly]="…"`, `(touch)="…"`), so the tables list the value a binding takes.
- **Shared Inputs Are Listed Once**: a field's entry lists only its own inputs, and names the shared groups it takes.

| From Code           | How                                                                                                      |
| :------------------ | :------------------------------------------------------------------------------------------------------- |
| Read an input       | Call it: `field.readonly()`                                                                              |
| Write an input      | `componentRef.setInput('readonly', true)`. `value` is a `model()`, so `field.value.set(…)` works as well |
| Listen to an output | `output.subscribe(callback)`, or `outputToObservable(output)` from `@angular/core/rxjs-interop` for RxJS |

---

## At A Glance

| Field                                         | Selector                          | Value            | Use When                                          |
| :-------------------------------------------- | :-------------------------------- | :--------------- | :------------------------------------------------ |
| [`InputField`](#input-field)                  | `formidable-input-field`          | `string`         | One line of text, optionally masked               |
| [`TextareaField`](#textarea-field)            | `formidable-textarea-field`       | `string`         | Free text over several lines                      |
| [`SelectField`](#select-field)                | `formidable-select-field`         | `string \| null` | One choice from the platform's own picker         |
| [`DropdownField`](#dropdown-field)            | `formidable-dropdown-field`       | `string \| null` | One choice from a styled panel                    |
| [`AutocompleteField`](#autocomplete-field)    | `formidable-autocomplete-field`   | `string \| null` | One choice from a long or fetched list, by typing |
| [`DateField`](#date-field)                    | `formidable-date-field`           | `Date \| null`   | A date, typed or picked from a calendar           |
| [`TimeField`](#time-field)                    | `formidable-time-field`           | `Date \| null`   | A time of day                                     |
| [`ToggleField`](#toggle-field)                | `formidable-toggle-field`         | `boolean`        | On or off                                         |
| [`SliderField`](#slider-field)                | `formidable-slider-field`         | `number`         | A number within a range                           |
| [`RadioGroupField`](#radio-group-field)       | `formidable-radio-group-field`    | `string \| null` | One choice, with every option visible             |
| [`CheckboxGroupField`](#checkbox-group-field) | `formidable-checkbox-group-field` | `string[]`       | Several choices, with every option visible        |

| Component Or Directive               | Selector                          | Purpose                                                   |
| :----------------------------------- | :-------------------------------- | :-------------------------------------------------------- |
| [`FieldDecorator`](#field-decorator) | `formidable-field-decorator`      | Wraps a field with its label, adornments, hints, messages |
| [`FieldOption`](#field-option)       | `formidable-field-option`         | One option, projected into an option field                |
| [`FieldErrors`](#field-errors)       | `formidable-field-errors`         | Renders a list of errors as messages                      |
| [`FieldLabel`](#directives)          | `[formidableFieldLabel]`          | The field's label                                         |
| [`FieldLabelAdornment`](#directives) | `[formidableFieldLabelAdornment]` | Content beside the label                                  |
| [`FieldPrefix`](#directives)         | `[formidableFieldPrefix]`         | Content at the field's leading edge                       |
| [`FieldSuffix`](#directives)         | `[formidableFieldSuffix]`         | Content at the field's trailing edge                      |
| [`FieldHint`](#directives)           | `[formidableFieldHint]`           | Support text below the field                              |
| [`FieldToggleIcon`](#directives)     | `[formidableFieldToggleIcon]`     | Replaces the date field's panel toggle icon               |

---

## Setup

| Symbol                          | Kind      | Purpose                                                                                                               |
| :------------------------------ | :-------- | :-------------------------------------------------------------------------------------------------------------------- |
| `provideNgxFormidable(config?)` | function  | Registers ngx-mask and the library's tokens. Goes in the `app.config.ts` providers, or an NgModule's root `providers` |
| `NgxFormidableConfig`           | interface | Its argument: `{ globalMaskConfig?: Partial<NgxMaskConfig>; defaults?: FormidableDefaults }`                          |
| `FormidableDefaults`            | interface | `labelPosition`, `prefixAlign`, `suffixAlign`, `panelPosition`, `revealOn`, `hideRequiredMarkers`, all optional       |

`globalMaskConfig` lands on `FORMIDABLE_MASK_DEFAULTS` and `defaults` on `FORMIDABLE_DEFAULTS`. What each default sets, and how a component scopes them, is in [Getting Started](getting-started.md). So is the stylesheet import.

---

## Shared Field Inputs

Every field extends `BaseField` and is Angular's `FormValueControl`: `[formField]`, `[formControl]`, `formControlName` and `ngModel` all bind it through `value`, with no value accessor.

| Input         | Type                         | Default     | Description                                                                           |
| :------------ | :--------------------------- | :---------- | :------------------------------------------------------------------------------------ |
| `value`       | The field's value type       | Per field   | The model, bound two-way by the forms API. The field writes it only for a user's edit |
| `name`        | `string`                     | `''`        | The native `name` of the field's control                                              |
| `placeholder` | `string`                     | `''`        | Placeholder text                                                                      |
| `readonly`    | `boolean`                    | `false`     | Blocks edits and leaves the tab order. A click or `focus()` still focuses it          |
| `disabled`    | `boolean`                    | `false`     | Blocks edits, leaves the tab order and ignores `focus()`                              |
| `required`    | `boolean`                    | `false`     | Marks the label and sets `aria-required`. Validates nothing                           |
| `autoFocus`   | `boolean`                    | `false`     | Focuses the field once its view is ready. Opens no panel                              |
| `revealOn`    | `FormidableReveal`           | `undefined` | When the messages appear. Unset: `FORMIDABLE_DEFAULTS.revealOn`, then `'touched'`     |
| `errors`      | `readonly ValidationError[]` | `[]`        | The errors the forms API holds                                                        |
| `invalid`     | `boolean`                    | `false`     | Whether the forms API holds the field invalid                                         |
| `pending`     | `boolean`                    | `false`     | Whether a validator is still running                                                  |
| `touched`     | `boolean`                    | `false`     | Whether the user has left the field                                                   |
| `dirty`       | `boolean`                    | `false`     | Whether the user has edited the field                                                 |

The forms API writes these state inputs from what it holds. Which API writes which is **Compatibility By Feature** in [Forms](forms.md): bind one by hand only where the API does not, and never beside `[formField]`.

| Output        | Emits  | When                               |
| :------------ | :----- | :--------------------------------- |
| `valueChange` | `T`    | A user's edit, and never otherwise |
| `touch`       | `void` | As the last act of a blur          |

| Member            | Kind   | Description                                                                              |
| :---------------- | :----- | :--------------------------------------------------------------------------------------- |
| `focus(options?)` | method | Focuses the field, taking `FocusOptions`. Opens no panel. Does nothing while `disabled`  |
| `fieldId`         | getter | Unique per instance. Every id around and inside the field derives from it                |
| `isFieldFocused`  | signal | Whether focus is inside the field                                                        |
| `showErrors`      | signal | Whether the field is invalid and its reveal has come. Drives `aria-invalid`              |
| `shownErrors`     | signal | The errors the decorator renders: none until `showErrors`, the last ones while `pending` |
| `canLabelRest`    | signal | Whether nothing occupies the value area, so a label may rest there                       |

Focus and the caret are in [Fields](fields.md), the reveal in [Validation](validation.md), and how the model flows in [Forms](forms.md).

### Option Inputs

Taken by `select-field`, `dropdown-field`, `autocomplete-field`, `radio-group-field` and `checkbox-group-field`. Options come from `options`, from projected [`formidable-field-option`](#field-option) children, or from both, merged.

| Input               | Type                     | Default           | Description                                                           |
| :------------------ | :----------------------- | :---------------- | :-------------------------------------------------------------------- |
| `options`           | `FormidableOption[]`     | `[]`              | The options, as data                                                  |
| `defaultOption`     | `FormidableOption`       | `undefined`       | One option pinned to the top, exempt from `sortFn` and from filtering |
| `defaultOptionMode` | `FieldDefaultOptionMode` | `'always'`        | `'always'`, or `'fallback'`: only while the list would be empty       |
| `sortFn`            | `(a, b) => number`       | `undefined`       | Orders the merged list                                                |
| `noOptionsText`     | `string`                 | `NO_OPTIONS_TEXT` | What an empty list shows. Nothing there can be picked                 |

`selectOption(option)` commits an option as a click on it does, and does nothing for a readonly or disabled option or field. On `select-field` it does nothing at all: the native `<select>` picks. How options are supplied is in **Options** in [Fields](fields.md).

### Text Inputs

Taken by `input-field` and `textarea-field`, whose `value` is the text, unmasked.

| Input          | Type                     | Default     | Description                                                               |
| :------------- | :----------------------- | :---------- | :------------------------------------------------------------------------ |
| `autocomplete` | `AutoFill`               | `'off'`     | The native autofill hint                                                  |
| `minLength`    | `number`                 | `undefined` | The native `minlength`. Validates nothing                                 |
| `maxLength`    | `number`                 | `undefined` | The native `maxlength`, which caps what can be typed. Validates nothing   |
| `mask`         | `string`                 | `undefined` | An ngx-mask pattern                                                       |
| `maskConfig`   | `Partial<NgxMaskConfig>` | `undefined` | Per-field ngx-mask options, over `globalMaskConfig` and the library's own |

A mask whose length cannot satisfy `minLength` or `maxLength` logs a console error, and a `placeHolderCharacter` the mask can also draw as content logs a warning. Masking is in **Masking** in [Fields](fields.md).

### Date And Time Inputs

Taken by `date-field` and `time-field`.

| Input                | Type                  | Default                        | Description                                                        |
| :------------------- | :-------------------- | :----------------------------- | :----------------------------------------------------------------- |
| `unicodeTokenFormat` | `string`              | `'yyyy-MM-dd'`, time `'HH.mm'` | The date-fns token string the field masks, parses and formats with |
| `emptyHint`          | `FormidableEmptyHint` | `'underscores'`                | What an empty, unfocused field shows                               |

A date format takes the fixed-width tokens `yy`, `yyyy`, `MM`, `MMM` and `dd`, a time format `HH`, `hh`, `mm`, `ss`, `a` and `aa`, with any separators or none, such as `dd.MM.yyyy` or `yyyyMMdd`. The mask has one slot per character, so a variable-width token such as `d` or `MMMM`, quoted text, and a format with no token at all log a warning and fall back to the default. So does `a` or `aa` right before a dot, which date-fns reads as part of the AM/PM. Committing, parse errors and the arrow keys are in **Dates And Times** in [Fields](fields.md).

### Panel Inputs

Taken by `dropdown-field`, `autocomplete-field` and `date-field`.

| Member                | Kind   | Type                      | Default                  | Description                                                       |
| :-------------------- | :----- | :------------------------ | :----------------------- | :---------------------------------------------------------------- |
| `panelPosition`       | input  | `FormidablePanelPosition` | `'full'`, date `'right'` | Where the panel opens. Unset: `FORMIDABLE_DEFAULTS.panelPosition` |
| `isPanelOpen`         | signal | `boolean`                 | `false`                  | Whether the panel is open                                         |
| `togglePanel(isOpen)` | method |                           |                          | Opens or closes the panel                                         |

There is no `isPanelOpen` input: the field closes its panel by itself, on a pick, an outside click or `Escape`. Reach `togglePanel` through a template reference or a `viewChild()`, as `focus()` is reached. Placement is in **Panels** in [Fields](fields.md).

---

## Field Components

### Input Field

`formidable-input-field` · Value `string` · Shared and [Text Inputs](#text-inputs)

No inputs of its own.

### Textarea Field

`formidable-textarea-field` · Value `string` · Shared and [Text Inputs](#text-inputs)

| Input                 | Type      | Default | Description                                             |
| :-------------------- | :-------- | :------ | :------------------------------------------------------ |
| `enableAutosize`      | `boolean` | `true`  | Grows the box with its content instead of scrolling     |
| `showLengthIndicator` | `boolean` | `false` | Shows the character count, against `maxLength` when set |

### Select Field

`formidable-select-field` · Value `string | null` · Shared and [Option Inputs](#option-inputs)

No inputs of its own. A native `<select>`: a value no option carries, `null` included, shows the `placeholder` or nothing, never the first option. With no options, `noOptionsText` renders as a disabled `<option>`.

### Dropdown Field

`formidable-dropdown-field` · Value `string | null` · Shared, [Option Inputs](#option-inputs) and [Panel Inputs](#panel-inputs)

| Input              | Type                     | Default     | Description                                                                        |
| :----------------- | :----------------------- | :---------- | :--------------------------------------------------------------------------------- |
| `actionOption`     | `FormidableActionOption` | `undefined` | An entry at the end of the list that runs its `action` instead of becoming a value |
| `actionOptionMode` | `FieldDefaultOptionMode` | `'always'`  | `'always'`, or `'fallback'`: only while the list would be empty                    |

Typing highlights the first option whose label starts with what was typed, see **Type-Ahead** in [Fields](fields.md). The action entry is **An Action Row Is Not A Value** there.

### Autocomplete Field

`formidable-autocomplete-field` · Value `string | null` · Shared, [Option Inputs](#option-inputs) and [Panel Inputs](#panel-inputs)

| Input              | Type                     | Default     | Description                                                                        |
| :----------------- | :----------------------- | :---------- | :--------------------------------------------------------------------------------- |
| `actionOption`     | `FormidableActionOption` | `undefined` | An entry at the end of the list that runs its `action` instead of becoming a value |
| `actionOptionMode` | `FieldDefaultOptionMode` | `'always'`  | `'always'`, or `'fallback'`: only while the list would be empty                    |

| Output         | Emits    | When                                                          |
| :------------- | :------- | :------------------------------------------------------------ |
| `filterChange` | `string` | The user types, or the field moves its filter while unfocused |

Typing filters the list by each option's `match`, by default a case-insensitive substring of its label. Only an option can be committed: free text is not a value. The default option and the action entry are applied after filtering, so both stay visible when nothing matches. What `filterChange` reports is in **Options** in [Fields](fields.md).

### Date Field

`formidable-date-field` · Value `Date | null` · Shared, [Date And Time Inputs](#date-and-time-inputs) and [Panel Inputs](#panel-inputs)

The calendar is Pikaday. These inputs are passed to it under the same names, and each is applied again when it changes:

| Input                                        | Type                      | Default                            | Description                                                                    |
| :------------------------------------------- | :------------------------ | :--------------------------------- | :----------------------------------------------------------------------------- |
| `minDate`                                    | `Date`                    | `undefined`                        | Earliest selectable date. An arrow step past it is refused                     |
| `maxDate`                                    | `Date`                    | `undefined`                        | Latest selectable date. An arrow step past it is refused                       |
| `defaultDate`                                | `Date`                    | Today, within `minDate`, `maxDate` | Where the calendar opens and an arrow key steps from while empty               |
| `setDefaultDate`                             | `boolean`                 | `true`                             | Pikaday's `setDefaultDate`                                                     |
| `firstDay`                                   | `number`                  | `1`                                | First day of the week, `0` for Sunday                                          |
| `disableWeekends`                            | `boolean`                 | `false`                            | Makes Saturdays and Sundays unselectable                                       |
| `disableDayFn`                               | `(date: Date) => boolean` | `undefined`                        | Returns `true` for a date that cannot be selected                              |
| `yearRange`                                  | `number \| number[]`      | `2`                                | Years either side of the current one, or a `[from, to]` pair                   |
| `i18n`                                       | `PikadayI18nConfig`       | English                            | Month and weekday names and navigation labels, replaced whole                  |
| `yearSuffix`                                 | `string`                  | `''`                               | Appended to the year in the calendar's header                                  |
| `showMonthAfterYear`                         | `boolean`                 | `false`                            | Puts the year before the month in the header                                   |
| `showDaysInNextAndPreviousMonths`            | `boolean`                 | `true`                             | Fills the grid's leading and trailing cells with the neighbouring months' days |
| `enableSelectionDaysInNextAndPreviousMonths` | `boolean`                 | `true`                             | Makes those days selectable                                                    |
| `numberOfMonths`                             | `number`                  | `1`                                | How many months show side by side                                              |
| `ariaLabel`                                  | `string`                  | Pikaday's own                      | Pikaday's `ariaLabel` for the calendar                                         |

`selectDate(date)` commits a date as a pick does. Project `[formidableFieldToggleIcon]` content to replace the toggle's default arrow, see **The Toggle Icon** in [Fields](fields.md).

### Time Field

`formidable-time-field` · Value `Date | null` · Shared and [Date And Time Inputs](#date-and-time-inputs)

No inputs of its own. The value's date part is 1970-01-01. `selectTime(time)` commits a time as an arrow step does.

### Toggle Field

`formidable-toggle-field` · Value `boolean` · Shared

| Input           | Type                                 | Default     | Description                                                      |
| :-------------- | :----------------------------------- | :---------- | :--------------------------------------------------------------- |
| `labelPosition` | `FormidableToggleFieldLabelPosition` | `'before'`  | Which side of the switch `onLabel` and `offLabel` sit            |
| `onLabel`       | `string`                             | `undefined` | Text beside the switch while on                                  |
| `offLabel`      | `string`                             | `undefined` | Text beside the switch while off. Unset, `onLabel` shows in both |

A click, `Space` or `Enter` flips it, and so does `toggle()`. It binds through `value` like every other field, not as a `FormCheckboxControl`.

### Slider Field

`formidable-slider-field` · Value `number` · Shared

| Input                        | Type                    | Default     | Description                                                    |
| :--------------------------- | :---------------------- | :---------- | :------------------------------------------------------------- |
| `min`                        | `number`                | `0`         | Lower bound. `[formField]` writes it from a `min()` rule       |
| `max`                        | `number`                | `100`       | Upper bound. `[formField]` writes it from a `max()` rule       |
| `step`                       | `number`                | `1`         | The grid a drag snaps to, laid from `min`                      |
| `showThumbLabel`             | `boolean`               | `true`      | Shows the value in a bubble above the thumb                    |
| `showTickMarks`              | `boolean`               | `false`     | Draws a mark at every `tickInterval`                           |
| `tickInterval`               | `number`                | `undefined` | Spacing between tick marks. Unset, `step`                      |
| `showTickLabels`             | `boolean`               | `false`     | Labels each tick mark. Needs `showTickMarks`                   |
| `showMinMaxLabels`           | `boolean`               | `false`     | Shows `minLabel` and `maxLabel` at the ends of the track       |
| `minLabel`                   | `string`                | `undefined` | Text for the low end. Unset, `min`                             |
| `maxLabel`                   | `string`                | `undefined` | Text for the high end. Unset, `max`                            |
| `transformValueToThumbLabel` | `(v: number) => string` | `undefined` | Renders the value as text, which also becomes `aria-valuetext` |
| `transformTickToTickLabel`   | `(v: number) => string` | `undefined` | Renders a tick's value as text                                 |

`selectValue(value)` commits a value clamped and snapped as a drag would be.

### Radio Group Field

`formidable-radio-group-field` · Value `string | null` · Shared and [Option Inputs](#option-inputs)

No inputs of its own. With no options, `noOptionsText` renders as plain text.

### Checkbox Group Field

`formidable-checkbox-group-field` · Value `string[]` · Shared and [Option Inputs](#option-inputs)

No inputs of its own. The value holds the picked options' values in the order they were picked. With no options, `noOptionsText` renders as plain text.

---

## Structural Components

### Field Decorator

`formidable-field-decorator` · No inputs

Wraps one projected field, which it finds through `FORMIDABLE_FIELD`, and renders the [decoration directives](#directives), the required marker and the field's messages around it. Each field picks its own layout. Slots, layouts and labels are in [Decoration](decoration.md).

Its host carries the field's state as classes: `is-readonly`, `is-disabled`, `is-focused`, `is-invalid`, `label-resting`, `label-inside`, `has-in-field-toggle`, `has-open-panel` and `has-open-sheet`. A field used without a decorator carries `is-undecorated`, `has-open-panel` and `has-open-sheet` on its own host.

### Field Option

`formidable-field-option`

| Input         | Type                  | Default                            | Description                                                             |
| :------------ | :-------------------- | :--------------------------------- | :---------------------------------------------------------------------- |
| `value`       | `string`, required    |                                    | What reaches the model when the option is picked                        |
| `label`       | `string`              | The projected content's text       | Display text                                                            |
| `readonly`    | `boolean`             | `false`                            | Cannot be picked and is skipped by the keyboard, but reads as available |
| `disabled`    | `boolean`             | `false`                            | Cannot be picked and is skipped by the keyboard                         |
| `match`       | `(filter) => boolean` | Case-insensitive `label` substring | Whether the autocomplete's filter text matches the option               |
| `layout`      | `FieldOptionLayout`   | `'inline'`                         | How the option paints itself. The ARIA role follows the parent field    |
| `selected`    | `boolean`             | `false`                            | Set by the field. Do not bind it                                        |
| `highlighted` | `boolean`             | `false`                            | Set by the field. Do not bind it                                        |
| `content`     | `TemplateRef`         | `undefined`                        | Set by the field. Do not bind it                                        |

Content projected into the option becomes what the option renders. It must be **written inside** its field's element: anywhere inside, including a `@for` or a wrapper element, but not in a template declared elsewhere. Outside an option field it throws. `option` is the plain `FormidableOption` it hands the field, and `template` its projected content, or `undefined`.

### Field Errors

`formidable-field-errors`

| Input    | Type                         | Default | Description                                    |
| :------- | :--------------------------- | :------ | :--------------------------------------------- |
| `errors` | `readonly ValidationError[]` | `[]`    | The errors to render; `undefined` renders none |

Renders each error as a message through `FORMIDABLE_ERROR_MESSAGE`, in an `aria-live="polite"` region, and decides nothing about when. Every decorator renders one for its field. Place one by hand for a group's or the form's errors, see **Messages** in [Validation](validation.md).

---

## Directives

Projected into a [`formidable-field-decorator`](#field-decorator), beside the field.

| Directive             | Selector                          | Input      | Type                      | Default                                              |
| :-------------------- | :-------------------------------- | :--------- | :------------------------ | :--------------------------------------------------- |
| `FieldLabel`          | `[formidableFieldLabel]`          | `position` | `FieldLabelPosition`      | `FORMIDABLE_DEFAULTS.labelPosition`, then `'inside'` |
| `FieldLabelAdornment` | `[formidableFieldLabelAdornment]` |            |                           |                                                      |
| `FieldPrefix`         | `[formidableFieldPrefix]`         | `align`    | `FieldAdornmentAlignment` | `FORMIDABLE_DEFAULTS.prefixAlign`, then `'center'`   |
| `FieldSuffix`         | `[formidableFieldSuffix]`         | `align`    | `FieldAdornmentAlignment` | `FORMIDABLE_DEFAULTS.suffixAlign`, then `'center'`   |
| `FieldHint`           | `[formidableFieldHint]`           | `align`    | `FieldHintAlignment`      | `'start'`                                            |
| `FieldToggleIcon`     | `[formidableFieldToggleIcon]`     |            |                           |                                                      |

`FieldToggleIcon` is projected into the `date-field` itself, not into the decorator. What each slot does is in [Decoration](decoration.md).

---

## Accessibility

| Field                                  | Element Carrying The State       | Beyond `aria-required`, `aria-invalid` and `aria-describedby`                                                                                          |
| :------------------------------------- | :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input-field`, `textarea-field`        | The `input` or `textarea`        | Nothing                                                                                                                                                |
| `select-field`                         | The `select`                     | `aria-readonly`                                                                                                                                        |
| `dropdown-field`, `autocomplete-field` | The inner `input[role=combobox]` | `aria-readonly`, `aria-expanded`, `aria-controls`, `aria-activedescendant`. The autocomplete adds `aria-autocomplete="list"`. The panel is a `listbox` |
| `date-field`                           | The inner `input[role=combobox]` | `aria-readonly`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`. The panel is a `dialog`, named by the label                               |
| `time-field`                           | The inner `input`                | `aria-readonly`                                                                                                                                        |
| `slider-field`                         | The `input[type=range]`          | `aria-labelledby`, `aria-readonly`, and `aria-valuetext` once `transformValueToThumbLabel` is set                                                      |
| `toggle-field`                         | The `div[role=switch]`           | `aria-labelledby`, `aria-checked`, `aria-readonly`, `aria-disabled`                                                                                    |
| `radio-group-field`                    | The `div[role=radiogroup]`       | `aria-labelledby`, `aria-readonly`, `aria-disabled`, `aria-activedescendant`                                                                           |
| `checkbox-group-field`                 | The `div[role=group]`            | `aria-labelledby`, `aria-readonly`, `aria-disabled`, `aria-activedescendant`                                                                           |

- **Ids**: the decorator names its label `{fieldId}-label`, its hint row `{fieldId}-hint` and its messages `{fieldId}-errors`. A field names its panel `{fieldId}-panel` and each option `{fieldId}-option-{index}`.
- **Without A Decorator**: a field emits no `aria-labelledby` and no `aria-describedby`, rather than pointing at ids that do not exist.
- **Options**: an option's role follows its field: `option` in a listbox, reporting `aria-selected`, and `radio` or `checkbox` in a group, reporting `aria-checked`. A readonly or disabled option carries `aria-disabled`.
- **Messages**: `formidable-field-errors` is an `aria-live="polite"` region, so a message appearing while the field is focused is announced.

---

## Tokens And Constants

| Token Or Constant          | Purpose                                                                                             |
| :------------------------- | :-------------------------------------------------------------------------------------------------- |
| `FORMIDABLE_FIELD`         | Identifies a field to its decorator. A custom field provides it                                     |
| `FORMIDABLE_OPTION_FIELD`  | Identifies a field that hosts options. A custom option field provides it                            |
| `FORMIDABLE_OPTION`        | Identifies an option to its field. A custom option provides it                                      |
| `FORMIDABLE_MASK_DEFAULTS` | App-wide ngx-mask options, set by `provideNgxFormidable`                                            |
| `FORMIDABLE_DEFAULTS`      | App-wide `FormidableDefaults`, set by `provideNgxFormidable` or scoped by a component's `providers` |
| `FORMIDABLE_ERROR_MESSAGE` | Turns an error into its message text. Default: its `message`, else its `kind`                       |
| `NO_OPTIONS_TEXT`          | The default `noOptionsText`: `'No options available.'`                                              |

---

## Types

| Type                                 | Definition                                                                                          |
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
| `FormidableErrorMessageFn`           | `(error: ValidationError) => string`                                                                |

| Interface                | Implemented By               | Members                                                                                                                         |
| :----------------------- | :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `FormidableOption<T>`    | Plain data                   | `value`, and optional `label`, `template`, `readonly`, `disabled`, `match(filter)`. `label` falls back to `value`               |
| `FormidableActionOption` | Plain data                   | A `FormidableOption` plus a required `action(): void`                                                                           |
| `FormidableField<T>`     | Every field                  | What the decorator reads off a field: `fieldRef`, `fieldId`, `value`, its state, `showErrors`, `shownErrors`, `decoratorLayout` |
| `FormidableOptionField`  | The five option fields       | `options`, `defaultOption`, `defaultOptionMode`, `sortFn`, `selectOption`, and an optional `optionRole`                         |
| `FormidableOptionSource` | `FieldOption`                | `option`: the plain option a component hands the field that owns it                                                             |
| `FormidablePanelField`   | Dropdown, autocomplete, date | `panelRef`, `isPanelOpen`, `togglePanel`, `panelPosition`                                                                       |

Every input member of an interface is typed as the `Signal` the component declares. `FormidableOption` is the exception, because a consumer writes it by hand.

---

## Extension Points

Five exported abstract `@Directive()`s, with no selector, sit behind the fields. Writing a field on `BaseField` is [Custom Fields](custom-fields.md).

| Class                    | Extends                   | Behind                                                                              | Adds                                                |
| :----------------------- | :------------------------ | :---------------------------------------------------------------------------------- | :-------------------------------------------------- |
| `BaseField<T>`           |                           | Every field                                                                         | [Shared Field Inputs](#shared-field-inputs)         |
| `BaseTextField`          | `BaseField<string>`       | `input-field`, `textarea-field`                                                     | [Text Inputs](#text-inputs)                         |
| `BaseDateTimeField`      | `BaseField<Date \| null>` | `date-field`, `time-field`                                                          | [Date And Time Inputs](#date-and-time-inputs)       |
| `BaseOptionListField<T>` | `BaseField<T>`            | `select-field`, and every `BaseOptionField`                                         | [Option Inputs](#option-inputs), `optionComponents` |
| `BaseOptionField<T>`     | `BaseOptionListField<T>`  | `dropdown-field`, `autocomplete-field`, `radio-group-field`, `checkbox-group-field` | A highlight, and the keys that move it              |

`optionComponents` is the public `contentChildren()` query of the projected options, as `FormidableOptionSource`, with `descendants: true`.

### An Option Field

Extend `BaseOptionListField`, or `BaseOptionField` to walk the list with a highlight, provide `FORMIDABLE_OPTION_FIELD`, and set `optionRole`. The protected members:

| Member                                    | On        | Role                                                                                                            |
| :---------------------------------------- | :-------- | :-------------------------------------------------------------------------------------------------------------- |
| `onOptionsChanged()`                      | List      | Supply it. Runs whenever an option input or a projected option changes                                          |
| `computeAllOptions()`                     | List      | The bound and projected options, merged and sorted, with `defaultOption` not yet pinned                         |
| `activeOptions`                           | Highlight | Supply it: a signal holding the rendered list the highlight walks                                               |
| `selectOption(option)`                    | Highlight | Supply it: commit the option                                                                                    |
| `selectedOptionValue`                     | Highlight | Override it in a single-choice field, so the selection takes the highlight. `null` by default                   |
| `navigateOptions(event)`                  | Highlight | A `keyboardCallback` for a group: the arrows walk the list, `Enter` and `Space` pick                            |
| `navigatePanelOptions(event, panel)`      | Highlight | A `keyboardCallback` for a panel field: `ArrowDown` opens, `Escape` and `Tab` close, the arrows walk while open |
| `highlightedOptionIndex`                  | Highlight | The highlighted index, `-1` for none                                                                            |
| `setHighlightedIndex(index)`              | Highlight | Moves the highlight                                                                                             |
| `highlightSelectedOption()`               | Highlight | Moves the highlight onto the selection                                                                          |
| `reconcileHighlightAfterOptionsChanged()` | Highlight | After the list changes: the selection, else the highlighted value, else the nearest index that can be picked    |
| `optionId(index)`                         | Highlight | `{fieldId}-option-{index}`, or `null` for a negative index                                                      |
| `optionRefs`                              | Highlight | `viewChildren()` of the rendered `#optionRef` options, which the highlight scrolls into view                    |

### A Panel Field

Implement `FormidablePanelField` and wire the protected members below. The base then keeps focus in the field while the panel is used, closes the panel on a click outside the field, and places it on open and on every scroll or resize while it is open.

| Member                          | Wire It                                                    |
| :------------------------------ | :--------------------------------------------------------- |
| `panel`                         | Override the getter to return the field                    |
| `onPanelToggleMouseDown(event)` | Bind to the toggle's `mousedown`                           |
| `onPanelMouseDown(event)`       | Bind to the panel's `mousedown`                            |
| `onPanelToggle(isOpen)`         | Call from `togglePanel`                                    |
| `panelId`                       | Bind as the panel's `id` and the control's `aria-controls` |

---

## Related

- [Getting Started](getting-started.md): install, wiring, the stylesheet, a first form
- [Forms](forms.md): how the fields meet Signal Forms, reactive forms and template-driven forms
- [Fields](fields.md): options, panels, keyboard, dates and times, masking, focus
- [Decoration](decoration.md): labels, adornments, prefixes, suffixes, hints, required marker
- [Validation](validation.md): Angular's rules, Vest, Zod or none; messages and their reveal
- [Custom Fields](custom-fields.md): building a field or an option of your own
