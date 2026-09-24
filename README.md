<h1 align="center">ngx-formidable</h1>

<p align="center">
Angular form fields you can actually theme, configure and customize. Validated by whatever you already use.
</p>

<p align="center">
  Created with ❤️ by <a href="https://github.com/Cynthion">Cynthion</a>
</p>

<p align="center">
  <a href="https://github.com/Cynthion/ngx-formidable/actions/workflows/deploy.yml">
    <img src="https://github.com/Cynthion/ngx-formidable/actions/workflows/deploy.yml/badge.svg?branch=main" alt="Deploy">
  </a>
  <a href="https://cynthion.github.io/ngx-formidable/">
    <img src="https://img.shields.io/badge/studio-live-4f46e5" alt="Live Studio">
  </a>
  <a href="https://angular.dev">
    <img src="https://img.shields.io/badge/Angular-%5E22-dd0031" alt="Angular ^22">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
  </a>
  <a href="https://github.com/Cynthion/ngx-formidable">
    <img src="https://img.shields.io/github/stars/Cynthion/ngx-formidable?label=GitHub%20Stars&style=flat" alt="GitHub Stars">
  </a>
</p>

Eleven form fields, one decorator that puts labels, prefixes, hints and errors around them, and around two hundred CSS custom properties to make them look like your product instead of like a component library. It holds the model and renders the fields; the rules come from Vest, zod, Angular's own validators, or nothing at all.

- **[Studio](https://cynthion.github.io/ngx-formidable/)** — a live form of every field. Theme it to your brand, configure the fields, and take away the CSS and the Angular template.
- **[Docs](https://cynthion.github.io/ngx-formidable/#/docs)** — the guides and references below, rendered in the browser from the same files. [`.documentation/`](./.documentation/README.md) holds them, plus the design notes for maintainers.

## Table of Contents

- [Table of Contents](#table-of-contents)
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

- 🧩 **Eleven fields, one decorator** — input, textarea, select, dropdown, autocomplete, radio and checkbox group, date, time, toggle, slider. [`<formidable-field-decorator>`](.documentation/user/decoration.md) puts the label, prefixes, suffixes, hints and errors around any of them, in [six label positions](.documentation/user/decoration.md).
- ✅ **Bring your own validator** — [Vest, zod, Angular's own, or none](.documentation/user/validation.md). Field, group and whole-form rules, with when a rule _runs_ and when it _reveals_ set separately.
- 🎨 **Themeable to the corner** — [~200 CSS custom properties](.documentation/user/theme-reference.md) and no design system in your bundle. Rebrand from one variable; no SCSS hooks, no theme to initialise.
- 🚀 **Template-driven, no boilerplate** — one directive on the `<form>`, `ngModel` all the way down. No store, no reactive-forms scaffolding, [standalone or NgModule](.documentation/user/getting-started.md).
- 🧠 **Typed end to end** — a `DeepPartial` model and a `DeepRequired` shape, so a typo in a model key or a rule target [fails the build](.documentation/user/getting-started.md).
- ⌨️ **Accessible by default** — [full keyboard handling](.documentation/user/fields.md), managed focus, combobox, listbox, switch and group roles, and errors in an `aria-live` region.
- 🛡️ **Masking, dates and panels** — [ngx-mask on text fields](.documentation/user/fields.md), one token string for parsing and formatting a date or time, and panels that flip when there is no room and become a sheet on phones.
- 🛠️ **Extensible** — [`BaseFieldDirective`](.documentation/user/custom-fields.md) makes a field of your own decorated, validated and themed like a built-in one.
- 🎛️ **[Studio](https://cynthion.github.io/ngx-formidable/)** — build the theme and the form against the real components in the browser, then copy out the CSS and the Angular template.

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

## Installation

The package is published to GitHub Packages under the `@cynthion` scope, so npm needs to be pointed at it. In the `.npmrc` beside your `package.json`:

```ini
@cynthion:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

GitHub Packages authenticates every read, public package or not, so the token needs the `read:packages` scope. Then:

```bash
npm i @cynthion/ngx-formidable date-fns ngx-mask pikaday
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

Both take an optional config, including app-wide `defaults` for what every template would otherwise repeat: the label position, the adornment alignment, the panel position and the form's reveal, required-marker and debounce settings. See [Getting Started](.documentation/user/getting-started.md).

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

export const userFormSuite = create((model: UserFormModel, field?: string) => {
  mode(Modes.ALL); // Vest 6 defaults to `EAGER`, which reports only a field's first failing message
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
  (formValueChange)="formValue$.next($event)"
  (validChange)="isValid$.next($event)"
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

Every rule runs asynchronously, so the form is still `PENDING` when `ngSubmit` fires — gate a submit on `validChange` rather than reading `form.valid`.

The whole walkthrough, with the component state and where each piece goes: [Getting Started](.documentation/user/getting-started.md).

## What's In The Box

Full API — every input, output, type and token — in the [Component Catalogue](.documentation/user/components.md).

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
| **Form-Level**       | `formidableForm`, `formidableValidateWholeForm`, plus the two that attach themselves to `ngModel` and `ngModelGroup`                                                                   |
| **Decoration**       | `formidableFieldLabel`, `formidableFieldLabelAdornment`, `formidableFieldPrefix`, `formidableFieldSuffix`, `formidableFieldHint`, `formidableFieldErrors`, `formidableFieldToggleIcon` |
| **Vest Entry Point** | `formSuite`, from `@cynthion/ngx-formidable/vest`                                                                                                                                      |

## Documentation

Guides teach a topic; references list what it accepts.

| Guide                                                     | Covers                                                         |
| :-------------------------------------------------------- | :------------------------------------------------------------- |
| [Getting Started](.documentation/user/getting-started.md) | Registry, install, wiring, the stylesheet, a first form        |
| [Fields](.documentation/user/fields.md)                   | Options, panels, keyboard, dates and times, masking, focus     |
| [Decoration](.documentation/user/decoration.md)           | Labels, adornments, prefixes, suffixes, hints, required marker |
| [Validation](.documentation/user/validation.md)           | Targets, timing, conditional fields, Vest, zod, messages       |
| [Theming](.documentation/user/theming.md)                 | The default theme, what to override, worked examples           |
| [Studio](.documentation/user/studio.md)                   | Building a theme and a form in the browser, and exporting both |
| [Custom Fields](.documentation/user/custom-fields.md)     | Building a field, an option or a validator of your own         |

| Reference                                                 | Lists                                                 |
| :-------------------------------------------------------- | :---------------------------------------------------- |
| [Components](.documentation/user/components.md)           | Every component, directive, token, type and interface |
| [Theme Reference](.documentation/user/theme-reference.md) | Every overridable `--formidable-*` custom property    |

Design notes for maintainers live in [`.documentation/tech/`](.documentation/README.md), and the repo's own conventions in [`.documentation/impl/`](.documentation/README.md).

## Contributing

Contributions are welcome, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Everything in this repository is licensed under the [MIT License](./LICENSE) unless otherwise specified.

In plain English: use it commercially, modify it, ship it inside a closed-source product, sublicense it — nothing has to be published back. The one condition is that the copyright notice and the license text travel with any copy or substantial portion of the code. It comes with no warranty and no liability.

Every runtime peer dependency is permissive too — MIT, 0BSD or Apache-2.0, no copyleft anywhere — so adding this library puts no obligation on you beyond MIT's own notice.

Copyright (c) 2025 - present Christian Lüthold
