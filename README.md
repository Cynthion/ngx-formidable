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
- [Validation](#validation)
- [Whole-Form Rules](#whole-form-rules)
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

### <h5><a href="#validation">✅ Bring Your Own Validator</a></h5>

• <code>Vest</code>, <code>zod</code>, Angular's own, or none
• Field, group or whole-form rules
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
npm install ngx-formidable pikaday date-fns ngx-mask
```

The library does not validate, so it brings no validation library.
Add one only if you want it, e.g. with `npm i vest` for the adapter that ships in `@cynthion/ngx-formidable/vest`, or wire your own. See [Validation](#validation).

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

The example below validates with [Vest](https://vestjs.dev), which is what `@cynthion/ngx-formidable/vest` adapts. Any other validator plugs into the same place. See [Validation](#validation).

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
export type UserFormShape = DeepRequired<UserFormModel>;

export const userFormModel: UserFormModel = {
  // set initial values here, if any
  name: undefined, // e.g., 'Cynthion',
  hobby: undefined, // e.g., 'reading',
  birthdate: undefined // e.g., new Date(1989, 5, 29),
};

export const userFormShape: UserFormShape = {
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
  [formShape]="userFormShape"
  [formSuite]="userFormValidationSuite"
  [debounceMs]="200"
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

- Binds your form model and frame, and delegates validation to whatever `FORMIDABLE_VALIDATOR` you provide.
- Emits `formValueChange$`, `errorsChange$`, `dirtyChange$`, `validChange$`.

### NgxFormidableWholeFormValidateDirective (`formidableValidateWholeForm`)

Adds a whole-form async validator, so a rule about the form rather than about any one field has somewhere to report. See [Whole-Form Rules](#whole-form-rules).

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

### NgxFormidableFieldValidateDirective

Hooks into each `ngModel` to run per-field async validation. No-ops outside a formidable form, and again when no `FORMIDABLE_VALIDATOR` is provided.

### NgxFormidableGroupValidateDirective

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

Set `showRequiredMarker` on a field and its label is suffixed with a marker, in every label position:

```html
<formidable-field-decorator>
  <formidable-input-field
    name="firstName"
    [showRequiredMarker]="true"
    ngModel />
  <div formidableFieldLabel>First Name</div>
</formidable-field-decorator>
```

`showRequiredMarkers` on the `<form>` withholds the marker from every field on it, so one switch decides whether this form marks its required fields at all.

The glyph is the `--formidable-label-required-marker` variable, so a theme can swap `'*'` for a word —
`--formidable-label-required-marker: ' (required)'` — without touching markup. It inherits the label's
colour and so follows every field state, and it is never the thing that gets cut off when a label is too
long to fit.

### Focus

Every field has a `focus()` method, and an `autoFocus` input that calls it once the field's view is ready
— which is how you focus a field on page load:

```html
<!-- focused on load -->
<formidable-input-field
  name="firstName"
  [autoFocus]="true"
  ngModel />

<!-- or imperatively, from anywhere that can reach the field -->
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

Focusing never opens a panel — the dropdown, autocomplete and date fields open on click, on `ArrowDown`,
or on typing, so a focused field is ready for input without a list covering the page. A `disabled` field
ignores `focus()`.

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

For the full API of every field and directive — selectors, value types and all inputs — see the [component catalogue](.documentation/user/components.md).

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

### Panel Placement

`panelPosition` places the panel of a dropdown, autocomplete or date field. `left`, `right` and `full` anchor it to the field and flip it above when there is no room below. `sheet` makes it a sheet instead — fixed across the bottom of the viewport, full width, and it never flips:

```html
<formidable-date-field
  name="birthdate"
  [panelPosition]="'sheet'" />
```

This is what a phone wants; an anchored panel in a narrow column is not. Two things to know before you reach for it:

- A sheet is `position: fixed`, which any ancestor with a `transform`, `filter` or `contain` turns back into an ordinary absolute box. Keep those off the elements the field sits in.
- Opening a date sheet moves focus to the panel, so a soft keyboard retracts and the sheet is clear. An autocomplete sheet keeps focus in its filter input — that is what makes it type-ahead — so on a phone the keyboard can cover it.

Whatever the placement, the calendar scales to the width its panel has, so `--formidable-date-field-panel-width` is the width it prefers rather than one it is fixed at.

## Theming & Styles

Every visual property is an overridable CSS custom property. Import the library's stylesheet, then redeclare whatever you want to change in your own `:root`:

```scss
// styles.scss

@use 'ngx-formidable';

:root {
  --formidable-field-height: 50px;
  --formidable-color-validation-error: pink;
  --formidable-color-field-background: #d18fe9ff;
  --formidable-color-field-option-background-highlighted: #aa40ed2d;
  --formidable-date-field-panel-width: 200px;
}
```

All customizable variables and some recipes are listed in the [theming guide](.documentation/user/theming.md) and the [token reference](.documentation/user/theme-reference.md).

## Validation

The library does not validate. It renders fields, themes them, and displays whatever errors it finds on
Angular's own `AbstractControl.errors`, so any validator works, including none.

| Approach                        | What you write                                             |
| :------------------------------ | :--------------------------------------------------------- |
| Angular's built-in validators   | Nothing — `required`, `minlength` and friends already work |
| `@cynthion/ngx-formidable/vest` | One import; `vest` is an optional peer dependency          |
| Your own adapter                | One class implementing `IFormidableValidator`              |
| Nothing                         | Nothing                                                    |

`NgxFormidableFormDirective` owns the model, the field paths and the debouncing, and delegates the rules to
whatever `FORMIDABLE_VALIDATOR` is provided on the `<form>`:

```ts
export interface IFormidableValidator<T = Record<string, unknown>> {
  /** Runs the rules for one field path against the whole model. `null` means valid. */
  validate(model: T, target: string): Observable<string[] | null>;
}
```

For Vest, that adapter ships with the library — add it to your imports and keep `[formSuite]` as it is:

```ts
import { NgxFormidableVestValidatorDirective } from '@cynthion/ngx-formidable/vest';
```

### Validation Timing

Two separate settings decide when a field validates and when it says so, and most forms want a mismatch
between them.

| Axis   | Question                     | Set with                                     | Default   |
| :----- | :--------------------------- | :------------------------------------------- | :-------- |
| Run    | When does the validator run? | Angular's `ngFormOptions` / `ngModelOptions` | `change`  |
| Reveal | When do the messages appear? | `revealOn`                                   | `touched` |

The run axis is Angular's own, so there is no input for it: `ngFormOptions` on the `<form>` cascades and
`ngModelOptions` on a field overrides. The reveal axis is the library's, takes `touched`, `dirty`,
`submitted` or `always`, and a field overrides the form on its `formidableFieldErrors`:

```html
<form
  formidableForm
  revealOn="submitted"
  [ngFormOptions]="{ updateOn: 'blur' }">
  <formidable-input-field
    formidableFieldErrors
    name="firstName"
    [ngModel]="model.firstName" />

  <!-- this one reports as soon as it is edited -->
  <formidable-input-field
    formidableFieldErrors
    name="lastName"
    revealOn="dirty"
    [ngModel]="model.lastName" />
</form>
```

Every rule runs asynchronously, so the form is still `PENDING` when `ngSubmit` fires. Gate a submit handler on `validChange$` or `idle$` rather than reading `form.valid` synchronously.

**Full guide, with worked Vest, Angular, zod and no-validation examples:**
[`.documentation/user/validation.md`](.documentation/user/validation.md).

## Whole-Form Rules

Sometimes your form needs rules that depend on more than one field — for example, you might require that **both** `name` and `birthdate` be provided together. Those go under the `WHOLE_FORM` field path, which your validator receives like any other. Here is how to do that with Vest:

1. Add the `formidableValidateWholeForm` directive to your `<form>`.
2. Include a `WHOLE_FORM` test in your Vest suite.

```html
<form
  formidableForm
  formidableValidateWholeForm
  [formValue]="userFormModel"
  [formShape]="userFormShape"
  [formSuite]="userFormValidationSuite"
  ...>
  <!-- ... -->
</form>
```

```ts
import { staticSuite, test, Modes, only, enforce } from 'vest';
import { WHOLE_FORM } from 'ngx-formidable';

export const userFormValidationSuite = staticSuite((model: UserFormModel, field?: string) => {
  mode(Modes.ALL);
  if (field) only(field);

  // Whole-form rule: name AND birthdate must both be filled
  test(WHOLE_FORM, 'Please enter both name and birthdate.', () => {
    enforce(!!model.name && !!model.birthdate).isTruthy();
  });

  // ...
});
```

## Error Message Translation (i18n)

By default, `ngx-formidable` displays validation errors exactly as your validator produced them.

For i18n use-cases, it’s common to emit **translation keys** from your validation suite and translate them when rendering.

### Configure a Global Error Translator

Instead of returning human-readable text in your validator, return a translation key:

Example using `Vest`:

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

Any string `FORMIDABLE_ERROR_EXTRACTOR` pulls out of `control.errors` and `<formidable-field-errors>` renders:

- validator messages
- Angular's own error keys (`required`, `minlength`, …)
- Whole-form errors (when rendered)
- Any custom error strings you attach to `control.errors['errors']`

If your validator writes a shape none of those cover, override `FORMIDABLE_ERROR_EXTRACTOR` — see
[`.documentation/user/validation.md`](.documentation/user/validation.md). If you do not provide
`FORMIDABLE_ERROR_TRANSLATOR`, errors are rendered unchanged.

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

- **Async validation** via `NgxFormidableFieldValidateDirective`
- **whole-form rules** if you use `formidableValidateWholeForm`
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
