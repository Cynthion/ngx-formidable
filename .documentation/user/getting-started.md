# Getting Started

Install the package, provide it, import the stylesheet, and build a form with Signal Forms and Angular's rules. Every step below is the whole step.

The API each symbol carries is in [Components](components.md). How the fields meet reactive and template-driven forms is in [Forms](forms.md).

## Install

Install the package and its peer dependencies:

```bash
npm i @cynthion/ngx-formidable date-fns ngx-mask pikaday
```

| Peer       | Needed For                                      |
| :--------- | :---------------------------------------------- |
| `date-fns` | Parsing and formatting the date and time fields |
| `ngx-mask` | Input masking                                   |
| `pikaday`  | The date field's calendar                       |

Angular's `common`, `core` and `forms`, and `rxjs`, are peers you already have. The package is published in partial compilation mode, so your app's own compiler links it, under any Angular version its `peerDependencies` accept.

No validation library is a peer. Install `vest` or `zod` only to validate with one, see [Validation](validation.md).

`pikaday` ships CommonJS, so a build warns `Module 'pikaday' … is not ESM` until you name it in `angular.json`:

```json
"allowedCommonJsDependencies": ["pikaday"]
```

---

## Provide It

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideNgxFormidable } from '@cynthion/ngx-formidable';

export const appConfig: ApplicationConfig = {
  providers: [...provideNgxFormidable()]
};
```

An NgModule app lists the same call in its root module's `providers`. It takes an optional `NgxFormidableConfig`: `globalMaskConfig`, the app-wide ngx-mask settings described in [Fields](fields.md), and `defaults`, below.

### App-Wide Defaults

`defaults` sets once what every template would otherwise repeat:

```ts
provideNgxFormidable({
  defaults: {
    labelPosition: 'border',
    panelPosition: 'sheet',
    revealOn: 'dirty'
  }
});
```

| Key                   | Default For                                                   | Library's Own |
| :-------------------- | :------------------------------------------------------------ | :------------ |
| `labelPosition`       | `formidableFieldLabel`'s `position`                           | `'inside'`    |
| `prefixAlign`         | `formidableFieldPrefix`'s `align`                             | `'center'`    |
| `suffixAlign`         | `formidableFieldSuffix`'s `align`                             | `'center'`    |
| `panelPosition`       | `panelPosition` on the dropdown, autocomplete and date fields | Per field     |
| `revealOn`            | Every field's `revealOn`                                      | `'touched'`   |
| `hideRequiredMarkers` | Whether every field hides its required marker                 | `false`       |

- **A Binding Wins**: an input left unset, or bound to `undefined`, takes the app default, then the library's own. Binding `undefined` is how a dynamic template states nothing.
- **Read Once**: a field reads its defaults when it is created. A default changed afterwards reaches only the fields created afterwards.
- **Scoped By Providing**: provide `FORMIDABLE_DEFAULTS` in a component's `providers` to give the fields it renders defaults of their own. Given as a value, they replace the app's. To change one and keep the rest, spread the app's:

```ts
providers: [
  {
    provide: FORMIDABLE_DEFAULTS,
    useFactory: () => ({ ...inject(FORMIDABLE_DEFAULTS, { skipSelf: true }), revealOn: 'always' })
  }
];
```

---

## Import The Stylesheet

Styling is a stylesheet, not a provider, so it is imported separately:

```scss
// styles.scss
@use '@cynthion/ngx-formidable/styles/ngx-formidable';
```

That is the whole default theme. To change it, redeclare the variables you want in your own `:root` after the import, see [Theming](theming.md).

---

## Build A Form

The forms API holds the model and its rules; the library renders the fields around them. The form below is Signal Forms with Angular's own rules, the layout the Studio exports. [Validation](validation.md) swaps the rules for Vest or Zod, and [Forms](forms.md) binds the same fields through reactive or template-driven forms.

### 1. Declare The Model And Its Rules

One `*.form.ts` per form holds the model's type, its initial model and its `schema()`:

```ts
// user.form.ts
import { required, schema } from '@angular/forms/signals';

export interface UserFormModel {
  name: string;
  hobby: string | null;
  birthdate: Date | null;
}

/** Every key defined: Signal Forms binds a field only to a key its model holds. */
export const initialUserFormModel: UserFormModel = {
  name: '',
  hobby: null,
  birthdate: null
};

export const userSchema = schema<UserFormModel>((path) => {
  required(path.name, { message: 'Name is required.' });
  required(path.birthdate, { message: 'When were you born?' });
});
```

Each field writes one value type into the model: `string` for the text fields, `string | null` for the single-choice fields, `Date | null` for a date. The whole list is in **The Model** in [Forms](forms.md).

### 2. Hold The Form

The component holds the model as a `signal`, and the form over it:

```ts
// user-form.ts
import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { DateField, DropdownField, FieldDecorator, FieldHint, FieldLabel, FormidableOption, InputField } from '@cynthion/ngx-formidable';
import { initialUserFormModel, UserFormModel, userSchema } from './user.form';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.html',
  imports: [FormRoot, FormField, DateField, DropdownField, FieldDecorator, FieldHint, FieldLabel, InputField]
})
export class UserForm {
  readonly model = signal<UserFormModel>(initialUserFormModel);
  readonly form = form(this.model, userSchema, {
    submission: { action: async () => this.save(this.model()) }
  });

  readonly today = new Date();

  readonly hobbyOptions: FormidableOption[] = [
    { value: 'reading', label: 'Reading' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'swimming', label: 'Swimming' }
  ];

  private async save(user: UserFormModel): Promise<void> {
    await fetch('/api/users', { method: 'POST', body: JSON.stringify(user) });
  }
}
```

### 3. Write The Template

Every field is bound by `[formField]` and wrapped in a decorator, which renders its label, its hint, its required marker and its messages:

```html
<!-- user-form.html -->
<form [formRoot]="form">
  <formidable-field-decorator>
    <formidable-input-field [formField]="form.name" />
    <div formidableFieldLabel>Name</div>
    <div formidableFieldHint>As it appears on your passport</div>
  </formidable-field-decorator>

  <formidable-field-decorator>
    <formidable-dropdown-field
      [options]="hobbyOptions"
      [formField]="form.hobby" />
    <div formidableFieldLabel>Hobby</div>
  </formidable-field-decorator>

  <formidable-field-decorator>
    <formidable-date-field
      [maxDate]="today"
      [unicodeTokenFormat]="'dd.MM.yyyy'"
      [formField]="form.birthdate" />
    <div formidableFieldLabel>Birthdate</div>
  </formidable-field-decorator>

  <button type="submit">Submit</button>
</form>
```

- **The Rules Mark The Fields**: `required()` is what marks Name and Birthdate required. Nothing in the template states it, and nothing may: Signal Forms owns a field's `required`, `readonly`, `disabled` and limits.
- **Messages Wait For The User**: a field's messages appear once the user has left it, `touched` being the default reveal.
- **A Submit Reveals Everything**: `[formRoot]` submits the form, which touches every field, and runs the `action` unless the form is invalid.

---

## Related

| To Do This                                                 | Read                              |
| :--------------------------------------------------------- | :-------------------------------- |
| Bind the fields through reactive or template-driven forms  | [Forms](forms.md)                 |
| Validate with Vest, Zod, Angular's rules or none           | [Validation](validation.md)       |
| Decide when the submit button can be pressed               | [Submit Gates](submit-gates.md)   |
| Pick a field, work its keyboard, mask it, place its panel  | [Fields](fields.md)               |
| Label it, prefix it, hint it, mark it required             | [Decoration](decoration.md)       |
| Repaint and reshape it                                     | [Theming](theming.md)             |
| Build a theme and a form in the browser and take both away | [Studio](studio.md)               |
| Build a field the library does not have                    | [Custom Fields](custom-fields.md) |
| Look up an input, a type or a token                        | [Components](components.md)       |
