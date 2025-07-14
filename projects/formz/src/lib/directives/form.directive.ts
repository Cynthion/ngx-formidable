import { Directive, inject, input, OnDestroy, Output } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  AsyncValidatorFn,
  FormControlStatus,
  NgForm,
  PristineChangeEvent,
  StatusChangeEvent,
  ValidationErrors,
  ValueChangeEvent
} from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  ReplaySubject,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  zip
} from 'rxjs';
import { StaticSuite } from 'vest';
import { validateFormShape } from '../form-validate.helpers';
import { getAllFormErrors, mergeValuesAndRawValues, set } from '../form.helpers';
import { FormValidationOptions } from '../formz.model';
import { DeepRequired } from '../utility-types';
import { cloneDeep } from '../utility.helpers';

/**
 * Holds the formValue, the validation suite and some handy outputs.
 * Source: https://github.dev/simplifiedcourses/ngx-vest-forms
 */
@Directive({
  selector: 'form[formzForm]'
})
export class FormDirective<T extends Record<string, unknown>> implements OnDestroy {
  public readonly ngForm = inject(NgForm, { self: true, optional: false });

  /**
   * The value of the form, needed for the validation part.
   */
  public readonly formValue = input<T | null>(null);

  /**
   * Represents the shape of the FormModel.
   * It's a deep-required version of the FormModel so that typing/typos can be checked.
   */
  public readonly formShape = input<DeepRequired<T> | null>(null);

  // TODO make this generic, so that any validation library can be used
  /**
   * Static vest suite that is used for form validation.
   */
  public readonly suite = input<StaticSuite<string, string, (model: T, field: string) => void> | null>(null);

  /**
   * Updates the validation config which is a dynamic object that is used to trigger form validation on the dependant fields.
   *
   * Example:
   * Trigger the `updateValueAndValidity` on `passwords.confirmPassword` every time the `passwords.password` gets a new value.
   *
   * ```typescript
   * validationConfig = {
   *     'passwords.password': ['passwords.confirmPassword']
   * }
   * ```
   */
  public readonly validationConfig = input<Record<string, string[]> | null>(null);

  /**
   * Emits every time the form status changes to PENDING.
   */
  public readonly pending$: Observable<FormControlStatus> = this.ngForm.form.events.pipe(
    filter((v) => v instanceof StatusChangeEvent),
    map((v) => (v as StatusChangeEvent).status),
    filter((v: FormControlStatus) => v === 'PENDING'),
    distinctUntilChanged()
  );

  /**
   * Emits every time the form status changes to a state other than PENDING.
   */
  public readonly idle$: Observable<FormControlStatus> = this.ngForm.form.events.pipe(
    filter((v) => v instanceof StatusChangeEvent),
    map((v) => (v as StatusChangeEvent).status),
    filter((v: FormControlStatus) => v !== 'PENDING'),
    distinctUntilChanged()
  );

  /**
   * Emits when the form value changes or when a new FormControl or FormGroup is created.
   * It also contains the disabled values (raw values).
   */
  @Output() public readonly formValueChange$ = this.ngForm.form.events.pipe(
    filter((v) => v instanceof ValueChangeEvent),
    map((v) => (v as ValueChangeEvent<unknown>).value),
    map(() => mergeValuesAndRawValues<T>(this.ngForm.form))
  );

  /**
   * Emits an object with all the errors of the form.
   * every time a form control or form groups changes its status to valid or invalid
   */
  @Output() public readonly errorsChange$ = this.ngForm.form.events.pipe(
    filter((v) => v instanceof StatusChangeEvent),
    map((v) => (v as StatusChangeEvent).status),
    filter((v) => v !== 'PENDING'),
    map(() => getAllFormErrors(this.ngForm.form))
  );

  /**
   * Emits when the form becomes dirty.
   */
  @Output() public readonly dirtyChange$ = this.ngForm.form.events.pipe(
    filter((v) => v instanceof PristineChangeEvent),
    map((v) => !(v as PristineChangeEvent).pristine),
    startWith(this.ngForm.form.dirty),
    distinctUntilChanged()
  );

  private readonly statusChanges$ = this.ngForm.form.statusChanges.pipe(
    startWith(this.ngForm.form.status),
    distinctUntilChanged()
  );

  /**
   * Emits when the form becomes valid.
   */
  @Output() public readonly validChange$ = this.statusChanges$.pipe(
    filter((s: FormControlStatus) => s === 'VALID' || s === 'INVALID'),
    map((s: FormControlStatus) => s === 'VALID'),
    distinctUntilChanged()
  );

  // Used to debounce formValues to make sure the validation suite is not triggered all the time.
  private readonly formValueCache: Record<
    string,
    Partial<{
      sub$: ReplaySubject<unknown>;
      debounced$: Observable<unknown>;
    }>
  > = {};

  private readonly destroy$ = new Subject<void>();

  public constructor() {
    // trigger form validation when the provided validation config changes
    toObservable(this.validationConfig)
      .pipe(
        filter((config) => !!config),
        switchMap((conf) => {
          if (!conf) {
            return of(null);
          }

          const streams = Object.keys(conf).map((key) => {
            return this.ngForm?.form.get(key)?.valueChanges.pipe(
              // wait until the form is pending
              switchMap(() => this.pending$),
              // wait until the form is not pending anymore
              switchMap(() => this.idle$),
              map(() => this.ngForm?.form.get(key)?.value),
              takeUntil(this.destroy$),
              tap(() => {
                conf[key]?.forEach((path: string) => {
                  this.ngForm?.form.get(path)?.updateValueAndValidity({
                    onlySelf: true,
                    emitEvent: true
                  });
                });
              })
            );
          });

          return zip(streams);
        })
      )
      .subscribe();

    // trigger form shape validation when the form gets updated
    this.formValueChange$.pipe(takeUntil(this.destroy$)).subscribe((v) => {
      if (this.formShape()) {
        validateFormShape(v, this.formShape() as DeepRequired<T>);
      }
    });

    // mark all form fields as touched when the form is submitted
    this.ngForm.ngSubmit.subscribe(() => this.ngForm.form.markAllAsTouched());
  }

  ngOnDestroy(): void {
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

      const mod = cloneDeep(this.formValue() as T);

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
}
