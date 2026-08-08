<h1 align="center">ngx-formidable</h1>

<p align="center">
A powerful Angular component library for building rich, validated forms.
</p>

<p align="center">
  Created with ❤️ by <a href="https://github.com/Cynthion">Cynthion</a>
</p>

<p align="center">
  <!-- TODO -->
  <!-- <a href="https://github.com/JsDaddy/ngx-mask/actions/workflows/quality-check.yml">
    <img src="https://github.com/JsDaddy/ngx-mask/actions/workflows/quality-check.yml/badge.svg?branch=develop" alt="CI">
  </a>
  <a href="https://www.npmjs.com/package/ngx-mask">
    <img src="https://img.shields.io/npm/v/ngx-mask.svg" alt="npm version">
  </a>
  <a href="https://npmjs.org/ngx-mask">
    <img src="https://img.shields.io/npm/dt/ngx-mask.svg" alt="npm downloads">
  </a>
  <a href="https://www.npmjs.com/package/ngx-mask">
    <img src="https://img.shields.io/npm/dm/ngx-mask.svg" alt="npm monthly downloads">
  </a>
  <a href="https://github.com/JSDaddy/ngx-mask">
    <img src="https://img.shields.io/github/stars/JSDaddy/ngx-mask.svg?label=GitHub%20Stars&style=flat" alt="GitHub Stars">
  </a> -->
</p>

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Directives](#core-directives)
- [Field Decorator](#field-decorator)
- [Field Components](#field-components)
- [Theming & Styles](#theming--styles)
- [Root-Level / Cross-Field Validation](#root-level--cross-field-validation)
- [Error Message Translation (i18n)](#error-message-translation-i18n)
- [Keyboard Navigation](#keyboard-navigation)
- [Masking](#masking)
- [Extending with Custom Components / Options](#extending-with-custom-components--options)
- [Contributing](#contributing)
- [License](#license)

## Features

`ngx-fromidable` is a comprehensive Angular component and directive library designed to simplify the creation of rich, validated forms. It provides a wide range of features that enhance form development:

<table>
<tr>
<td width="33%" valign="top">

### <h5><a href="#zero-boilerplate">🚀 Zero Boilerplate</a></h5>

• Simple directives to define form behavior
• Automatically wire model, frame, and validation
• Streams for value, validity, dirty state, and errors

</td>
<td width="33%" valign="top">

### <h5><a href="#root-level--cross-field-validation">✅ Async Validation</a></h5>

• Per-Field or Cross-Field / Root-Level
• Powered by <code>Vest</code>
• Live errors &amp; validity
• Simple <code>formidable-field-errors</code> directive
• Optional i18n via `FORMIDABLE_ERROR_TRANSLATOR`
• Always-visible hints via <code>formidableFieldHint</code>

</td>
<td width="33%" valign="top">

### <h5><a href="#field-components">🧩 Rich Field Components</a></h5>

• Input / Textarea
• Select / Dropdown / Autocomplete
• Radio Groups / Checkboxes
• Date Picker / Time
• Re-usable <code>formidable-field-option</code> for all option fields
• Pinned or fallback <code>defaultOption</code> on every option field

</td>
</tr>

<tr>
<td width="33%" valign="top">

### <h5><a href="#field-decorator">🎀 Field Decorator</a></h5>

• Label / Adornment / Prefix / Suffix
• Floating label transitions
• Forwards <code>valueChanged</code>/<code>focusChanged</code>

</td>
<td width="33%" valign="top">

### <h5><a href="#theming--styles">🎨 Theming &amp; Styling</a></h5>

• Overridable <code>CSS</code> variables
• Overridable <code>Pikaday</code> classes

</td>
<td width="33%" valign="top">

### <h5><a href="#keyboard-navigation">⌨️ Keyboard Navigation</a></h5>

• Simple navigation (<code>Enter</code>/<code>Esc</code>/<code>Tab</code>/<code>Arrows</code>, etc.)
• Type-ahead buffers
• Managed focus &amp; scroll into view

</td>
</tr>

<tr>
<td width="33%" valign="top">

### <h5><a href="#masking">🛡️ Masking</a></h5>

• Powered by <code>ngx-mask</code>
• Per-field opt-in via <code>[mask]</code> and <code>[maskConfig]</code>
• Global app defaults with <code>FORMIDABLE_MASK_DEFAULTS</code>

</td>
<td width="33%" valign="top">

### <h5><a href="#quick-start">🧠 Type Safety (Frame)</a></h5>

• Deep-required <code>Frame</code> concept
• Shows model errors at build time
• Strongly-typed templates/suites

</td>
<td width="33%" valign="top">

### <h5><a href="#extending-with-custom-components--options">🛠️ Extensible</a></h5>

• <code>IFormidableField</code> for custom inputs
• Options: <code>IFormidableOptionField</code> + <code>FORMIDABLE_FIELD_OPTION</code>
• Reuse <code>BaseFieldDirective</code>

</td>
</tr>
</table>

## Demo

Explore and play with live examples on our GitHub Pages:
🌐 https://cynthion.github.io/ngx-formidable/

## Installation

Install the package and its peer dependencies:

```bash
npm install ngx-formidable vest pikaday date-fns ngx-mask
```

## Quick Start

### Standalone Usage

```ts
// main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideNgxFormidable } from 'ngx-formidable';

bootstrapApplication(AppComponent, {
  providers: [...provideNgxFormidable()]
}).catch(console.error);
```

### Module Usage

```ts
// app.module.ts

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';

import { NgxFormidableModule } from 'ngx-formidable';

@NgModule({
  imports: [BrowserModule, NgxFormidableModule.forRoot()],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

---

## Setup Your Form

1. Define your model, form model, frame, and Vest validation suite:

```ts
import { enforce, mode, Modes, only, StaticSuite, staticSuite, test } from 'vest';
import { DeepPartial, DeepRequired } from 'ngx-formidable';

export interface User {
  name: string;
  hobby: 'reading' | 'gaming' | 'swimming' | 'other';
  birthdate: Date;
}

export type UserFormModel = DeepPartial<User>;
export type UserFormFrame = DeepRequired<UserFormModel>;

export const userFormModel: UserFormModel = {
  // set initial values here, if any
  name: undefined, // e.g., 'Cynthion',
  hobby: undefined, // e.g., 'reading',
  birthdate: undefined // e.g., new Date(1989, 5, 29),
};

export const userFormFrame: UserFormFrame = {
  name: '',
  hobby: 'other',
  birthdate: new Date()
};

export const userFormValidationSuite = staticSuite((model: UserFormModel, field?: string) => {
  mode(Modes.ALL); // or use Modes.EAGER to just use first
  if (field) only(field);

  test('name', 'First name is required.', () => {
    enforce(model.name).isNotBlank();
  });

  test('name', 'First name does not start with A.', () => {
    enforce(model.name?.toLowerCase()).startsWith('a');
  });

  // further Vest validators
});
```

2. Setup your form template:

```html
<form
  formidableForm
  [formValue]="userFormModel"
  [formFrame]="userFormFrame"
  [formSuite]="userFormValidationSuite"
  [validationOptions]="{ debounceValidationInMs: 200 }"
  (formValueChange$)="userFormModel = $event"
  (validChange$)="isValid = $event"
  (dirtyChange$)="isDirty = $event"
  (errorsChange$)="errors = $event"
  (ngSubmit)="onSubmit()">
  <formidable-field-decorator>
    <formidable-input-field
      formidableFieldErrors
      name="name"
      ngModel
      placeholder="Name"></formidable-input-field>
    <div formidableFieldLabel>Name</div>
    <div formidableFieldLabelAdornment>?</div>
  </formidable-field-decorator>

  <formidable-field-decorator>
    <formidable-select-field
      placeholder="Select..."
      name="hobby"
      [disabled]="false"
      [readonly]="false"
      [ngModel]="vm.formValue.hobby"
      [options]="hobbyOptions"
      [defaultOption]="{ value: 'none', label: 'None' }">
      <!-- optional inline options, anywhere inside the field -->
      <formidable-field-option [value]="'gardening'">Gardening</formidable-field-option>
    </formidable-select-field>
    <div
      formidableFieldLabel
      [position]="'inside'">
      Hobby
    </div>
  </formidable-field-decorator>

  <formidable-field-decorator>
    <formidable-date-field
      name="birthdate"
      ngModel
      [minDate]="minDate"
      [maxDate]="maxDate"
      [unicodeTokenFormat]="'dd.MM.yyyy'"></formidable-date-field>
    <div formidableFieldLabel>Birthdate</div>
  </formidable-field-decorator>

  <button
    type="submit"
    [disabled]="!isValid">
    Submit
  </button>
</form>
```

---

## Core Directives

### NgxFormidableFormDirective (`formidableForm`)

- Binds your form model, frame, and Vest suite.
- Emits `formValueChange$`, `errorsChange$`, `dirtyChange$`, `validChange$`.

### NgxFormidableFormRootValidateDirective (`formidableRootValidate`)

Adds a root-level async validator for cross-field Vest tests on `ROOT_FORM`.

### FieldErrorsDirective (`formidableFieldErrors`)

Renders a `<formidable-field-errors>` component for any control to display its validation messages. Inside a
`formidable-field-decorator` it renders below the field; used on a bare control it renders next to it.

### FieldHintDirective (`formidableFieldHint`)

Projects always-visible support text into a `formidable-field-decorator`, on a row below the field and above
the errors. `align` (`'start'` by default, or `'center'` / `'end'`) places each hint's text; hints share the
row in equal parts, so a note and a counter sit on one line:

```html
<formidable-field-decorator>
  <formidable-input-field
    formidableFieldErrors
    name="firstName"
    [maxLength]="150"
    [ngModel]="value.firstName" />
  <div formidableFieldHint>Your legal first name</div>
  <div
    formidableFieldHint
    align="end">
    {{ value.firstName?.length ?? 0 }} / 150
  </div>
</formidable-field-decorator>
```

### NgxFormidableFormModelDirective

Hooks into each `ngModel` to run per-field async Vest tests.

### NgxFormidableFormModelGroupDirective

Hooks into `ngModelGroup` to validate nested groups.

## Field Decorator

Wrap any field in a <formidable-field-decorator> to project:

- Label: `<div formidableFieldLabel [position]="'inside'">…</div>`
- Label adornment: `<div formidableFieldLabelAdornment>…</div>` — anything you want beside the label
- Prefix: `<div formidableFieldPrefix [align]="'center'">…</div>` — horizontal and inline fields only
- Suffix: `<div formidableFieldSuffix [align]="'center'">…</div>` — horizontal and inline fields only
- Hint: `<div formidableFieldHint [align]="'end'">…</div>` — support text below the field, all layouts

The decorator adjusts padding and forwards the wrapped field’s properties and events.

Each field picks its own layout, which is what decides where the slots land:

```text
horizontal — input, textarea, select, dropdown, autocomplete, date, time

   Label  Adornment                          the label’s own row
  ┌────────────────────────────────────┐
  │ Prefix     value          Suffix   │     prefix and suffix inset the value
  └────────────────────────────────────┘
   Errors

horizontal, with the label over the field (inside, inside-placeholder, inside-floating, border, border-prefix)

  ┌────────────────────────────────────┐     the label moves into the field, and
  │ Prefix     Label…         Suffix   │     the adornment goes with its row
  └────────────────────────────────────┘
   Errors

vertical — radio-group, checkbox-group, slider

   Label  Adornment
  ┌────────────────────────────────────┐
  │ ▢ Option                           │     no prefix or suffix here
  │ ▢ Option                           │
  └────────────────────────────────────┘
   Errors

inline — toggle

  Label  Adornment    Prefix [-] Suffix
   Errors
```

An adornment decorates the label, so it lives and dies with the label’s row: every position other than
`outside` takes that row away, and the adornment with it.

The label’s `position` chooses where it renders:

| Position             | Behaviour                                                                                                                                                                                       |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outside`            | Static, above the field, in normal document flow. Never moves. The value is centered in the field.                                                                                              |
| `inside` (default)   | Inside the field: centered like a placeholder while the field is visually empty, floating above the value once focused, filled, or masked. A field that sets a `placeholder` floats throughout. |
| `inside-placeholder` | As `inside`, but the label takes the placeholder's place rather than yielding to it: the field's own `placeholder` stays hidden until focus floats the label and reveals it.                    |
| `inside-floating`    | Inside the field, always floating above the value.                                                                                                                                              |
| `border`             | Centered on the field’s top border, which it hides behind itself. The value stays centered, as with `outside`.                                                                                  |
| `border-prefix`      | As `border`, but aligned with a projected prefix instead of with the value.                                                                                                                     |

Every position other than `outside` needs a field with room for a label over it, so they are a no-op for the
toggle, radio-group, checkbox-group and slider fields — their label always renders `outside`. A label rests
only while nothing occupies the value area: a value, visible mask slots, `readonly` or `disabled` all make
it float instead, whichever of the two `inside` positions you choose. They differ only over the
`placeholder` — `inside` lets it win, `inside-placeholder` hides it behind the resting label. A label
rendered over the field stays aligned with the value (a prefix or suffix pushes it in too), stays on one
line, and ellipsizes.

### Required Marker

Set `required` on a field and its label is suffixed with a marker, in every label position:

```html
<formidable-field-decorator>
  <formidable-input-field
    name="firstName"
    [required]="true"
    ngModel />
  <div formidableFieldLabel>First Name</div>
</formidable-field-decorator>
```

The glyph is the `--formidable-label-required-marker` variable, so a theme can swap `'*'` for a word —
`--formidable-label-required-marker: ' (required)'` — without touching markup. It inherits the label's
colour and so follows every field state, and it is never the thing that gets cut off when a label is too
long to fit.

`required` marks the label and nothing else. It does **not** validate: your Vest suite stays the only
validator, so mark the fields your suite enforces and keep the two in step yourself. The library
deliberately sets no native `required` attribute and no Angular validator — either would put a second
error channel next to your suite.

The library ships no icons. Where a field has an icon, project your own into it — the date field's panel toggle
draws a CSS arrow unless you project `<span formidableFieldToggleIcon>…</span>` directly into
`<formidable-date-field>`. The toggle centers it; its size, color and hover feedback are yours.

### Prefix And Suffix Alignment

A prefix and a suffix each pick what they follow vertically with `align`:

| `align`            | Behaviour                                                                    |
| :----------------- | :--------------------------------------------------------------------------- |
| `center` (default) | Centered in the field’s box, wherever the value happens to sit.              |
| `value`            | Follows the value, which an `inside` or `inside-floating` label pushes down. |

The two only differ where a label sits over the value — with an `outside` or `border` label the value is
already centered, so `value` changes nothing. A field that top-aligns its value, like the textarea, always
aligns with it and ignores `align`. The setting is for the horizontal layout; the inline layout is a
centered row.

```html
<formidable-field-decorator>
  <formidable-input-field
    name="amount"
    ngModel />
  <div
    formidableFieldLabel
    [position]="'inside'">
    Amount
  </div>
  <div
    formidableFieldPrefix
    [align]="'value'">
    CHF
  </div>
</formidable-field-decorator>
```

### Action Prefixes And Suffixes

A prefix and a suffix are click-through, so a text adornment over the field’s edge still focuses the field.
A projected `<button>` or `<a>` is the exception — it takes the click, which is all a clear, copy, retry or
loading action needs. The library ships no such components: it is your button, your icon, your label.

Two things every action needs:

- `type="button"` — otherwise it submits the form it sits in.
- `(mousedown)="$event.preventDefault()"` — keeps the focus on the field, and stops a panel field closing
  its panel underneath the click.

The decorator re-measures its slots whenever their width changes, so an action that appears, disappears or
swaps its content re-insets the field on its own. No refresh call exists because none is needed.

**Clear / reset** — the button only exists while there is something to clear:

```html
<div formidableFieldSuffix>
  <button
    *ngIf="model.firstName"
    type="button"
    (mousedown)="$event.preventDefault()"
    (click)="model.firstName = ''">
    &times;
  </button>
</div>
```

**Copy**:

```html
<div formidableFieldSuffix>
  <button
    type="button"
    [disabled]="!model.iban"
    (mousedown)="$event.preventDefault()"
    (click)="clipboard.writeText(model.iban)">
    Copy
  </button>
</div>
```

**Validation state** — a glyph, not a control, so it stays click-through:

```html
<div formidableFieldSuffix>
  <span [class.invalid]="errors['email']">{{ errors['email'] ? '✗' : '✓' }}</span>
</div>
```

**Loading** — bind the flag your own async work sets:

```html
<div formidableFieldSuffix>
  <span
    *ngIf="isLookingUp"
    class="spinner"></span>
</div>
```

## Field Components

For the full API of every field and directive — selectors, value types and all inputs — see the [component catalogue](.documentation/ui_components.md).

| Category          | Component                           | Description                                        |
| ----------------- | ----------------------------------- | -------------------------------------------------- |
| **Basic Fields**  | `<formidable-input-field>`          | A standard single-line text input field.           |
|                   | `<formidable-textarea-field>`       | A multi-line textarea with optional autosizing.    |
| **Option Fields** | `<formidable-select-field>`         | A styled dropdown based on the native `<select>`.  |
|                   | `<formidable-dropdown-field>`       | A custom dropdown overlay with keyboard support.   |
|                   | `<formidable-autocomplete-field>`   | A text input that filters and suggests options.    |
|                   | `<formidable-field-option>`         | Defines an individual option for any option field. |
| **field groups**  | `<formidable-radio-group-field>`    | A keyboard-navigable group of radio options.       |
|                   | `<formidable-checkbox-group-field>` | A keyboard-navigable group of checkboxes.          |
| **Date & Time**   | `<formidable-date-field>`           | A masked date input with a calendar popup.         |
|                   | `<formidable-time-field>`           | A masked time-only input field.                    |

## Theming & Styles

Various styling variables allow to customize the theming. Override any supported CSS variable.
You can also tweak Pikaday CSS.

```scss
// styles.scss

@use 'ngx-formidable';

// ngx-formidable overrides
:root {
  --formidable-field-height: 50px;
  --formidable-color-validation-error: pink;
  --formidable-color-field-background: #d18fe9ff;
  --formidable-color-field-option-background-highlighted: #aa40ed2d;
  --formidable-date-field-panel-width: 200px;
  // add more
}

// Pikaday style overwrites
.pika-lendar {
  background-color: #8a2b75ff;
  // add more
}
```

### Overridable CSS Variables

| CSS Variable                                                | Description                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Font Sizes & Line-Heights**                               |                                                                                                                     |
| `--formidable-field-font-size`                              | Base font size for form field text.                                                                                 |
| `--formidable-field-font-weight`                            | Font weight for form field text.                                                                                    |
| `--formidable-field-line-height`                            | Line height for form field text.                                                                                    |
| `--formidable-label-font-size`                              | Font size for labels.                                                                                               |
| `--formidable-label-font-weight`                            | Font weight for labels.                                                                                             |
| `--formidable-label-line-height`                            | Line height for labels.                                                                                             |
| `--formidable-label-floating-font-size`                     | Font size for a floating label (see Field Dimensions below).                                                        |
| `--formidable-label-floating-font-weight`                   | Font weight for a floating label.                                                                                   |
| `--formidable-label-floating-line-height`                   | Line height for a floating label.                                                                                   |
| `--formidable-field-validation-error-font-size`             | Font size for validation error messages.                                                                            |
| `--formidable-field-validation-error-font-weight`           | Font weight for validation error messages.                                                                          |
| `--formidable-field-validation-error-line-height`           | Line height for validation error messages.                                                                          |
| `--formidable-field-hint-font-size`                         | Font size for hint text.                                                                                            |
| `--formidable-field-hint-font-weight`                       | Font weight for hint text.                                                                                          |
| `--formidable-field-hint-line-height`                       | Line height for hint text.                                                                                          |
| `--formidable-length-indicator-font-size`                   | Font size for the textarea length indicator.                                                                        |
| `--formidable-length-indicator-font-weight`                 | Font weight for the textarea length indicator.                                                                      |
| `--formidable-length-indicator-line-height`                 | Line height for the textarea length indicator.                                                                      |
| **Field Dimensions**                                        |                                                                                                                     |
| `--formidable-field-before-margin-bottom`                   | Vertical margin below each field container.                                                                         |
| `--formidable-border-radius`                                | The library's base corner radius. Everything rounded that is not a field box falls back to it.                      |
| `--formidable-field-border-thickness`                       | Thickness of field borders.                                                                                         |
| `--formidable-field-border-radius`                          | Border-radius every corner of a field falls back to — see _Per-Corner Radius_ below.                                |
| `--formidable-field-border-start-start-radius`              | Border-radius of a field's top-left corner alone. Defaults to `--formidable-field-border-radius`.                   |
| `--formidable-field-border-start-end-radius`                | Border-radius of a field's top-right corner alone.                                                                  |
| `--formidable-field-border-end-end-radius`                  | Border-radius of a field's bottom-right corner alone.                                                               |
| `--formidable-field-border-end-start-radius`                | Border-radius of a field's bottom-left corner alone.                                                                |
| `--formidable-field-underline-thickness`                    | Extra line painted inside a field's bottom edge. `0` paints none — see _Underline_ below.                           |
| `--formidable-field-underline-thickness-focus`              | Underline thickness while the field is focused.                                                                     |
| `--formidable-field-underline-thickness-invalid`            | Underline thickness while the field is invalid. Outranks the focused thickness.                                     |
| `--formidable-field-group-border-thickness`                 | Thickness of field group borders.                                                                                   |
| `--formidable-field-group-border-radius`                    | Border-radius for field group corners.                                                                              |
| `--formidable-label-height`                                 | Computed height of the label text line box.                                                                         |
| `--formidable-field-height`                                 | Default height for single-line fields.                                                                              |
| `--formidable-field-padding-x`                              | Horizontal padding of a field: where its value, and a projected prefix's text, start.                               |
| `--formidable-field-toggle-size`                            | Size of the panel toggle a dropdown or date field draws inside its own box.                                         |
| `--formidable-field-toggle-inset`                           | How much of a field's right edge that toggle claims. Raised by the decorator for the fields that have one.          |
| `--formidable-toggle-field-track-border-thickness`          | Border thickness of a toggle field's track, which is what draws it. Defaults to the field's border thickness.       |
| `--formidable-toggle-field-track-border-radius`             | Border-radius of a toggle field's track.                                                                            |
| `--formidable-toggle-field-thumb-border-radius`             | Border-radius of a toggle field's thumb.                                                                            |
| `--formidable-field-inner-height`                           | Computed height inside a field's borders.                                                                           |
| `--formidable-field-value-height`                           | Computed height of a field value's text line box.                                                                   |
| `--formidable-label-floating-height`                        | Computed height of a floating label's text line box.                                                                |
| `--formidable-label-inside-slack`                           | Computed space above and below the centered label-plus-value block of a field with an inside label.                 |
| `--formidable-label-inside-value-top`                       | Computed offset of the value's text line box from the field's inner top, with an inside label.                      |
| `--formidable-field-value-centered-top`                     | Computed offset of the value's text line box when it is centered in the field's inner height on its own.            |
| `--formidable-label-resting-offset`                         | Vertical offset for a resting label, centered in the field's inner height like a placeholder.                       |
| `--formidable-label-floating-offset`                        | Vertical offset for a floating label, at the top of the centered label-plus-value block.                            |
| `--formidable-label-border-offset`                          | Vertical offset for a `border` label, so its text line box straddles the field's top border.                        |
| `--formidable-label-border-gap`                             | How far a `border` label's border-hiding band reaches either side of its text.                                      |
| `--formidable-label-border-band-bleed`                      | How far that band outgrows the border above and below, so pixel rounding leaves no hairline showing.                |
| `--formidable-label-border-band-reach`                      | How much further that band reaches upwards. Raised to the focus ring's width while the field is focused.            |
| `--formidable-label-required-marker`                        | The `content` string suffixed to a required field's label — `'*'`, or a word such as `' (required)'`.               |
| `--formidable-field-group-option-padding`                   | Padding of options within a field group.                                                                            |
| `--formidable-field-support-min-height`                     | Minimum reserved height of a support-text row below a field — the hints and the validation errors.                  |
| **Colors**                                                  |                                                                                                                     |
| `--formidable-color-validation-error`                       | Text color for validation errors.                                                                                   |
| `--formidable-color-field-text`                             | Text color for fields.                                                                                              |
| `--formidable-color-field-group-text`                       | Text color for field groups.                                                                                        |
| `--formidable-color-field-text-hovered`                     | Overrides`--formidable-color-field-text`and`--formidable-color-field-group-text`when field is hovered.              |
| `--formidable-color-field-text-focus`                       | Overrides`--formidable-color-field-text`and`--formidable-color-field-group-text`when field is focused.              |
| `--formidable-color-field-text-invalid`                     | Overrides`--formidable-color-field-text`and`--formidable-color-field-group-text`when field is invalid.              |
| `--formidable-color-field-text-readonly`                    | Overrides`--formidable-color-field-text`and`--formidable-color-field-group-text`when field is readonly.             |
| `--formidable-color-field-text-disabled`                    | Overrides`--formidable-color-field-text`and`--formidable-color-field-group-text`when field is disabled.             |
| `--formidable-color-field-label`                            | Text color for labels.                                                                                              |
| `--formidable-color-field-label-floating`                   | Text color for a floating label.                                                                                    |
| `--formidable-color-field-label-resting`                    | Text color for a resting label, which stands in for the placeholder.                                                |
| `--formidable-color-field-label-hovered`                    | Overrides all three label colors when the field is hovered.                                                         |
| `--formidable-color-field-label-focus`                      | Overrides all three label colors when the field is focused.                                                         |
| `--formidable-color-field-label-invalid`                    | Overrides all three label colors when the field is invalid.                                                         |
| `--formidable-color-field-label-readonly`                   | Overrides all three label colors when the field is readonly.                                                        |
| `--formidable-color-field-label-disabled`                   | Overrides all three label colors when the field is disabled.                                                        |
| `--formidable-color-label-border-band`                      | Fill a `border` label paints over the border it hides. Follows the field background by default.                     |
| `--formidable-color-label-border-band-readonly`             | Overrides `--formidable-color-label-border-band` when the field is readonly.                                        |
| `--formidable-color-label-border-band-disabled`             | Overrides `--formidable-color-label-border-band` when the field is disabled.                                        |
| `--formidable-color-field-placeholder`                      | Text color for placeholder text.                                                                                    |
| `--formidable-color-field-selection`                        | Background color for selected text.                                                                                 |
| `--formidable-color-field-border`                           | Border color for fields.                                                                                            |
| `--formidable-color-field-border-hovered`                   | Border color for fields that are hovered.                                                                           |
| `--formidable-color-field-border-focus`                     | Border color for fields that are focused.                                                                           |
| `--formidable-color-field-border-invalid`                   | Border color for fields that are invalid. Also replaces the hover and focus border, and the field group's.          |
| `--formidable-color-field-border-readonly`                  | Overrides`--formidable-color-field-border`when field is readonly.                                                   |
| `--formidable-color-field-border-disabled`                  | Overrides`--formidable-color-field-border`when field is disabled.                                                   |
| `--formidable-color-field-group-border`                     | Border color for field groups.                                                                                      |
| `--formidable-color-field-group-border-focus`               | Border color for field groups that are focused.                                                                     |
| `--formidable-color-field-group-border-readonly`            | Overrides`--formidable-color-field-group-border`when field is readonly.                                             |
| `--formidable-color-field-group-border-disabled`            | Overrides`--formidable-color-field-group-border`when field is disabled.                                             |
| `--formidable-color-field-underline`                        | Colour of a field's underline. Follows the border colour through every state unless overridden.                     |
| `--formidable-color-field-underline-focus`                  | Underline colour while the field is focused.                                                                        |
| `--formidable-color-field-underline-invalid`                | Underline colour while the field is invalid.                                                                        |
| `--formidable-color-field-background`                       | Background color for fields.                                                                                        |
| `--formidable-color-field-group-background`                 | Background color for field groups.                                                                                  |
| `--formidable-color-field-background-hovered`               | Overrides`--formidable-color-field-background`and`--formidable-color-field-group-background`when field is hovered.  |
| `--formidable-color-field-background-focus`                 | Overrides`--formidable-color-field-background`and`--formidable-color-field-group-background`when field is focused.  |
| `--formidable-color-field-background-invalid`               | Overrides`--formidable-color-field-background`and`--formidable-color-field-group-background`when field is invalid.  |
| `--formidable-color-field-background-readonly`              | Overrides`--formidable-color-field-background`and`--formidable-color-field-group-background`when field is readonly. |
| `--formidable-color-field-background-disabled`              | Overrides`--formidable-color-field-background`and`--formidable-color-field-group-background`when field is disabled. |
| `--formidable-color-field-group-background-readonly`        | Overrides`--formidable-color-field-group-background`when field group is readonly.                                   |
| `--formidable-color-field-group-background-disabled`        | Overrides`--formidable-color-field-group-background`when field group is disabled.                                   |
| `--formidable-color-field-option-text-readonly`             | Text color for option items that are readonly.                                                                      |
| `--formidable-color-field-option-text-disabled`             | Text color for option items that are disabled.                                                                      |
| `--formidable-color-field-option-background-selected`       | Background color for option items that are selected.                                                                |
| `--formidable-color-field-option-background-highlighted`    | Background color for option items that are highlighted.                                                             |
| `--formidable-color-field-option-background-hovered`        | Background color for option items that are hovered.                                                                 |
| `--formidable-color-field-focus-box-shadow`                 | Box shadow for fields that are focused.                                                                             |
| `--formidable-color-field-group-focus-box-shadow`           | Box shadow for field groups that are focused.                                                                       |
| `--formidable-color-field-focus-box-shadow-invalid`         | Replaces both focus box shadows while the field is invalid.                                                         |
| **Date-Field Panel**                                        |                                                                                                                     |
| `--formidable-color-date-field-panel-select`                | Text color for “Today” / selected date toggle in calendar.                                                          |
| `--formidable-color-date-field-panel-select-hovered`        | Hover color for the “Today” toggle.                                                                                 |
| `--formidable-color-date-field-panel-date-highlighted-text` | Text color for highlighted dates inside the calendar.                                                               |
| `--formidable-color-date-field-panel-date-highlighted`      | Background color for highlighted dates.                                                                             |
| `--formidable-color-date-field-panel-date-hovered`          | Background color when hovering a date.                                                                              |
| `--formidable-color-date-field-panel-date-out-of-range`     | Color for dates outside the min/max range.                                                                          |
| `--formidable-color-date-field-panel-day-label`             | Color for weekday labels in the calendar header.                                                                    |
| **Option Prefix**                                           |                                                                                                                     |
| `--formidable-color-option-prefix-outer`                    | Color of the outer ring/square border of a radio/check box group field option item.                                 |
| `--formidable-color-option-prefix-outer-readonly`           | Overrides`--formidable-color-option-prefix-outer`when option is readonly.                                           |
| `--formidable-color-option-prefix-outer-disabled`           | Overrides`--formidable-color-option-prefix-outer`when option is disabled.                                           |
| `--formidable-color-option-prefix-outer-selected`           | Overrides`--formidable-color-option-prefix-outer`when option is selected.                                           |
| `--formidable-color-option-prefix-outer-highlighted`        | Overrides`--formidable-color-option-prefix-outer`when option is highlighted.                                        |
| `--formidable-color-option-prefix-inner`                    | Color of the inner ring/square of a radio/check box group field option item.                                        |
| `--formidable-color-option-prefix-inner-readonly`           | Overrides`--formidable-color-option-prefix-inner`when option is readonly.                                           |
| `--formidable-color-option-prefix-inner-disabled`           | Overrides`--formidable-color-option-prefix-inner`when option is disabled.                                           |
| `--formidable-color-option-prefix-inner-selected`           | Overrides`--formidable-color-option-prefix-inner`when option is selected.                                           |
| `--formidable-color-option-prefix-inner-highlighted`        | Overrides`--formidable-color-option-prefix-inner`when option is highlighted.                                        |
| `--formidable-color-option-prefix-background`               | Background color behind option prefix elements.                                                                     |
| **Length Indicator**                                        |                                                                                                                     |
| `--formidable-color-field-hint`                             | Text color for hint text. Follows the field placeholder color by default.                                           |
| `--formidable-color-length-indicator`                       | Text color for the textarea length indicator.                                                                       |
| **Textarea**                                                |                                                                                                                     |
| `--formidable-textarea-min-height`                          | Minimum height for textareas.                                                                                       |
| `--formidable-textarea-max-height`                          | Maximum height for textareas.                                                                                       |
| `--formidable-textarea-padding-top`                         | Top padding for textareas when autosizing is enabled.                                                               |
| **Panels**                                                  |                                                                                                                     |
| `--formidable-panel-background`                             | Background color for dropdown/autocomplete/date panels.                                                             |
| `--formidable-panel-border-radius`                          | Border-radius for all panels. The two corners a panel sits against its field with mirror that field instead.        |
| `--formidable-panel-box-shadow`                             | Box-shadow for all panels.                                                                                          |
| `--formidable-panel-max-height`                             | Maximum vertical height for panels (before scrolling).                                                              |
| **Animations**                                              |                                                                                                                     |
| `--formidable-animation-duration`                           | Duration for label/flyout/open/close animations.                                                                    |
| `--formidable-animation-easing`                             | Easing curve for animations.                                                                                        |
| `--formidable-hover-duration`                               | Transition duration for hover effects.                                                                              |
| `--formidable-hover-easing`                                 | Easing curve for hover transitions.                                                                                 |
| **Z-Index**                                                 |                                                                                                                     |
| `--formidable-flyout-z-index`                               | z-index applied to dropdown/flyout panels.                                                                          |
| `--formidable-overlay-z-index`                              | z-index applied to any full-screen overlays.                                                                        |
| `--formidable-above-overlay-z-index`                        | z-index for elements that must sit above overlays.                                                                  |
| **Date-Field Panel**                                        |                                                                                                                     |
| `--formidable-date-field-panel-width`                       | Fixed width for the date-picker panel.                                                                              |
| `--formidable-date-field-panel-border-radius`               | Border-radius for the date-picker panel.                                                                            |
| `--formidable-date-field-panel-box-shadow`                  | Box-shadow override for the date-picker panel.                                                                      |
| **Option Prefix Dimensions**                                |                                                                                                                     |
| `--formidable-option-prefix-dimension-outer`                | Size of the outer circle/box for radio/checkbox prefixes.                                                           |
| `--formidable-option-prefix-dimension-inner`                | Size of the inner indicator for selected radio/checkbox prefixes.                                                   |
| `--formidable-option-prefix-gap`                            | Gap between a radio/checkbox prefix and its option label.                                                           |
| `--formidable-option-prefix-border-thickness`               | Border thickness of the outer circle/box for radio/checkbox prefixes.                                               |

### Per-Corner Radius

Every corner of a field falls back to `--formidable-field-border-radius`, and each can be shaped on its own. The four corner variables use CSS logical names — `start-start` is the top-left corner in a left-to-right, top-to-bottom writing mode:

```scss
:root {
  --formidable-field-border-radius: 0.5rem;
  --formidable-field-border-end-start-radius: 0; /* top-rounded only */
  --formidable-field-border-end-end-radius: 0;
}
```

They shape the field box and nothing else. Everything else that is rounded — the toggle, the slider, the panels — falls back to `--formidable-border-radius` instead, which is what to override to round the whole library at once. Set that one in your own `:root`: the derived variables resolve where they are declared, so overriding a base further down the tree has no effect. The corner variables above are the exception — they are read where they are used, so they work on `:root` and on a single field alike. A field group takes its shape from `--formidable-field-group-border-radius`, which is substituted verbatim into `border-radius` and so still accepts the whole CSS shorthand.

While a dropdown, autocomplete or date panel is open, it adopts the two corners of the field it sits against: opened below, its top corners take the field's bottom ones; flipped above, its bottom corners take the field's top ones. Its far side keeps `--formidable-panel-border-radius`. The field never reshapes itself — its corners are what you declared, panel or no panel.

### Underline

A field can carry an extra line inside its bottom edge, thickening on focus and on invalid. It is painted over the border rather than replacing it, so no state can change it and move the field's content:

```scss
:root {
  --formidable-field-border-thickness: 0px;
  --formidable-field-underline-thickness: 1px;
  --formidable-field-underline-thickness-focus: 2px;
  --formidable-field-underline-thickness-invalid: 2px;
}
```

The thickness is `0` by default, so nothing is painted until a theme asks for it. The colour follows `--formidable-color-field-border` through every state; name `--formidable-color-field-underline` and its `-focus` / `-invalid` variants only where the two should differ. Field groups never take an underline: a group is a tall multi-row box, and a line across its bottom reads as a divider between its options.

Dropping the field border to `0px` also erases a toggle field's track, which is drawn by that same border — give it `--formidable-toggle-field-track-border-thickness` to keep it.

> **Units are mandatory on length variables.** Write `0px`, not `0`. A unitless zero is a `<number>` rather than a `<length>`, and these variables are consumed inside `calc()`, where that invalidates the whole declaration — silently taking out every value derived from it, including label offsets and panel alignment.

## Root-Level / Cross-Field Validation

Sometimes your form needs rules that depend on more than one field — for example, you might require that **both** `name` and `birthdate` be provided together. You can implement that with a `ROOT_FORM`–level test in your Vest suite. Here is how to do that:

1. Add the `formidableRootValidate` directive to your `<form>`.
2. Include a `ROOT_FORM` test in your Vest suite.

```html
<form
  formidableForm
  formidableRootValidate
  [formValue]="userFormModel"
  [formFrame]="userFormFrame"
  [formSuite]="userFormValidationSuite"
  ...>
  <!-- ... -->
</form>
```

```ts
import { staticSuite, test, Modes, only, enforce } from 'vest';
import { ROOT_FORM } from 'ngx-formidable';

export const userFormValidationSuite = staticSuite((model: UserFormModel, field?: string) => {
  mode(Modes.ALL);
  if (field) only(field);

  // Root-Level / Cross‐field rule: name AND birthdate must both be filled
  test(ROOT_FORM, 'Please enter both name and birthdate.', () => {
    enforce(!!model.name && !!model.birthdate).isTruthy();
  });

  // ...
});
```

## Error Message Translation (i18n)

By default, `ngx-formidable` displays validation errors exactly as they are produced by your validation suite (e.g. Vest test messages).

For i18n use-cases, it’s common to emit **translation keys** from your validation suite and translate them when rendering.

### Configure a Global Error Translator

Instead of returning human-readable text in Vest, return a translation key:

```ts
import { enforce, staticSuite, test } from 'vest';

export const userFormValidationSuite = staticSuite((model: UserFormModel, field?: string) => {
  test('name', 'validation.name.required', () => {
    enforce(model.name).isNotBlank();
  });
});
```

Then provide a translation function via the `FORMIDABLE_ERROR_TRANSLATOR` injection token.

### Standalone Usage

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgxFormidable, FORMIDABLE_ERROR_TRANSLATOR } from 'ngx-formidable';
import { AppComponent } from './app/app.component';
import { YourTranslationService } from './your-translation.service';

bootstrapApplication(AppComponent, {
  providers: [
    ...provideNgxFormidable(),
    {
      provide: FORMIDABLE_ERROR_TRANSLATOR,
      useFactory: (ts: YourTranslationService) => (key: string) => ts.translate(key),
      deps: [YourTranslationService]
    }
  ]
});
```

### Module Usage

```ts
import { NgModule } from '@angular/core';
import { NgxFormidableModule, FORMIDABLE_ERROR_TRANSLATOR } from 'ngx-formidable';
import { YourTranslationService } from './your-translation.service';

@NgModule({
  imports: [NgxFormidableModule.forRoot()],
  providers: [
    {
      provide: FORMIDABLE_ERROR_TRANSLATOR,
      useFactory: (ts: YourTranslationService) => (key: string) => ts.translate(key),
      deps: [YourTranslationService]
    }
  ]
})
export class AppModule {}
```

### What gets translated?

Any string returned from your validation layer and rendered by `<formidable-field-errors>`:

- Vest messages (`test('field', 'some.key', ...)`)
- Root-level errors (when rendered)
- Any custom error strings you attach to `control.errors['errors']`

If you do not provide `FORMIDABLE_ERROR_TRANSLATOR`, errors are rendered unchanged.

## Keyboard Navigation

All controls are keyboard-friendly.

- Disabled/readonly fields ignore navigation.
- `Panel` = Dropdown/Autocomplete/Date overlay.
- Panels close on `Esc` or when focus leaves the field.
- `Segment` = the part of the `unicodeTokenFormat` under the caret — the year, month or day of a date
  field, the hour, minute, second or AM/PM of a time field. Stepping one leaves it selected, so
  repeated arrows stay on it and the next digit you type replaces it. An empty field is seeded first
  (a date with today, a time with midnight), and a date step that would leave `minDate`/`maxDate` is
  refused.

| Key                  | Inputs / Textareas | Select / Dropdown / Autocomplete                       | Radio / Checkbox Groups | Date Picker                                   | Time Field          |
| -------------------- | ------------------ | ------------------------------------------------------ | ----------------------- | --------------------------------------------- | ------------------- |
| `Tab`                | Move to next       | Close panel (if open), then move                       | Move to next            | Close panel (if open), then move              | Move to next        |
| `Shift` + `Tab`      | Move to previous   | Close panel (if open), then move                       | Move to previous        | Close panel (if open), then move              | Move to previous    |
| `Enter`              | —                  | If panel open: choose highlighted option; if closed: — | —                       | Parse & accept date                           | Parse & accept time |
| `Esc`                | —                  | Close panel                                            | —                       | Close panel                                   | —                   |
| `Arrow Up`           | —                  | If open: previous option (wrap)                        | Previous option         | If panel open: previous week; else segment up | Segment up          |
| `Arrow Down`         | —                  | If closed: open panel; if open: next option (wrap)     | Next option             | If panel open: next week; else segment down   | Segment down        |
| `Alt` + `Arrow Up`   | —                  | —                                                      | —                       | Close panel                                   | —                   |
| `Alt` + `Arrow Down` | —                  | —                                                      | —                       | Open panel                                    | —                   |
| `Arrow Left`         | —                  | —                                                      | —                       | If panel open: previous day; else move caret  | Move caret          |
| `Arrow Right`        | —                  | —                                                      | —                       | If panel open: next day; else move caret      | Move caret          |

### Type-ahead (Dropdowns & Autocomplete)

Typing builds a short type-ahead buffer; the first matching option is highlighted.

- Backspace edits the buffer.
- If the panel is closed, typing the first character opens it.
- The buffer auto-clears after a brief pause.

## Masking

Some fields support input masking. Under the hood this uses ngx-mask, and you can pass (almost) all of its options straight through.

How config is applied:

- Per-field overrides (via `[maskConfig]`)
- App-wide defaults (provided with `FORMIDABLE_MASK_DEFAULTS`)
- Library fallbacks (sane defaults)

### App-wide defaults

Provide global defaults once in your app:

**Standalone Usage**

```ts
// main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideNgxFormidable } from 'ngx-formidable';

bootstrapApplication(AppComponent, {
  providers: [
    ...provideNgxFormidable({
      // global defaults for ngx-mask
      globalMaskConfig: { validation: true, dropSpecialCharacters: true }
    })
  ]
}).catch(console.error);
```

````

**Module Usage**

```ts
// app.module.ts

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';

import { NgxFormidableModule } from 'ngx-formidable';

@NgModule({
  imports: [
    BrowserModule,
    NgxFormidableModule.forRoot({
      // global defaults for ngx-mask
      globalMaskConfig: { validation: true, dropSpecialCharacters: true }
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

### Per-field override

```html
<formidable-input-field
  name="price"
  [mask]="'000.00'"
  [maskConfig]="{ prefix: 'CHF ', decimalMarker: ',' }"
  ngModel>
</formidable-input-field>
```

That’s it: Set a `[mask]` when you want masking and optionally tweak behavior with `[maskConfig]`.

## Extending with Custom Components / Options

When you add your own field component (by implementing `IFormidableField` or `IFormidableOptionField` and providing it via `FORMIDABLE_FIELD`/`FORMIDABLE_OPTION_FIELD`), it immediately gains:

- **Async validation** via `NgxFormidableFormModelDirective`
- **Root-level / cross-field validation** if you use `formidableRootValidate`
- **Error rendering** simply by adding `formidableFieldErrors` — with or without a decorator around the field
- **Hints** simply by projecting `formidableFieldHint` elements into the decorator
- **Decorator support** — labels, label adornments, prefixes, suffixes and hints work out of the box. A
  prefix/suffix is centered in your field's box, or follows its value when the consumer sets `align`; if
  your field top-aligns its value (like a textarea), set `valueAlignment: 'top'` so they sit on its first
  line instead and `align` steps aside

You don’t need any extra wiring; just implement the interface, extend `BaseFieldDirective`, and register the provider.

### Example Component: A Custom Color Picker

```ts
import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseFieldDirective, FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableField } from 'ngx-formidable';

@Component({
  selector: 'custom-color-picker',
  template: `
    <input
      #inputRef
      type="color"
      [value]="value || '#000000'"
      (input)="onNativeInput($event)" />
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomColorPickerComponent),
      multi: true
    },
    {
      provide: FORMIDABLE_FIELD,
      useExisting: forwardRef(() => CustomColorPickerComponent)
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomColorPickerComponent extends BaseFieldDirective implements IFormidableField {
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // #region ControlValueAccessor

  // Called when Angular writes to the form control
  protected doWriteValue(value: string): void {
    this.inputRef.nativeElement.value = value || '#000000';
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.inputRef.nativeElement.value || null;
  }

  // `canLabelRest` is inherited from BaseFieldDirective. Override `showsEmptyValueHint` instead if the
  // field renders something where the value goes while empty, which a resting label would collide with.

  get fieldRef(): ElementRef<HTMLElement> {
    return this.inputRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region Custom Input Properties

  // ...

  // #endregion

  // Called when the native input fires
  onNativeInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.valueChangeSubject$.next(v);
    this.valueChanged.emit(v);
    this.onChange(v);
  }
}
```

### Example Option: A Fuzzy Option

```ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { FieldOptionComponent, FORMIDABLE_FIELD_OPTION } from 'ngx-formidable';
import { HighlightedEntries } from '../example-form/example-form.model';

@Component({
  selector: 'example-fuzzy-option',
  templateUrl: './example-fuzzy-option.component.html',
  styleUrls: ['./example-fuzzy-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      // required to provide this component as IFormidableFieldOption
      provide: FORMIDABLE_FIELD_OPTION,
      useExisting: forwardRef(() => ExampleFuzzyOptionComponent)
    }
  ]
})
export class ExampleFuzzyOptionComponent extends FieldOptionComponent {
  @Input() subtitle?: string = 'sub';

  @Input() highlightedEntries?: HighlightedEntries = {
    labelEntries: [],
    subtitleEntries: []
  };
}
```

```html
<div (click)="select ? select() : null">
  <ng-template #contentTemplate>
    <!-- Custom Template -->
    <p class="option-label">
      @if (highlightedEntries?.labelEntries?.length) { @for (entry of highlightedEntries?.labelEntries; track entry.text) {
      <span [class.option-highlight]="entry.isHighlighted">{{ entry.text }}</span>
      } } @else { {{ label }} }
    </p>
    <p class="option-subtitle">
      @if (highlightedEntries?.subtitleEntries?.length) { @for (entry of highlightedEntries?.subtitleEntries; track entry.text) {
      <span [class.option-highlight]="entry.isHighlighted">{{ entry.text }}</span>
      } } @else { {{ subtitle }} }
    </p>
  </ng-template>
</div>
```

```scss
:host {
  display: block;
}

.option-label {
  font-weight: normal;
  font-size: 16px;
}

.option-subtitle {
  font-weight: bold;
  font-size: 12px;
}

.option-highlight {
  color: orange;
}
```

---

## Contributing

Contributions are welcome!

1. **Fork** the repo and create a feature branch.
2. **Run** `npm install` and `npm run build` to compile.
3. **Add tests** under `src/**/*.spec.ts` and update existing ones as needed.
4. **Document** any new public APIs or styles in the `README.md` and link to the live docs.
5. Open a **Pull Request** describing your changes.

## License

Everything in this repository is licensed under the [MIT License](./LICENSE) unless otherwise specified.

Copyright (c) 2026 - present Christian Lüthold
````
