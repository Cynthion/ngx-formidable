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
import { validateFormFrame } from '../helpers/form-validate.helpers';
import { getAllFormErrors, mergeValuesAndRawValues, set } from '../helpers/form.helpers';
import { cloneDeep } from '../helpers/utility.helpers';
import { FormValidationOptions } from '../models/formidable.model';
import { DeepRequired } from '../models/utility-types';

/**
 * Binds a Vest static suite to an Angular `<form>` and provides reactive form value, frame, validation, and error outputs.
 *
 * Inputs:
 * - `@Input() formValue: T | null`
 *   The current model value of the form (including disabled controls).
 *
 * - `@Input() formFrame: DeepRequired<T> | null`
 *   The “frame” of your form model, used to type-check and catch typos at build time.
 *
 * - `@Input() suite: StaticSuite<string, string, (model: T, field: string) => void> | null`
 *   A Vest `staticSuite` that defines all your field and root‐level tests.
 *
 * - `@Input() validationConfig: Record<string, string[]> | null`
 *   Optional mapping of control paths → array of dependent control paths.
 *   When a source control value changes, each target in the array will have
 *   `.updateValueAndValidity()` triggered so cross-field rules can re-run.
 *
 * Outputs:
 * - `@Output() formValueChange$: Observable<T>`
 *   Emits the merged value+rawValue on every control add/remove or value change.
 *
 * - `@Output() errorsChange$: Observable<Record<string,string>>`
 *   Emits the flattened map of all control errors (including root form errors) whenever validation status changes.
 *
 * - `@Output() dirtyChange$: Observable<boolean>`
 *   Emits `true` when any control becomes dirty, `false` when reset-to-pristine.
 *
 * - `@Output() validChange$: Observable<boolean>`
 *   Emits `true` if the form is VALID, `false` if INVALID (filtering out PENDING).
 *
 * - `pending$: Observable<'PENDING'>` and `idle$: Observable<'VALID'|'INVALID'>`
 *   Internal streams you can subscribe to to show spinners or block submissions.
 *
 * Methods:
 * - `createAsyncValidator(fieldPath: string, validationOptions: FormValidationOptions): AsyncValidatorFn`
 *   Returns an Angular async validator that will debounce and run your Vest suite
 *   for the given field path within the form model.
 *
 * @example
 * ```html
 * <form
 *   formidableForm
 *   [formValue]="user$ | async"
 *   [formFrame]="userFrame"
 *   [suite]="userSuite"
 *   (formValueChange$)="onModelChange($event)"
 *   (errorsChange$)="errors = $event"
 *   (validChange$)="isValid = $event"
 *   (dirtyChange$)="isDirty = $event"
 * >
 *   <!-- form fields here -->
 * </form>
 * ```
 */
@Directive({
  selector: 'form[formidableForm]',
  standalone: true
})
export class FormDirective<T extends Record<string, unknown>> implements OnDestroy {
  public readonly ngForm = inject(NgForm, { self: true, optional: false });

  /**
   * The value of the form, needed for the validation part.
   */
  public readonly formValue = input<T | null>(null);

  /**
   * Represents the frame of the FormModel.
   * It's a deep-required version of the FormModel so that typing/typos can be checked.
   */
  public readonly formFrame = input<DeepRequired<T> | null>(null);

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

    // trigger form frame validation when the form gets updated
    this.formValueChange$.pipe(takeUntil(this.destroy$)).subscribe((v) => {
      if (this.formFrame()) {
        validateFormFrame(v, this.formFrame() as DeepRequired<T>);
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
   * Feeds the formValueCache, debounces it until the next tick and creates an asynchronous validator which runs a validation suite.
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
