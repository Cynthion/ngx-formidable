import { InjectionToken } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';

/**
 * The target a whole-form rule reports under — a rule about the form itself rather than about any one field.
 * Field and group rules use their own dotted path instead.
 */
export const WHOLE_FORM = 'wholeForm';

/** Every error message on a form, keyed by the target that reported it. */
export type FormidableFormErrors = Record<string, string[]>;

/**
 * What a validator is asked, and what the form directive does with the answer.
 * The form directive owns the model, the targets and the debouncing; an implementation owns the rules.
 */
export interface IFormidableValidator<T = Record<string, unknown>> {
  /**
   * Runs the rules for one target against the whole model. `null` means valid.
   *
   * A target is a dotted field path (`'passwords.password'`), a group path (`'passwords'`), or `WHOLE_FORM`.
   */
  validate(model: T, target: string): Observable<string[] | null>;
}

/** InjectionToken for the validator the form directive delegates to. Without it, nothing is validated. */
export const FORMIDABLE_VALIDATOR = new InjectionToken<IFormidableValidator>('FORMIDABLE_VALIDATOR');

export type FormidableErrorExtractorFn = (errors: ValidationErrors | null) => string[];

/**
 * InjectionToken for turning Angular's `ValidationErrors` into the messages a field displays.
 * The default reads the `errors` array the form directive writes, and falls back to Angular's own error
 * keys (`required`, `minlength`) so built-in validators render without any wiring.
 */
export const FORMIDABLE_ERROR_EXTRACTOR = new InjectionToken<FormidableErrorExtractorFn>('FORMIDABLE_ERROR_EXTRACTOR', {
  factory: () => (errors) => (errors?.['errors'] as string[] | undefined) ?? (errors ? Object.keys(errors) : [])
});

export type FormidableErrorTranslatorFn = (error: string) => string;

/** InjectionToken for providing a translation function for error messages. */
export const FORMIDABLE_ERROR_TRANSLATOR = new InjectionToken<FormidableErrorTranslatorFn>(
  'FORMIDABLE_ERROR_TRANSLATOR',
  { factory: () => (e) => e }
);
