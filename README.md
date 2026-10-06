<!-- markdownlint-disable no-inline-html -- the centred hero and badges are HTML because npm renders nothing else centred -->
<h1 align="center">ngx-formidable</h1>

<p align="center">
Angular form fields you can actually theme, configure and customize. Validated by whatever you already use.
</p>

<p align="center">
  Created with ❤️ by <a href="https://github.com/Cynthion">Cynthion</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cynthion/ngx-formidable">
    <img src="https://img.shields.io/npm/v/@cynthion/ngx-formidable" alt="npm version">
  </a>
  <a href="https://github.com/Cynthion/ngx-formidable/actions/workflows/deploy.yml">
    <img src="https://github.com/Cynthion/ngx-formidable/actions/workflows/deploy.yml/badge.svg?branch=main" alt="Deploy">
  </a>
  <a href="https://angular.dev">
    <img src="https://img.shields.io/badge/Angular-%5E22-dd0031" alt="Angular ^22">
  </a>
  <a href="https://github.com/Cynthion/ngx-formidable/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
  </a>
  <a href="https://github.com/Cynthion/ngx-formidable">
    <img src="https://img.shields.io/github/stars/Cynthion/ngx-formidable?label=GitHub%20Stars&style=flat" alt="GitHub Stars">
  </a>
</p>

<!-- Absolute URLs: this file is also the npm package's README, where a repository-relative path does not resolve. -->
<p align="center">
  <a href="https://cynthion.github.io/ngx-formidable/">
    <img src="https://raw.githubusercontent.com/Cynthion/ngx-formidable/main/assets/studio.png" alt="A recording of the ngx-formidable Studio: one form repainted from the default theme through Midnight, tabbed through, its labels moved and prefixed, one field opened from its chip, Zod rejecting an email, then the CSS, template and schema it exports.">
  </a>
</p>

<p align="center">
  <a href="https://cynthion.github.io/ngx-formidable/">
    <img src="https://img.shields.io/badge/Open_the_Studio-4f46e5?style=for-the-badge" alt="Open the Studio">
  </a>
</p>

<p align="center">
  Theme it, shape the form, copy the CSS and the Signal Forms component. No install, no account.
</p>
<!-- markdownlint-enable no-inline-html -->

Eleven form fields, one decorator that puts labels, prefixes, suffixes, hints and messages around them, and around two hundred CSS custom properties to make them look like your product instead of like a component library. The fields bind to Signal Forms, reactive forms and template-driven forms alike; the model and the rules stay with your forms API, and the rules can be Angular's own, Vest, Zod, or none at all.

- **[Studio](https://cynthion.github.io/ngx-formidable/)**: a live form of every field. Theme it to your brand, configure the fields, and take away the CSS and the Signal Forms component.
- **[Specimen](https://cynthion.github.io/ngx-formidable/#/specimen)**: every field, one change at a time, covering every state, every label position, every adornment and every panel, under any preset or your own theme.
- **[Docs](https://cynthion.github.io/ngx-formidable/#/docs)**: the guides and references below, rendered in the browser from the same files. [`.documentation/`](https://github.com/Cynthion/ngx-formidable/blob/main/.documentation/README.md) holds them, plus the design notes for maintainers.

## Table Of Contents

- [Features](#features)
- [When To Pick This Over Angular Material](#when-to-pick-this-over-angular-material)
- [Installation](#installation)
- [Setup](#setup)
- [Your First Form](#your-first-form)
- [What's In The Box](#whats-in-the-box)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🧩 **Eleven Fields, One Decorator**: input, textarea, select, dropdown, autocomplete, radio and checkbox group, date, time, toggle, slider. [`<formidable-field-decorator>`](https://cynthion.github.io/ngx-formidable/#/docs/decoration) puts the label, prefixes, suffixes, hints, the required marker and the messages around any of them, in [six label positions](https://cynthion.github.io/ngx-formidable/#/docs/decoration).
- 🔌 **Every Angular Forms API**: [Signal Forms, reactive forms and template-driven forms](https://cynthion.github.io/ngx-formidable/#/docs/forms), through `[formField]`, `[formControl]`, `formControlName` or `ngModel`. No value accessor, no form directive of its own, no store.
- ✅ **Bring Your Own Validator**: [Angular's own rules, Vest or Zod through Standard Schema, or none](https://cynthion.github.io/ngx-formidable/#/docs/validation). The library renders the messages, decides when they appear, and marks what is required.
- 🎨 **Themeable To The Corner**: [~200 CSS custom properties](https://cynthion.github.io/ngx-formidable/#/docs/theme-reference) and no design system in your bundle. Rebrand from one variable; no SCSS hooks, no theme to initialise.
- 🧠 **Typed End To End**: Signal Forms types every `[formField]` path from your model, so a typo in a model key [fails the build](https://cynthion.github.io/ngx-formidable/#/docs/getting-started).
- ⌨️ **Accessible By Default**: [full keyboard handling](https://cynthion.github.io/ngx-formidable/#/docs/fields), managed focus, combobox, listbox, switch and group roles, and messages in an `aria-live` region.
- 🛡️ **Masking, Dates And Panels**: [ngx-mask on text fields](https://cynthion.github.io/ngx-formidable/#/docs/fields), one token string for parsing and formatting a date or time, and panels that flip when there is no room and become a sheet on phones.
- 🛠️ **Extensible**: [`BaseField`](https://cynthion.github.io/ngx-formidable/#/docs/custom-fields) makes a field of your own bind, decorate and theme like a built-in one.
- 🎛️ **[Studio](https://cynthion.github.io/ngx-formidable/)**: build the theme and the form against the real components in the browser, then copy out the CSS and the Signal Forms component, template and schema.

## When To Pick This Over Angular Material

Material is a design system with a form library in it. This is a form library with no design opinion. That is the whole difference, and it cuts both ways.

| You Want                                                              | Pick               |
| :-------------------------------------------------------------------- | :----------------- |
| Fields that look like your brand, themed from CSS variables only      | **ngx-formidable** |
| Masking, hints, six label positions and clickable adornments built in | **ngx-formidable** |
| A form library that adds no design system to your bundle              | **ngx-formidable** |
| Material Design, and to look like it                                  | Angular Material   |
| Components beyond forms: tables, dialogs, menus, navigation           | Angular Material   |
| The CDK: overlays, drag and drop, virtual scroll, a11y utilities      | Angular Material   |
| A large ecosystem, many maintainers and a long support horizon        | Angular Material   |

## Installation

```bash
npm i @cynthion/ngx-formidable date-fns ngx-mask pikaday
```

The library does not validate, so it brings no validation library. Add one only if you want it (`npm i vest` or `npm i zod`), or validate with Angular's own rules and add nothing.

Full instructions, including what each peer dependency is for: [Getting Started](https://cynthion.github.io/ngx-formidable/#/docs/getting-started).

## Setup

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideNgxFormidable } from '@cynthion/ngx-formidable';

export const appConfig: ApplicationConfig = {
  providers: [...provideNgxFormidable()]
};
```

It takes an optional config, including app-wide `defaults` for what every template would otherwise repeat: the label position, the adornment alignment, the panel position, when messages appear and whether required markers show. See [Getting Started](https://cynthion.github.io/ngx-formidable/#/docs/getting-started).

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

Each step below adds one variable, from the library's defaults to the Midnight preset. The [Specimen](https://cynthion.github.io/ngx-formidable/#/specimen) steps through it live.

[![The ngx-formidable fields restyled one CSS variable at a time.](https://raw.githubusercontent.com/Cynthion/ngx-formidable/main/assets/ladder.png)](https://cynthion.github.io/ngx-formidable/#/specimen)

## Your First Form

Declare the model, its initial value and its rules in one `*.form.ts`. This one validates with Angular's own rules:

```ts
// user.form.ts
import { required, schema } from '@angular/forms/signals';

export interface UserModel {
  name: string;
  birthdate: Date | null;
}

export const initialUserModel: UserModel = { name: '', birthdate: null };

export const userSchema = schema<UserModel>((path) => {
  required(path.name, { message: 'Name is required.' });
});
```

The component holds the model and the form over it:

```ts
// user-form.ts
import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { DateField, FieldDecorator, FieldHint, FieldLabel, InputField } from '@cynthion/ngx-formidable';
import { initialUserModel, UserModel, userSchema } from './user.form';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.html',
  imports: [FormRoot, FormField, DateField, FieldDecorator, FieldHint, FieldLabel, InputField]
})
export class UserForm {
  readonly model = signal<UserModel>(initialUserModel);
  readonly form = form(this.model, userSchema);
}
```

Then the template:

```html
<!-- user-form.html -->
<form [formRoot]="form">
  <formidable-field-decorator>
    <formidable-input-field [formField]="form.name" />
    <div formidableFieldLabel>Name</div>
    <div formidableFieldHint>As it appears on your passport</div>
  </formidable-field-decorator>

  <formidable-field-decorator>
    <formidable-date-field
      [unicodeTokenFormat]="'dd.MM.yyyy'"
      [formField]="form.birthdate" />
    <div
      formidableFieldLabel
      [position]="'border'">
      Birthdate
    </div>
  </formidable-field-decorator>
</form>
```

`required()` marks the name required and checks it, and its message appears once the user has left the field. Vest and Zod plug into the same `schema()`, and reactive and template-driven forms bind the same fields: [Validation](https://cynthion.github.io/ngx-formidable/#/docs/validation), [Forms](https://cynthion.github.io/ngx-formidable/#/docs/forms).

The whole walkthrough, with submission and where each piece goes: [Getting Started](https://cynthion.github.io/ngx-formidable/#/docs/getting-started).

## What's In The Box

The full API (every input, output, type and token) is in the [Component Catalogue](https://cynthion.github.io/ngx-formidable/#/docs/components).

| Category          | Component                           | Value            |
| :---------------- | :---------------------------------- | :--------------- |
| **Text**          | `<formidable-input-field>`          | `string`         |
|                   | `<formidable-textarea-field>`       | `string`         |
| **Options**       | `<formidable-select-field>`         | `string \| null` |
|                   | `<formidable-dropdown-field>`       | `string \| null` |
|                   | `<formidable-autocomplete-field>`   | `string \| null` |
| **Option Groups** | `<formidable-radio-group-field>`    | `string \| null` |
|                   | `<formidable-checkbox-group-field>` | `string[]`       |
| **Date & Time**   | `<formidable-date-field>`           | `Date \| null`   |
|                   | `<formidable-time-field>`           | `Date \| null`   |
| **Values**        | `<formidable-toggle-field>`         | `boolean`        |
|                   | `<formidable-slider-field>`         | `number`         |
| **Structural**    | `<formidable-field-decorator>`      |                  |
|                   | `<formidable-field-option>`         |                  |
|                   | `<formidable-field-errors>`         |                  |

| Category          | Directives And Tokens                                                                                                                                         |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Decoration**    | `formidableFieldLabel`, `formidableFieldLabelAdornment`, `formidableFieldPrefix`, `formidableFieldSuffix`, `formidableFieldHint`, `formidableFieldToggleIcon` |
| **Configuration** | `provideNgxFormidable()`, `FORMIDABLE_DEFAULTS`, `FORMIDABLE_ERROR_MESSAGE`                                                                                   |

## Documentation

Guides teach a topic; references list what it accepts.

| Guide                                                                               | Covers                                                                     |
| :---------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| [Getting Started](https://cynthion.github.io/ngx-formidable/#/docs/getting-started) | Install, wiring, the stylesheet, a first form                              |
| [Forms](https://cynthion.github.io/ngx-formidable/#/docs/forms)                     | How the fields meet Signal Forms, reactive forms and template-driven forms |
| [Fields](https://cynthion.github.io/ngx-formidable/#/docs/fields)                   | Options, panels, keyboard, dates and times, masking, focus                 |
| [Decoration](https://cynthion.github.io/ngx-formidable/#/docs/decoration)           | Labels, adornments, prefixes, suffixes, hints, required marker             |
| [Validation](https://cynthion.github.io/ngx-formidable/#/docs/validation)           | Angular's rules, Vest, Zod or none; messages and their reveal              |
| [Theming](https://cynthion.github.io/ngx-formidable/#/docs/theming)                 | The default theme, what to override, worked examples                       |
| [Studio](https://cynthion.github.io/ngx-formidable/#/docs/studio)                   | Building a theme and a form in the browser, and exporting both             |
| [Custom Fields](https://cynthion.github.io/ngx-formidable/#/docs/custom-fields)     | Building a field or an option of your own                                  |

| Reference                                                                           | Lists                                                 |
| :---------------------------------------------------------------------------------- | :---------------------------------------------------- |
| [Components](https://cynthion.github.io/ngx-formidable/#/docs/components)           | Every component, directive, token, type and interface |
| [Theme Reference](https://cynthion.github.io/ngx-formidable/#/docs/theme-reference) | Every overridable `--formidable-*` custom property    |

Design notes for maintainers live in [`.documentation/tech/`](https://github.com/Cynthion/ngx-formidable/blob/main/.documentation/README.md), and the repo's own conventions in [`.documentation/impl/`](https://github.com/Cynthion/ngx-formidable/blob/main/.documentation/README.md).

## Contributing

Contributions are welcome, see [CONTRIBUTING.md](https://github.com/Cynthion/ngx-formidable/blob/main/CONTRIBUTING.md).

## License

Everything in this repository is licensed under the [MIT License](https://github.com/Cynthion/ngx-formidable/blob/main/LICENSE) unless otherwise specified.

In plain English: use it commercially, modify it, ship it inside a closed-source product, sublicense it. Nothing has to be published back. The one condition is that the copyright notice and the license text travel with any copy or substantial portion of the code. It comes with no warranty and no liability.

Every runtime peer dependency is permissive too (MIT, 0BSD or Apache-2.0, no copyleft anywhere), so adding this library puts no obligation on you beyond MIT's own notice.

Copyright (c) 2025 - present Christian Lüthold
