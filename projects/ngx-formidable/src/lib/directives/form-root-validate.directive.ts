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
 * Attaches a root-level async validator to an Angular `<form>` to run Vest tests
 * on composite or cross-field rules bound to the `ROOT_FORM` key. This is useful for validating
 * complex forms with interdependent fields.
 *
 * When `[formidableValidateRootForm]="true"` is set,
 * this directive registers itself in `NG_ASYNC_VALIDATORS` and will:
 * 1. Listen to form value changes
 * 2. Debounce per `validationOptions.debounceValidationInMs`
 * 3. Invoke your Vest suite with `fieldPath = ROOT_FORM`
 * 4. Emit any root-level errors under `control.errors['errors']`
 *
 * Inputs:
 * - `@Input() formidableValidateRootForm: boolean`
 *   Enable or disable root-level validation. Defaults to `false`.
 *
 * - `@Input() formValue: T | null`
 *   The current model of your entire form.
 *
 * - `@Input() suite: StaticSuite<string, string, (model: T, field: string) => void> | null`
 *   Your Vest `staticSuite` containing `test(ROOT_FORM, ...)` rules.
 *
 * - `@Input() validationOptions: FormValidationOptions`
 *   Debounce settings for cross-field async validation.
 *
 * @example
 * ```html
 * <form
 *   formidableForm
 *   formidableValidateRootForm
 *   [formValue]="user$ | async"
 *   [suite]="userSuite"
 *   [validationOptions]="{ debounceValidationInMs: 0 }"
 *   (errorsChange$)="errors = $event"
 * >
 *   <!-- form fields here -->
 * </form>
 * ```
 */
@Directive({
  selector: 'form[formidableRootValidate][formValue][suite]',
  standalone: true,
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
   * This will use the field ROOT_FORM.
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
