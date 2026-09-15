import { Directive, inject, input, OnDestroy } from '@angular/core';
import { outputFromObservable, toObservable } from '@angular/core/rxjs-interop';
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
  distinctUntilChanged,
  filter,
  map,
  merge,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
  timer
} from 'rxjs';
import { cloneDeep } from '../helpers/utility.helpers';
import { DeepRequired } from '../models/utility-types';
import {
  FORMIDABLE_ERROR_EXTRACTOR,
  FORMIDABLE_VALIDATOR,
  FormidableReveal,
  WHOLE_FORM
} from '../models/validation.model';
import { validateFormShape } from './form-validate.helpers';
import { fillMissing, getAllFormErrors, mergeValuesAndRawValues, set } from './form.helpers';

/**
 * Turns an Angular `<form>` into a reactive value, validity and error surface.
 *
 * Validator-agnostic: it owns the model, the targets and the debouncing, and delegates the rules to whatever
 * `FORMIDABLE_VALIDATOR` is provided on the form — the Vest adapter, one of your own, or nothing at all, in
 * which case the form is still observable but nothing validates.
 */
// The validation seam and its three layers: `tech/validation.md`.
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
   * When the fields on this form reveal their messages. A field overrides it with its own `revealOn` on
   * `formidableFieldErrors`. Independent of when the validator runs, which is Angular's `updateOn`.
   */
  public readonly revealOn = input<FormidableReveal>('touched');

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

  /** The form has validation in flight — what a spinner or a disabled submit button binds to. */
  public readonly pending$: Observable<FormControlStatus> = this.ngForm.form.events.pipe(
    filter((v) => v instanceof StatusChangeEvent),
    map((v) => (v as StatusChangeEvent).status),
    filter((v: FormControlStatus) => v === 'PENDING'),
    distinctUntilChanged()
  );

  /**
   * Validation has settled, so the errors are readable. Also what gates the messages' repaint: async
   * validation leaves the form PENDING with no errors on it yet.
   */
  public readonly idle$: Observable<FormControlStatus> = this.ngForm.form.events.pipe(
    filter((v) => v instanceof StatusChangeEvent),
    map((v) => (v as StatusChangeEvent).status),
    filter((v: FormControlStatus) => v !== 'PENDING'),
    distinctUntilChanged()
  );

  /**
   * The whole model on every value change, and on every control added or removed. Merged with the raw values,
   * so a disabled control's value is included rather than dropped.
   */
  private readonly formValueChange$ = this.ngForm.form.events.pipe(
    filter((v) => v instanceof ValueChangeEvent),
    map((v) => (v as ValueChangeEvent<unknown>).value),
    map(() => mergeValuesAndRawValues<T>(this.ngForm.form))
  );

  /**
   * Every message on the form, keyed by the target that reported it — a field or group path, or `WHOLE_FORM`.
   * Each entry is normalized through `FORMIDABLE_ERROR_EXTRACTOR`, so a form mixing the validator with
   * Angular's own validators still yields one homogeneous map.
   */
  private readonly errorsChange$ = this.ngForm.form.events.pipe(
    filter((v) => v instanceof StatusChangeEvent),
    map((v) => (v as StatusChangeEvent).status),
    filter((v) => v !== 'PENDING'),
    map(() => getAllFormErrors(this.ngForm.form, this.extractErrors))
  );

  /** `true` once any control has been edited, `false` again on a reset to pristine. */
  private readonly dirtyChange$ = this.ngForm.form.events.pipe(
    filter((v) => v instanceof PristineChangeEvent),
    map((v) => !(v as PristineChangeEvent).pristine),
    startWith(this.ngForm.form.dirty),
    distinctUntilChanged()
  );

  private readonly statusChanges$ = this.ngForm.form.statusChanges.pipe(
    startWith(this.ngForm.form.status),
    distinctUntilChanged()
  );

  private readonly validChange$ = this.statusChanges$.pipe(
    filter((s: FormControlStatus) => s === 'VALID' || s === 'INVALID'),
    map((s: FormControlStatus) => s === 'VALID'),
    distinctUntilChanged()
  );

  /** The whole model on every value change, and on every control added or removed. */
  public readonly formValueChange = outputFromObservable(this.formValueChange$);

  /** Every message on the form, keyed by the target that reported it. */
  public readonly errorsChange = outputFromObservable(this.errorsChange$);

  /** `true` once any control has been edited, `false` again on a reset to pristine. */
  public readonly dirtyChange = outputFromObservable(this.dirtyChange$);

  /** `true` when the form is valid and `false` when it is invalid. Silent while pending, never `null`. */
  public readonly validChange = outputFromObservable(this.validChange$);

  private readonly destroy$ = new Subject<void>();

  public constructor() {
    // re-validate dependants when the dependency map changes
    toObservable(this.dependentFields)
      .pipe(
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
    this.ngForm.ngSubmit.pipe(takeUntil(this.destroy$)).subscribe(() => this.ngForm.form.markAllAsTouched());
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
      // The bound model lags the form by one change: Angular runs this validator before it emits the
      // `ValueChangeEvent` that `formValueChange$` turns into the next `formValue`. So the live control
      // values lead, and the bound model only fills in what has no control of its own — which is why a form
      // whose model has not arrived yet, or has none at all, still validates against what its controls hold.
      const mod = fillMissing(
        cloneDeep(mergeValuesAndRawValues<T>(this.ngForm.form)),
        cloneDeep((this.formValue() ?? {}) as T)
      );

      // A field's or a group's own validator runs before the root recomputes its value, so its own target is
      // the one thing the live values can still be behind on. `WHOLE_FORM` is not a path — it addresses the
      // whole model, so writing the form's value under it would hand the validator a key the model lacks.
      if (target !== WHOLE_FORM) {
        set(mod as object, target, value);
      }

      // Angular cancels a control's pending async validator when the next run starts, so a newer change
      // restarts this window. The setting is read per run, so changing it takes effect at once.
      return timer(this.debounceMs()).pipe(
        switchMap(() => validator.validate(mod, target)),
        map((errors): ValidationErrors | null => (errors?.length ? { error: errors[0], errors } : null)),
        takeUntil(this.destroy$)
      );
    };
  }
}
