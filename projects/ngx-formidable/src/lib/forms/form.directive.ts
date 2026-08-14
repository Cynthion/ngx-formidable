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
  merge,
  Observable,
  of,
  ReplaySubject,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap
} from 'rxjs';
import { cloneDeep } from '../helpers/utility.helpers';
import { DeepRequired } from '../models/utility-types';
import { FORMIDABLE_ERROR_EXTRACTOR, FORMIDABLE_VALIDATOR, WHOLE_FORM } from '../models/validation.model';
import { validateFormShape } from './form-validate.helpers';
import { fillMissing, getAllFormErrors, mergeValuesAndRawValues, set } from './form.helpers';

/**
 * Turns an Angular `<form>` into a reactive value, validity and error surface.
 *
 * Validator-agnostic: it owns the model, the targets and the debouncing, and delegates the rules to whatever
 * `FORMIDABLE_VALIDATOR` is provided on the form — the Vest adapter, a consumer's own, or nothing at all, in
 * which case the form is still observable but nothing validates.
 *
 * Inputs:
 * - `@Input() formValue: T | null`
 *   The current model value of the form (including disabled controls).
 *
 * - `@Input() formShape: DeepRequired<T> | null`
 *   The shape of your form model — every key required — used to catch typos in dev mode.
 *
 * - `@Input() debounceMs: number`
 *   How long to wait after a change before running the validator, for every target on this form.
 *
 * - `@Input() dependentFields: Record<string, string[]> | null`
 *   Maps a target to the targets that depend on it. When the source's value changes, each dependant is
 *   re-validated, so a rule reading more than one field re-runs when any of them moves.
 *
 * - `@Input() showRequiredMarkers: boolean`
 *   Whether the fields on this form may render their required marker. Presentational only.
 *
 * Outputs:
 * - `@Output() formValueChange$: Observable<T>`
 *   Emits the merged value+rawValue on every control add/remove or value change.
 *
 * - `@Output() errorsChange$: Observable<FormidableFormErrors>`
 *   Emits every message on the form keyed by the target that reported it — including `WHOLE_FORM` — whenever
 *   validation status changes.
 *
 * - `@Output() dirtyChange$: Observable<boolean>`
 *   Emits `true` when any control becomes dirty, `false` when reset-to-pristine.
 *
 * - `@Output() validChange$: Observable<boolean>`
 *   Emits `true` if the form is VALID, `false` if INVALID (filtering out PENDING).
 *
 * - `pending$` and `idle$: Observable<FormControlStatus>`
 *   Streams you can subscribe to to show spinners or block submissions.
 *
 * Methods:
 * - `createAsyncValidator(target: string): AsyncValidatorFn`
 *   Returns an Angular async validator that debounces and runs the provided `FORMIDABLE_VALIDATOR`
 *   for the given target within the form model.
 *
 * @example A validator is supplied separately — see `NgxFormidableVestValidatorDirective` or the
 * `FORMIDABLE_VALIDATOR` token.
 * ```html
 * <form
 *   formidableForm
 *   [formValue]="user$ | async"
 *   [formShape]="userShape"
 *   [debounceMs]="200"
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
export class NgxFormidableFormDirective<T extends Record<string, unknown>> implements OnDestroy {
  public readonly ngForm = inject(NgForm, { self: true, optional: false });

  // Optional: without a validator the form is observable but nothing validates.
  private readonly validator = inject(FORMIDABLE_VALIDATOR, { optional: true });

  private readonly extractErrors = inject(FORMIDABLE_ERROR_EXTRACTOR);

  /**
   * The model the form edits. The validator is handed the form's live control values, with this filling in
   * whatever has no control of its own.
   */
  public readonly formValue = input<T | null>(null);

  /**
   * The shape of the model — a deep-required version of it, so a typo in a target or a model key is caught.
   * Checked in dev mode only.
   */
  public readonly formShape = input<DeepRequired<T> | null>(null);

  /**
   * How long to wait after a change before running the validator, for every target on this form.
   * One setting per form: a field, a group and the whole form all debounce together.
   */
  public readonly debounceMs = input(0);

  /**
   * Whether the fields on this form may render their required marker, so one switch hides all of them.
   * A field still has to ask for its own with `showRequiredMarker`. Presentational only.
   */
  public readonly showRequiredMarkers = input(true);

  /**
   * Maps a target to the targets that depend on it, so a rule reading more than one field re-runs when any of
   * them moves. Each dependant is re-validated once the source's own validation settles.
   *
   * ```typescript
   * dependentFields = {
   *     'passwords.password': ['passwords.confirmPassword']
   * }
   * ```
   */
  public readonly dependentFields = input<Record<string, string[]> | null>(null);

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
    map(() => getAllFormErrors(this.ngForm.form, this.extractErrors))
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

  // Debounces the model per target, so the validator is not run on every keystroke.
  private readonly formValueCache: Record<
    string,
    Partial<{
      sub$: ReplaySubject<unknown>;
      debounced$: Observable<unknown>;
    }>
  > = {};

  private readonly destroy$ = new Subject<void>();

  public constructor() {
    // re-validate dependants when the dependency map changes
    toObservable(this.dependentFields)
      .pipe(
        filter((config) => !!config),
        switchMap((conf) => {
          if (!conf) {
            return of(null);
          }

          // Sourced from the form's own events, and the key resolved per event: the controls register a tick
          // after this input is first set, so a source resolved once here has nothing to resolve to.
          const streams = Object.keys(conf).map((key) =>
            this.ngForm.form.events.pipe(
              filter((event) => event instanceof ValueChangeEvent && event.source === this.ngForm.form.get(key)),
              // wait until the form is pending
              switchMap(() => this.pending$),
              // wait until the form is not pending anymore
              switchMap(() => this.idle$),
              takeUntil(this.destroy$),
              tap(() => {
                conf[key]?.forEach((path: string) => {
                  this.ngForm.form.get(path)?.updateValueAndValidity({
                    onlySelf: true,
                    emitEvent: true
                  });
                });
              })
            )
          );

          // Merged, so each key re-validates its own dependants: a key that never moves must not hold the
          // others back.
          return merge(...streams);
        })
      )
      .subscribe();

    // check the model against its shape whenever the form updates
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
   * Assembles the model, feeds the formValueCache, debounces it and creates an asynchronous validator which
   * runs the provided `FORMIDABLE_VALIDATOR` for the given target.
   */
  public createAsyncValidator(target: string): AsyncValidatorFn {
    const validator = this.validator;

    if (!validator) {
      return () => of(null);
    }

    return (value: unknown) => {
      if (!this.formValue()) {
        return of(null);
      }

      // The bound model lags the form by one change: Angular runs this validator before it emits the
      // `ValueChangeEvent` that `formValueChange$` turns into the next `formValue`. So the live control
      // values lead, and the bound model only fills in what has no control of its own.
      const mod = fillMissing(
        cloneDeep(mergeValuesAndRawValues<T>(this.ngForm.form)),
        cloneDeep(this.formValue() as T)
      );

      // A field's or a group's own validator runs before the root recomputes its value, so its own target is
      // the one thing the live values can still be behind on. `WHOLE_FORM` is not a path — it addresses the
      // whole model, so writing the form's value under it would hand the validator a key the model lacks.
      if (target !== WHOLE_FORM) {
        set(mod as object, target, value);
      }

      if (!this.formValueCache[target]) {
        this.formValueCache[target] = {
          // keep track of the last model
          sub$: new ReplaySubject(1)
        };

        this.formValueCache[target].debounced$ = this.formValueCache[target].sub$!.pipe(
          debounceTime(this.debounceMs())
        );
      }

      // Provide the latest model to the cache.
      this.formValueCache[target].sub$!.next(mod);

      // When debounced, take the latest value and perform the asynchronous validation.
      return this.formValueCache[target].debounced$!.pipe(
        take(1),
        switchMap((latest) => validator.validate(latest as T, target)),
        map((errors): ValidationErrors | null => (errors?.length ? { error: errors[0], errors } : null)),
        takeUntil(this.destroy$)
      );
    };
  }
}
