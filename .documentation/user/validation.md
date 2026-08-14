# Validation

The main `@cynthion/ngx-formidable` package has no validation library in it. It renders fields, themes them, and shows whatever errors it finds on Angular's own `AbstractControl.errors`.
So any validator works, including none:

- Vest (use `@cynthion/ngx-formidable/vest`)
- zod
- Angular's built-in validators
- ...
- your own, see [The Validator Contract](#the-validator-contract)
- none

## Rule Targets

Every rule has a **target** it reports on.

| Target           | Written as                            | Called a            | Reports on |
| :--------------- | :------------------------------------ | :------------------ | :--------- |
| A single control | `'firstName'`, `'passwords.password'` | **field rule**      | that field |
| A nested object  | `'passwords'`                         | **group rule**      | that group |
| The form itself  | `WHOLE_FORM`                          | **whole-form rule** | the form   |

A target is what your validator receives as its second argument, and what `errorsChange$` keys its messages by.

> **"Cross-field" is not a target.** It describes what a rule _reads_. A group rule comparing a password with its confirmation is cross-field; so is a whole-form rule. Where the rule reports is the target; how many fields it reads is up to you.

## The Ways In

| Approach                        | What you write                                             | When to use                                |
| :------------------------------ | :--------------------------------------------------------- | :----------------------------------------- |
| Angular validators              | Nothing — `required`, `minlength` and friends already work | Simple field rules                         |
| A validator                     | One class implementing `IFormidableValidator`              | Group rules, whole-form rules, schemas     |
| `@cynthion/ngx-formidable/vest` | An import — the Vest validator ships with the library      | Vest suites                                |
| Nothing                         | Nothing                                                    | Display-only or externally validated forms |

---

## Angular's Built-In Validators

Nothing to wire. Put the validator on the field and the error renders.

```html
<formidable-field-decorator>
  <formidable-input-field
    formidableFieldErrors
    name="name"
    [required]="true"
    [minlength]="3"
    [(ngModel)]="name" />
  <div formidableFieldLabel>Name</div>
</formidable-field-decorator>
```

`required` writes `{ required: true }`. `FORMIDABLE_ERROR_EXTRACTOR` falls back to the error keys when there is no message array, so the field displays `required`. Pair it with `FORMIDABLE_ERROR_TRANSLATOR` to turn those keys into real sentences — see [Messages](#messages).

### The Required Marker

The `*` beside a label (configurable with `--formidable-label-required-marker`) is a separate concern from validating, and has its own input:

| Input                 | On       | Does                                              |
| :-------------------- | :------- | :------------------------------------------------ |
| `showRequiredMarker`  | a field  | Suffixes the marker to that field's label         |
| `showRequiredMarkers` | `<form>` | Withholds the marker from every field on the form |

Both are presentational and register no validator.
`showRequiredMarker` also sets `aria-required`; the form-level switch hides the glyph only.

---

## The Validator Contract

Everything else goes through one interface. `NgxFormidableFormDirective` owns the model, the targets and the debouncing; your validator owns the rules.

```ts
export interface IFormidableValidator<T = Record<string, unknown>> {
  /** Runs the rules for one target against the whole model. `null` means valid. */
  validate(model: T, target: string): Observable<string[] | null>;
}
```

Provide it as `FORMIDABLE_VALIDATOR` on the `<form>`. The form directive picks it up and calls it once per target, with the current model and the changed value already patched in.

A directive on the form is the idiomatic way to supply one, because it can take the rules as an input:

```ts
@Directive({
  selector: 'form[mySchema]',
  standalone: true,
  providers: [{ provide: FORMIDABLE_VALIDATOR, useExisting: MySchemaValidatorDirective }]
})
export class MySchemaValidatorDirective<T extends Record<string, unknown>> implements IFormidableValidator<T> {
  public readonly mySchema = input.required<MySchema<T>>();

  public validate(model: T, target: string): Observable<string[] | null> {
    return of(this.mySchema().messagesFor(model, target) ?? null);
  }
}
```

Without a `FORMIDABLE_VALIDATOR` the form directive still reports value, dirty and validity, but it never validates.

---

## Vest

Ships with the library as a second entry point, so `vest` is an optional peer dependency you only install if you use it.

```bash
npm i vest
npm i @cynthion/ngx-formidable/vest
```

```ts
import { NgxFormidableVestValidatorDirective } from '@cynthion/ngx-formidable/vest';

@Component({
  imports: [/* … */ NgxFormidableFormDirective, NgxFormidableVestValidatorDirective]
})
```

```html
<form
  formidableForm
  formidableValidateWholeForm
  [formValue]="formValue$ | async"
  [formShape]="formShape"
  [formSuite]="formSuite"
  [debounceMs]="0"
  (formValueChange$)="formValue$.next($event)"
  (validChange$)="isValid$.next($event)"
  (dirtyChange$)="isDirty$.next($event)"
  (errorsChange$)="errors$.next($event)"
  (ngSubmit)="onSubmit()">
  <!-- fields -->
</form>
```

### The Convention

One `*.form.ts` per form holds everything about it — model, shape, field names, suite and an equality function:

```ts
export interface AppointmentPage {
  chosenDate: Date | null;
  details: string;
}

export const APPOINTMENT_PAGE_FORM_FIELD_NAMES = {
  chosenDate: 'chosenDate',
  details: 'details'
} as const;

export type AppointmentPageFormModel = DeepPartial<AppointmentPage>;
export type AppointmentPageFormShape = DeepRequired<AppointmentPageFormModel>;

/** Every key the model can carry, so a typo in a target or a model key fails the build. */
export const appointmentPageFormShape: AppointmentPageFormShape = {
  chosenDate: new Date(),
  details: ''
};

export const appointmentPageFormSuite: StaticSuite<string, string, (model: AppointmentPageFormModel, field?: string) => void> = staticSuite((model: AppointmentPageFormModel, field?: string) => {
  mode(Modes.ALL); // Modes.EAGER reports only the first failure per target

  if (field) {
    only(field); // one target is validated at a time — without this the suite runs every rule
  }

  test(APPOINTMENT_PAGE_FORM_FIELD_NAMES.details, 'view.appointment.form.details.required', () => {
    enforce(model[APPOINTMENT_PAGE_FORM_FIELD_NAMES.details]).isNotBlank();
  });
});
```

Notes on the pieces:

- **`only(field)`** is required. The form directive asks the suite about one target at a time, and `only` is what keeps a run from reporting every other target too.
- **`FIELD_NAMES`** keeps the target, the control `name` and the model key from drifting apart.
- **`formShape`** is a dev-mode typo check, not a validator. It has no runtime cost in production.
- **Messages are translation keys**, resolved by `FORMIDABLE_ERROR_TRANSLATOR`.
- **Group rules** target the group (`test('passwords', …)`), usually inside `omitWhen`. Pair them with `dependentFields` so changing one member re-runs the rule:
  ```ts
  dependentFields = { 'passwords.password': ['passwords.confirmPassword'] };
  ```
- **Whole-form rules** use `test(WHOLE_FORM, …)` and need `formidableValidateWholeForm` on the `<form>`.
- **`debounceMs`** sits on the `<form>` and governs every target on it.

The form component exposes the form directive's outputs as subjects and derives from them:

```ts
readonly isDirty$ = new BehaviorSubject<boolean | null>(null);
readonly isValid$ = new BehaviorSubject<boolean | null>(null);
readonly errors$ = new BehaviorSubject<FormidableFormErrors>({});
readonly formValue$ = new BehaviorSubject<FormModel>(this.formModel);

readonly isSubmitDisabled$ = combineLatest([this.isValid$, this.hasChanges$]).pipe(
  map(([isValid, hasChanges]) => !(!!isValid && hasChanges))
);
```

---

## Zod

Not shipped. But it is the same shape, and the library is built so this is all it takes:

```ts
@Directive({
  selector: 'form[formSchema]',
  standalone: true,
  providers: [{ provide: FORMIDABLE_VALIDATOR, useExisting: ZodValidatorDirective }]
})
export class ZodValidatorDirective<T extends Record<string, unknown>> implements IFormidableValidator<T> {
  public readonly formSchema = input<ZodType<T> | null>(null);

  public validate(model: T, target: string): Observable<string[] | null> {
    const schema = this.formSchema();

    if (!schema) {
      return of(null);
    }

    const result = schema.safeParse(model);

    if (result.success) {
      return of(null);
    }

    const messages = result.error.issues.filter((issue) => issue.path.join('.') === target).map((issue) => issue.message);

    return of(messages.length ? messages : null);
  }
}
```

---

## No Validation

Omit `FORMIDABLE_VALIDATOR` and use no Angular validators. Fields render, theme, mask and emit values; nothing ever goes invalid. `formidableFieldErrors` is still safe to leave on. It renders an empty error line, which keeps the layout from shifting if you add rules later.

---

## Messages

Two tokens sit between `control.errors` and the text on screen.

| Token                         | Signature                                        | Default                                        |
| :---------------------------- | :----------------------------------------------- | :--------------------------------------------- |
| `FORMIDABLE_ERROR_EXTRACTOR`  | `(errors: ValidationErrors \| null) => string[]` | `errors['errors']`, else `Object.keys(errors)` |
| `FORMIDABLE_ERROR_TRANSLATOR` | `(error: string) => string`                      | identity                                       |

**Extractor**: Override it when your validator writes a shape neither the form directive nor Angular uses. It also normalises `errorsChange$`, so a form mixing validators still reports one homogeneous `FormidableFormErrors` map:

```ts
{ provide: FORMIDABLE_ERROR_EXTRACTOR, useValue: (e) => (e?.['issues'] as Issue[])?.map((i) => i.message) ?? [] }
```

**Translator**: Override it to resolve messages through `i18n`:

```ts
{
  provide: FORMIDABLE_ERROR_TRANSLATOR,
  useFactory: (ts: TranslationService) => (key: string) => ts.translate(key),
  deps: [TranslationService]
}
```

Errors only display once the control is `touched`. Submitting marks every control touched, so a submit reveals the whole form's errors at once.
