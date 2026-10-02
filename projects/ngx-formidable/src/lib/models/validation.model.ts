import { InjectionToken } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';

/**
 * When a field's messages appear: once it is `touched`, once it is `dirty`, or `always`. Independent of when
 * the validator runs: `touched` with a rule that runs on every change stays quiet while a field is first
 * typed into. A submit touches every field, so `touched` covers it.
 */
export type FormidableReveal = 'touched' | 'dirty' | 'always';

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
