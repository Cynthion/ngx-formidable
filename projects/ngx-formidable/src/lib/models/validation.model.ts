import { InjectionToken } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';
import { Observable } from 'rxjs';

/**
 * The target a whole-form rule reports under — a rule about the form itself rather than about any one field.
 * Field and group rules use their own dotted path instead.
 */
export const WHOLE_FORM = 'wholeForm';

/** Every error message on a form, keyed by the target that reported it. */
export type FormidableFormErrors = Record<string, string[]>;

/**
 * When a field's messages appear: once it is `touched`, once it is `dirty`, or `always`. Independent of when
 * the validator runs: `touched` with a rule that runs on every change stays quiet while a field is first
 * typed into. A submit touches every field, so `touched` covers it.
 */
export type FormidableReveal = 'touched' | 'dirty' | 'always';

/**
 * What a validator is asked, and what the form directive does with the answer.
 * The form directive owns the model, the targets and the debouncing; an implementation owns the rules.
 */
export interface FormidableValidator<T = Record<string, unknown>> {
  /**
   * Runs the rules for one target against the whole model. `null` means valid.
   *
   * A target is a dotted field path (`'passwords.password'`), a group path (`'passwords'`), or `WHOLE_FORM`.
   */
  validate(model: T, target: string): Observable<string[] | null>;
}

/** InjectionToken for the validator the form directive delegates to. Without it, nothing is validated. */
export const FORMIDABLE_VALIDATOR = new InjectionToken<FormidableValidator>('FORMIDABLE_VALIDATOR');

/** Turns one error into the message a user reads. */
export type FormidableErrorMessageFn = (error: ValidationError) => string;

/**
 * InjectionToken for the text of every message the library renders. The default is the error's own
 * `message`, else its `kind`. A classic API's error carries no `message` — `Validators.minLength` reaches a
 * field as `{ kind: 'minlength', context: { requiredLength, actualLength } }` — so this is where it gets one.
 */
export const FORMIDABLE_ERROR_MESSAGE = new InjectionToken<FormidableErrorMessageFn>('FORMIDABLE_ERROR_MESSAGE', {
  factory: () => (error) => error.message ?? error.kind
});
