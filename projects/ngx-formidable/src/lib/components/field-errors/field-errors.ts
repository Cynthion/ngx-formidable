import { Component, inject, input } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';
import { FORMIDABLE_ERROR_MESSAGE } from '../../models/validation.model';

/**
 * Renders a list of errors as messages, in an `aria-live` region, and decides nothing about them. The
 * decorator renders one for its field; place one by hand for a group's errors, the form's, or a spot of
 * your own, and pass it the errors to show when they should show.
 *
 * Each message is `FORMIDABLE_ERROR_MESSAGE` applied to its error — by default its `message`, else its `kind`.
 */
@Component({
  selector: 'formidable-field-errors',
  templateUrl: './field-errors.html',
  styleUrls: ['./field-errors.scss'],
  host: { 'aria-live': 'polite' }
})
export class FieldErrors {
  protected readonly message = inject(FORMIDABLE_ERROR_MESSAGE);

  /** The errors to render. Empty renders nothing, while the live region stays in place to announce the next. */
  public readonly errors = input<readonly ValidationError[], readonly ValidationError[] | undefined>([], {
    transform: (errors) => errors ?? []
  });
}
