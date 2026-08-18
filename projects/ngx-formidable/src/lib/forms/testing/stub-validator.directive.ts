import { Directive, input } from '@angular/core';
import { Observable, of } from 'rxjs';
import { FORMIDABLE_VALIDATOR, IFormidableValidator } from '../../models/validation.model';

/**
 * Test-only stand-in for a validator adapter, so the specs that prove UI state travels from validity do not
 * need a validation library. Takes a map of target → message, and reports that message while the value
 * at that path is blank.
 */
@Directive({
  selector: 'form[stubValidator]',
  standalone: true,
  providers: [
    {
      provide: FORMIDABLE_VALIDATOR,
      useExisting: StubValidatorDirective
    }
  ]
})
export class StubValidatorDirective implements IFormidableValidator {
  /** Target → message. A target absent from the map never reports anything. */
  public readonly stubValidator = input<Record<string, string>>({});

  public validate(model: Record<string, unknown>, target: string): Observable<string[] | null> {
    const message = this.stubValidator()[target];

    if (!message) {
      return of(null);
    }

    const value = target
      .split('.')
      .reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], model);

    return of(value === undefined || value === null || value === '' ? [message] : null);
  }
}
