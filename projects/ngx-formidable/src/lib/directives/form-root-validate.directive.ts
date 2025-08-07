import { Directive, input, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  AsyncValidator,
  AsyncValidatorFn,
  NG_ASYNC_VALIDATORS,
  ValidationErrors
} from '@angular/forms';
import { debounceTime, Observable, of, ReplaySubject, Subject, switchMap, take, takeUntil } from 'rxjs';
import { StaticSuite } from 'vest';
import { set } from '../helpers/form.helpers';
import { cloneDeep } from '../helpers/utility.helpers';
import { FormValidationOptions, ROOT_FORM } from '../models/formidable.model';

/**
Source: https://github.dev/simplifiedcourses/ngx-vest-forms
When we want to validate multiple fields that are depending on each other,
it is a best practice to wrap them in a parent form group.
If `password`  and `confirmPassword` have to be equal, the validation should not happen on
`password` nor on `confirmPassword`, it should happen on `passwords`:

```typescript
const form = {
  // validation happens here
  passwords: {
    password: '',
    confirmPassword: ''
  }
};
```

Sometimes we don't have the ability to create a form group for 2 depending fields, or sometimes we just
want to create validation rules on portions of the form. For that we can use `validateRootForm`.
Use the `errorsChange` output to keep the errors as state in a signal that we can use in the template
wherever we want.

```html
{{ errors()?.['rootForm'] }} <!-- render the errors on the rootForm -->
{{ errors() }} <!-- render all the errors -->
<form formidableForm
      [formValue]="formValue()"
      [validateRootForm]="true"
      [formShape]="shape"
      [suite]="suite"
      (errorsChange)="errors.set($event)"
      ...>
</form>
```

```typescript
export class MyFormComponent {
  protected readonly formValue = signal<MyFormModel>({});
  protected readonly suite = myFormModelSuite;
  // Keep the errors in state
  protected readonly errors = signal<Record<string, string>>({ });
}
```

When setting the `[validateRootForm]` directive to true, the form will
also create an ngValidator on root level, that listens to the ROOT_FORM field.

To make this work we need to use the field in the Vest suite like this:

```typescript
test(ROOT_FORM, 'Brecht is not 30 anymore', () => {
  enforce(
    model.firstName === 'Brecht' &&
    model.lastName === 'Billiet' &&
    model.age === 30).isFalsy();
});
```
 */
@Directive({
  selector: 'form[formidableRootValidate][formValue][suite]',
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: FormRootValidateDirective,
      multi: true
    }
  ]
})
export class FormRootValidateDirective<T> implements AsyncValidator, OnDestroy {
  public validationOptions = input<FormValidationOptions>({ debounceValidationInMs: 0 });

  private readonly destroy$ = new Subject<void>();

  public readonly formValue = input<T | null>(null);
  public readonly suite = input<StaticSuite<string, string, (model: T, field: string) => void> | null>(null);

  /**
   * Whether the root form should be validated or not
   * This will use the field rootForm
   */
  public readonly formidableValidateRootForm = input(false);

  // Used to debounce formValues to make sure the validation suite is not triggered all the time.
  private readonly formValueCache: Record<
    string,
    Partial<{
      sub$: ReplaySubject<unknown>;
      debounced$: Observable<unknown>;
    }>
  > = {};

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Feeds the formValueCache, debounces it until the next tick
   * and creates an asynchronous validator which runs a validation suite.
   */
  public createAsyncValidator(fieldPath: string, validationOptions: FormValidationOptions): AsyncValidatorFn {
    if (!this.suite()) {
      return () => of(null);
    }

    return (value: unknown) => {
      if (!this.formValue()) {
        return of(null);
      }

      const mod = cloneDeep(value as T);

      // update the property at the correct path
      set(mod as object, fieldPath, value);

      if (!this.formValueCache[fieldPath]) {
        this.formValueCache[fieldPath] = {
          // keep track of the last model
          sub$: new ReplaySubject(1)
        };

        this.formValueCache[fieldPath].debounced$ = this.formValueCache[fieldPath].sub$!.pipe(
          debounceTime(validationOptions.debounceValidationInMs)
        );
      }

      // Provide the latest model to the cache.
      this.formValueCache[fieldPath].sub$!.next(mod);

      // When debounced, take the latest value and perform the asynchronous validation.
      return this.formValueCache[fieldPath].debounced$!.pipe(
        take(1),
        switchMap(() => {
          return new Observable((observer) => {
            this.suite()!(mod, fieldPath).done((result) => {
              const errors = result.getErrors()[fieldPath];

              observer.next(errors ? { error: errors[0], errors } : null);
              observer.complete();
            });
          }) as Observable<ValidationErrors | null>;
        }),
        takeUntil(this.destroy$)
      );
    };
  }

  public validate(control: AbstractControl<unknown, unknown>): Observable<ValidationErrors | null> {
    if (!this.suite() || !this.formValue()) {
      return of(null);
    }

    return this.createAsyncValidator(
      ROOT_FORM,
      this.validationOptions()
    )(control.getRawValue()) as Observable<ValidationErrors | null>;
  }
}
