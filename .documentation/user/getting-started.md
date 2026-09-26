# Getting Started

Install the package, wire it once, import the stylesheet, build a form. Every step below is the whole step — there is no further configuration.

The API each symbol carries is in [`user/components.md`](components.md).

## Install

Install the package and its peer dependencies:

```bash
npm i @cynthion/ngx-formidable date-fns ngx-mask pikaday
```

| Peer       | Needed For                                          |
| :--------- | :-------------------------------------------------- |
| `date-fns` | Parsing and formatting the date and time fields     |
| `ngx-mask` | Input masking                                       |
| `pikaday`  | The date field's calendar                           |
| `vest`     | Optional — only for `@cynthion/ngx-formidable/vest` |

Angular's `common`, `core` and `forms`, and `rxjs`, are peers you already have. The floor is the Angular major in the package's `peerDependencies`: the library is published in partial compilation mode, so your app's linker has to be at or above the major it was built with.

`pikaday` ships CommonJS, so a build warns `Module 'pikaday' … is not ESM` until you name it in `angular.json`:

```json
"allowedCommonJsDependencies": ["pikaday"]
```

---

## Wire It

### Standalone

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgxFormidable } from '@cynthion/ngx-formidable';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [...provideNgxFormidable()]
}).catch(console.error);
```

### NgModule

```ts
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxFormidableModule } from '@cynthion/ngx-formidable';
import { AppComponent } from './app.component';

@NgModule({
  imports: [BrowserModule, NgxFormidableModule.forRoot()],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

Both accept a `NgxFormidableConfig`: `globalMaskConfig` (see [`user/fields.md`](fields.md)) and `defaults`, below.

### App-Wide Defaults

`defaults` sets once what every template would otherwise repeat.

```ts
provideNgxFormidable({
  defaults: {
    labelPosition: 'border',
    panelPosition: 'sheet',
    revealOn: 'dirty'
  }
});
```

| Key                   | Defaults                                                            | Library's Own |
| :-------------------- | :------------------------------------------------------------------ | :------------ |
| `labelPosition`       | `formidableFieldLabel`'s `position`                                 | `'inside'`    |
| `prefixAlign`         | `formidableFieldPrefix`'s `align`                                   | `'center'`    |
| `suffixAlign`         | `formidableFieldSuffix`'s `align`                                   | `'center'`    |
| `panelPosition`       | `panelPosition` on the dropdown, autocomplete and date fields       | Per field     |
| `revealOn`            | The form's `revealOn`, and a field's when it has no form            | `'touched'`   |
| `hideRequiredMarkers` | The form's `hideRequiredMarkers`, and a field's when it has no form | `false`       |
| `debounceMs`          | The form's `debounceMs`                                             | `0`           |

- **A Binding Wins.** An input left unset, or bound to `undefined`, takes the app default, then the library's own. Binding `undefined` is how a dynamic template states nothing.
- **Read Once.** A field or form reads its defaults when it is created. A default changed afterwards reaches only what is created afterwards.
- **Scoped By Providing.** Provide `FORMIDABLE_DEFAULTS` in a component's `providers` to give that subtree defaults of its own. They replace the app's, they do not merge with them.

---

## Import The Stylesheet

Styling is a stylesheet, not a provider, so it is imported separately:

```scss
// styles.scss
@use '@cynthion/ngx-formidable/styles/ngx-formidable';
```

That is the whole default theme. To change it, redeclare the variables you want in your own `:root` after the import — see [`user/theming.md`](theming.md).

---

## Build A Form

The library holds the model and renders the fields. Rules come from whatever validator you provide, or from none at all — see [`user/validation.md`](validation.md). The example below uses Vest, whose validator ships in the `@cynthion/ngx-formidable/vest` entry point.

### 1. Declare The Model, The Shape And The Rules

Keep them in one `*.form.ts` per form. The layout is a convention, not a requirement: what the model has to match is **The Model** in [`user/validation.md`](validation.md).

```ts
// user.form.ts
import { DeepPartial, DeepRequired } from '@cynthion/ngx-formidable';
import { create, enforce, Modes, mode, only, Suite, test } from 'vest';

export interface User {
  name: string;
  hobby: 'reading' | 'gaming' | 'swimming';
  birthdate: Date;
}

export type UserFormModel = DeepPartial<User>;
export type UserFormShape = DeepRequired<UserFormModel>;

/** Initial values. Every key the form edits, `undefined` where it starts empty. */
export const initialUserFormModel: UserFormModel = {
  name: undefined,
  hobby: undefined,
  birthdate: undefined
};

/** Every key the model may carry, all required — a dev-mode typo check, not a validator. */
export const userFormShape: UserFormShape = {
  name: '',
  hobby: 'reading',
  birthdate: new Date()
};

export const userFormSuite: Suite<string, string, (model: UserFormModel, field?: string) => void> = create((model: UserFormModel, field?: string) => {
  mode(Modes.ALL); // Vest 6 defaults to `EAGER`, which reports only a field's first failing message
  if (field) only(field); // the form asks about one target at a time

  test('name', 'Name is required.', () => {
    enforce(model.name).isNotBlank();
  });
});
```

### 2. Write The Template

```html
<form
  formidableForm
  [formValue]="formValue$ | async"
  [formShape]="formShape"
  [formSuite]="formSuite"
  (formValueChange)="formValue$.next($event)"
  (validChange)="isValid$.next($event)"
  (errorsChange)="errors$.next($event)"
  (ngSubmit)="onSubmit()">
  <formidable-field-decorator>
    <formidable-input-field
      formidableFieldErrors
      name="name"
      [markRequired]="true"
      [ngModel]="(formValue$ | async)?.name" />
    <div formidableFieldLabel>Name</div>
    <div formidableFieldHint>As it appears on your passport</div>
  </formidable-field-decorator>

  <formidable-field-decorator>
    <formidable-dropdown-field
      formidableFieldErrors
      name="hobby"
      [options]="hobbyOptions"
      [ngModel]="(formValue$ | async)?.hobby" />
    <div
      formidableFieldLabel
      [position]="'inside'">
      Hobby
    </div>
  </formidable-field-decorator>

  <formidable-field-decorator>
    <formidable-date-field
      formidableFieldErrors
      name="birthdate"
      [maxDate]="today"
      [unicodeTokenFormat]="'dd.MM.yyyy'"
      [ngModel]="(formValue$ | async)?.birthdate" />
    <div formidableFieldLabel>Birthdate</div>
  </formidable-field-decorator>

  <button type="submit">Submit</button>
</form>
```

### 3. Hold The State

The form directive reports through observable outputs, so the component keeps subjects and derives from them.

```ts
readonly formShape = userFormShape;
readonly formSuite = userFormSuite;

readonly formValue$ = new BehaviorSubject<UserFormModel>(initialUserFormModel);
readonly isValid$ = new BehaviorSubject<boolean | null>(null);
readonly errors$ = new BehaviorSubject<FormidableFormErrors>({});

readonly hobbyOptions: IFormidableOption[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'swimming', label: 'Swimming' }
];

onSubmit(): void {
  // Every rule runs asynchronously, so the form is still PENDING when ngSubmit fires.
  this.isValid$.pipe(take(1)).subscribe((isValid) => {
    if (isValid) this.save(this.formValue$.value);
  });
}
```

---

## Related

| To Do This                                                | Read                                        |
| :-------------------------------------------------------- | :------------------------------------------ |
| Pick a field, work its keyboard, mask it, place its panel | [`user/fields.md`](fields.md)               |
| Label it, prefix it, hint it, mark it required            | [`user/decoration.md`](decoration.md)       |
| Connect Vest, zod, Angular's validators, or none          | [`user/validation.md`](validation.md)       |
| Repaint and reshape it                                    | [`user/theming.md`](theming.md)             |
| Build a theme in the browser and paste the result back    | [`user/studio.md`](studio.md)               |
| Build a field the library does not have                   | [`user/custom-fields.md`](custom-fields.md) |
| Look up an input, a type or a token                       | [`user/components.md`](components.md)       |
