# Getting Started

Install the package, provide it, import the stylesheet, and build a form with Signal Forms and Angular's own rules.

1. [Install](#install) the package and its peer dependencies.
2. [Provide the library](#provide-the-library) in the app config.
3. [Import the stylesheet](#import-the-stylesheet).
4. [Build a form](#build-a-form).

The API each symbol carries is in [Components](components.md). How the fields meet reactive and template-driven forms is in [Forms](forms.md).

## Install

1. Install the package and its peer dependencies:

   ```bash
   npm i @cynthion/ngx-formidable date-fns ngx-mask pikaday
   ```

2. Name `pikaday` in `angular.json`, because it ships CommonJS and the build otherwise warns `Module 'pikaday' … is not ESM`:

   ```json
   "allowedCommonJsDependencies": ["pikaday"]
   ```

The package and its peers are installed, and the build is clean.

| Peer                                                 | Needed For                                      |
| :--------------------------------------------------- | :---------------------------------------------- |
| [`date-fns`](https://date-fns.org)                   | Parsing and formatting the date and time fields |
| [`ngx-mask`](https://github.com/JsDaddy/ngx-mask)    | Input masking                                   |
| [`pikaday`](https://github.com/Pikaday/Pikaday)      | The date field's calendar                       |

Angular's `common`, `core` and `forms`, and `rxjs`, are peers every Angular app already has. The package is published in partial compilation mode, so the app's own compiler links it, under any Angular version its `peerDependencies` accept.

No validation library is a peer. `vest` or `zod` is installed only to validate with one, see [Validation](validation.md).

---

## Provide The Library

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideNgxFormidable } from '@cynthion/ngx-formidable';

export const appConfig: ApplicationConfig = {
  providers: [...provideNgxFormidable()]
};
```

An NgModule app lists the same call in its root module's `providers`. It takes an optional `NgxFormidableConfig` with three keys:

| Key                | Sets                                                              |
| :----------------- | :---------------------------------------------------------------- |
| `globalMaskConfig` | The app-wide ngx-mask settings, see **Masking** in [Fields](fields.md) |
| `icons`            | The app-wide icons, see **Icons** in [Fields](fields.md)         |
| `defaults`         | The app-wide defaults, see [App-Wide Defaults](#app-wide-defaults) |

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
- **Scoped By Providing**: `FORMIDABLE_DEFAULTS` in a component's `providers` gives the fields it renders defaults of their own. Given as a value, they replace the app's. A factory that spreads the app's defaults changes one and keeps the rest:

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

That import is the whole default theme. A theme redeclares variables in the app's own `:root` after the import, see [Theming](theming.md).

---

## Build A Form

The forms API holds the model and its rules; the library renders the fields around them. The form is Signal Forms with Angular's own rules, in the layout the Studio exports. [Validation](validation.md) swaps the rules for Vest or Zod, and [Forms](forms.md) binds the same fields through reactive or template-driven forms.

1. Declare the model and its rules in one `*.form.ts` per form, holding the model's type, its initial model and its `schema()`:

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

2. Hold the model as a `signal` in the component, and the form over it:

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

3. Write the template. Every field is bound by `[formField]` and wrapped in a decorator, which renders its label, its hint, its required marker and its messages:

   ```html
   <!-- user-form.html -->
   <form [formRoot]="form">
     <formidable-field-decorator>
       <formidable-input-field [formField]="form.name" />
       <div formidableFieldLabel>Name</div>
       <div formidableFieldHint>As it appears on the passport</div>
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

The form renders three decorated fields, marks Name and Birthdate required, and submits through `[formRoot]`.

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
