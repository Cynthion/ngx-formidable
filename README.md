<h1 align="center">ngx-formidable</h1>

<p align="center">
Angular form fields you can actually theme, validated by whatever you already use.
</p>

<p align="center">
  Created with ❤️ by <a href="https://github.com/Cynthion">Cynthion</a>
</p>

<p align="center">
  <a href="https://github.com/Cynthion/ngx-formidable/actions/workflows/deploy.yml">
    <img src="https://github.com/Cynthion/ngx-formidable/actions/workflows/deploy.yml/badge.svg?branch=main" alt="Deploy">
  </a>
  <a href="https://cynthion.github.io/ngx-formidable/">
    <img src="https://img.shields.io/badge/demo-live-4f46e5" alt="Live demo">
  </a>
  <a href="https://angular.dev">
    <img src="https://img.shields.io/badge/Angular-%5E18-dd0031" alt="Angular ^18">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
  </a>
  <a href="https://github.com/Cynthion/ngx-formidable">
    <img src="https://img.shields.io/github/stars/Cynthion/ngx-formidable?label=GitHub%20Stars&style=flat" alt="GitHub Stars">
  </a>
</p>

Eleven form fields, one decorator that puts labels, prefixes, hints and errors around them, and around two hundred CSS custom properties to make them look like your product instead of like a component library. It holds the model and renders the fields; the rules come from Vest, zod, Angular's own validators, or nothing at all.

🌐 **[Live demo](https://cynthion.github.io/ngx-formidable/)** — every field, every label position, ten palettes and eleven field shapes, switchable in the page.
📚 **[Documentation](./.documentation/README.md)** — guides for consumers, design notes for maintainers.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features) - [🧩 Eleven Fields](#-eleven-fields) - [🎀 One Decorator](#-one-decorator) - [✅ Bring Your Own Validator](#-bring-your-own-validator) - [🎨 Themeable To The Corner](#-themeable-to-the-corner) - [⌨️ Keyboard And Screen Readers](#️-keyboard-and-screen-readers) - [🛡️ Masking And Panels](#️-masking-and-panels) - [🧠 Typed Model And Shape](#-typed-model-and-shape) - [🛠️ Extensible](#️-extensible) - [🚀 Zero Boilerplate](#-zero-boilerplate)
- [When To Pick This Over Angular Material](#when-to-pick-this-over-angular-material)
- [Installation](#installation)
- [Setup](#setup)
- [Your First Form](#your-first-form)
- [What's In The Box](#whats-in-the-box)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

<table>
<tr>
<td width="33%" valign="top">

##### [🧩 Eleven Fields](.documentation/user/components.md)

• Input, Textarea
• Select, Dropdown, Autocomplete
• Radio Group, Checkbox Group
• Date, Time
• Toggle, Slider
• One `formidable-field-option` for every option field, with your own template inside it
• Pinned or fallback `defaultOption`, `sortFn`, empty-state text

</td>
<td width="33%" valign="top">

##### [🎀 One Decorator](.documentation/user/decoration.md)

• Six label positions — outside, inside, inside-placeholder, inside-floating, border, border-prefix
• A slot beside the label for anything you like
• Prefix and suffix, centred or following the value
• Clickable prefixes and suffixes: clear, copy, retry, loading
• Always-visible hints sharing one row
• A required marker, per field or switched off form-wide
• Three layouts, picked by the field

</td>
<td width="33%" valign="top">

##### [✅ Bring Your Own Validator](.documentation/user/validation.md)

• Vest, zod, Angular's own, or none
• Field, group and whole-form rules
• Two timing axes: when it **runs**, when it **reveals**
• `debounceMs` on the form
• `FORMIDABLE_ERROR_EXTRACTOR` reads any error shape
• `FORMIDABLE_ERROR_TRANSLATOR` for i18n
• Live `formValueChange$`, `validChange$`, `dirtyChange$`, `errorsChange$`

</td>
</tr>

<tr>
<td width="33%" valign="top">

##### [🎨 Themeable To The Corner](.documentation/user/theming.md)

• ~200 overridable CSS custom properties
• Rebrand from a single variable
• Per-corner field radius, underline family, focus rings
• A colour set per field state
• Overridable Pikaday classes
• Ten palettes and eleven field shapes to start from
• No SCSS build hooks, no theme to initialise

</td>
<td width="33%" valign="top">

##### [⌨️ Keyboard And Screen Readers](.documentation/user/fields.md#keyboard)

• `Enter`, `Esc`, `Tab`, arrows, `Alt` + arrows
• Type-ahead buffers on the option panels
• Arrow-stepping of date and time segments
• Managed focus and scroll-into-view
• `focus()` and `autoFocus` on every field
• Combobox, listbox, dialog, switch and group roles
• Errors in an `aria-live` region

</td>
<td width="33%" valign="top">

##### [🛡️ Masking And Panels](.documentation/user/fields.md)

• ngx-mask on the input and textarea fields
• Per-field `[mask]` / `[maskConfig]`, app-wide `FORMIDABLE_MASK_DEFAULTS`
• Date and time parsed and formatted by one token string
• Panels anchored left, right or full width, flipping when there is no room
• A `sheet` panel for phones
• Panels that cannot escape their field's stacking context

</td>
</tr>

<tr>
<td width="33%" valign="top">

##### [🧠 Typed Model And Shape](.documentation/user/getting-started.md)

• `DeepPartial` model, `DeepRequired` shape
• A typo in a model key or a rule target fails the build
• Strongly-typed templates and suites

</td>
<td width="33%" valign="top">

##### [🛠️ Extensible](.documentation/user/custom-fields.md)

• `BaseFieldDirective` for a custom field
• `BaseOptionFieldDirective` when it walks an option list
• Custom options, custom option fields, custom validators
• A custom field is decorated, validated and themed like a built-in one

</td>
<td width="33%" valign="top">

##### [🚀 Zero Boilerplate](.documentation/user/getting-started.md)

• One directive on the `<form>`
• Standalone or NgModule, same providers
• No store, no reactive-forms scaffolding
• `ngModel` all the way down

</td>
</tr>
</table>

## When To Pick This Over Angular Material

Material is a design system with a form library in it. This is a form library with no design opinion. That is the whole difference, and it cuts both ways.

| You want                                                              | Pick               |
| :-------------------------------------------------------------------- | :----------------- |
| Fields that look like your brand, themed from CSS variables only      | **ngx-formidable** |
| Vest, zod or a schema validator driving the rules                     | **ngx-formidable** |
| Masking, hints, six label positions and clickable adornments built in | **ngx-formidable** |
| A form library that adds no design system to your bundle              | **ngx-formidable** |
| Material Design, and to look like it                                  | Angular Material   |
| Components beyond forms — tables, dialogs, menus, navigation          | Angular Material   |
| The CDK: overlays, drag and drop, virtual scroll, a11y utilities      | Angular Material   |
| A large ecosystem, many maintainers and a long support horizon        | Angular Material   |

Be honest about the last one: this library is young and has one maintainer. It is a good fit when the form is the product's face and you want it to be yours; it is the wrong fit when you need a whole component suite behind it.

## Installation

The package is published to GitHub Packages under the `@cynthion` scope, so npm needs to be pointed at it. In the `.npmrc` beside your `package.json`:

```ini
@cynthion:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

GitHub Packages authenticates every read, public package or not, so the token needs the `read:packages` scope. Then:

```bash
npm i @cynthion/ngx-formidable date-fns ngx-mask pikaday uuid
```

The library does not validate, so it brings no validation library. Add one only if you want it — `npm i vest` for the validator that ships in `@cynthion/ngx-formidable/vest`, or wire your own.

Full instructions, including what each peer dependency is for: [Getting Started](.documentation/user/getting-started.md).

## Setup

Two paths, registering the same providers.

```ts
// main.ts — standalone
import { provideNgxFormidable } from '@cynthion/ngx-formidable';

bootstrapApplication(AppComponent, {
  providers: [...provideNgxFormidable()]
}).catch(console.error);
```

```ts
// app.module.ts — NgModule
import { NgxFormidableModule } from '@cynthion/ngx-formidable';

@NgModule({
  imports: [BrowserModule, NgxFormidableModule.forRoot()],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

Then the stylesheet, which is imported separately because it is a stylesheet and not a provider:

```scss
// styles.scss
@use '@cynthion/ngx-formidable/styles/ngx-formidable';
```

That is the whole default theme. Redeclare whatever you want to change in your own `:root` afterwards:

```scss
:root {
  --formidable-color-field-border-focus: #0f766e; // rebrand from this one variable
  --formidable-field-height: 50px;
}
```

## Your First Form

Declare the model, the shape and the rules in one `*.form.ts` — this one validates with Vest:

```ts
export interface User {
  name: string;
  birthdate: Date;
}

export type UserFormModel = DeepPartial<User>;
export type UserFormShape = DeepRequired<UserFormModel>;

/** Every key the model may carry, all required — a dev-mode typo check, not a validator. */
export const userFormShape: UserFormShape = { name: '', birthdate: new Date() };

export const userFormSuite = staticSuite((model: UserFormModel, field?: string) => {
  mode(Modes.ALL);
  if (field) only(field); // the form asks about one target at a time

  test('name', 'Name is required.', () => {
    enforce(model.name).isNotBlank();
  });
});
```

Then the template:

```html
<form
  formidableForm
  [formValue]="formValue$ | async"
  [formShape]="formShape"
  [formSuite]="formSuite"
  (formValueChange$)="formValue$.next($event)"
  (validChange$)="isValid$.next($event)"
  (ngSubmit)="onSubmit()">
  <formidable-field-decorator>
    <formidable-input-field
      formidableFieldErrors
      name="name"
      [showRequiredMarker]="true"
      [ngModel]="(formValue$ | async)?.name" />
    <div formidableFieldLabel>Name</div>
    <div formidableFieldHint>As it appears on your passport</div>
  </formidable-field-decorator>

  <formidable-field-decorator>
    <formidable-date-field
      formidableFieldErrors
      name="birthdate"
      [unicodeTokenFormat]="'dd.MM.yyyy'"
      [ngModel]="(formValue$ | async)?.birthdate" />
    <div
      formidableFieldLabel
      [position]="'border'">
      Birthdate
    </div>
  </formidable-field-decorator>

  <button type="submit">Submit</button>
</form>
```

Every rule runs asynchronously, so the form is still `PENDING` when `ngSubmit` fires — gate a submit on `validChange$` rather than reading `form.valid`.

The whole walkthrough, with the component state and where each piece goes: [Getting Started](.documentation/user/getting-started.md).

## What's In The Box

Full API — every input, output, type and token — in the [component catalogue](.documentation/user/components.md).

| Category          | Component                           | Value             |
| :---------------- | :---------------------------------- | :---------------- |
| **Text**          | `<formidable-input-field>`          | `string \| null`  |
|                   | `<formidable-textarea-field>`       | `string \| null`  |
| **Options**       | `<formidable-select-field>`         | `string \| null`  |
|                   | `<formidable-dropdown-field>`       | `string \| null`  |
|                   | `<formidable-autocomplete-field>`   | `string \| null`  |
| **Option Groups** | `<formidable-radio-group-field>`    | `string \| null`  |
|                   | `<formidable-checkbox-group-field>` | `string[]`        |
| **Date & Time**   | `<formidable-date-field>`           | `Date \| null`    |
|                   | `<formidable-time-field>`           | `Date \| null`    |
| **Values**        | `<formidable-toggle-field>`         | `boolean \| null` |
|                   | `<formidable-slider-field>`         | `number \| null`  |
| **Structural**    | `<formidable-field-decorator>`      | —                 |
|                   | `<formidable-field-option>`         | —                 |
|                   | `<formidable-field-errors>`         | —                 |

| Category             | Directive                                                                                                                                                                              |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Form-level**       | `formidableForm`, `formidableValidateWholeForm`, plus the two that attach themselves to `ngModel` and `ngModelGroup`                                                                   |
| **Decoration**       | `formidableFieldLabel`, `formidableFieldLabelAdornment`, `formidableFieldPrefix`, `formidableFieldSuffix`, `formidableFieldHint`, `formidableFieldErrors`, `formidableFieldToggleIcon` |
| **Vest entry point** | `formSuite`, from `@cynthion/ngx-formidable/vest`                                                                                                                                      |

## Documentation

Guides teach a topic; references list what it accepts.

| Guide                                                     | Covers                                                         |
| :-------------------------------------------------------- | :------------------------------------------------------------- |
| [Getting Started](.documentation/user/getting-started.md) | Registry, install, wiring, the stylesheet, a first form        |
| [Fields](.documentation/user/fields.md)                   | Options, panels, keyboard, dates and times, masking, focus     |
| [Decoration](.documentation/user/decoration.md)           | Labels, adornments, prefixes, suffixes, hints, required marker |
| [Validation](.documentation/user/validation.md)           | Targets, timing, Vest, zod, Angular's validators, messages     |
| [Theming](.documentation/user/theming.md)                 | The default theme, what to override, worked examples           |
| [Custom Fields](.documentation/user/custom-fields.md)     | Building a field, an option or a validator of your own         |

| Reference                                                 | Lists                                                  |
| :-------------------------------------------------------- | :----------------------------------------------------- |
| [Components](.documentation/user/components.md)           | Every component, directive, token, type and interface  |
| [Theme Reference](.documentation/user/theme-reference.md) | Every overridable `--formidable-*` custom property     |
| [Theme Options](.documentation/user/theme-options.md)     | The colour palettes and field shapes shown in the demo |

Design notes for maintainers live in [`.documentation/tech/`](.documentation/README.md), and the repo's own conventions in [`.documentation/impl/`](.documentation/README.md).

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Everything in this repository is licensed under the [MIT License](./LICENSE) unless otherwise specified.

Copyright (c) 2026 - present Christian Lüthold
