import { Directive } from '@angular/core';
import { FORMIDABLE_VALIDATOR, IFormidableValidator } from '@cynthion/ngx-formidable';
import { Observable, of } from 'rxjs';

/**
 * A validator that reports every target as required, so the Specimen's `Invalid` column is the library's own
 * invalid state — the messages and the styling a real validator produces — rather than a picture of one.
 */
@Directive({
  selector: 'form[portalReportsRequired]',
  providers: [{ provide: FORMIDABLE_VALIDATOR, useExisting: ReportsRequiredDirective }]
})
export class ReportsRequiredDirective implements IFormidableValidator {
  public validate(): Observable<string[] | null> {
    return of(['Required.']);
  }
}
