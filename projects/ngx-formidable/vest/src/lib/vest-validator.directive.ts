import { Directive, input } from '@angular/core';
import { FORMIDABLE_VALIDATOR, IFormidableValidator } from '@cynthion/ngx-formidable';
import { Observable, of } from 'rxjs';
import { StaticSuite } from 'vest';

/**
 * Validates a `formidableForm` with a Vest static suite.
 *
 * Provides `FORMIDABLE_VALIDATOR`, which is what `NgxFormidableFormDirective` delegates to. Put it on the
 * same `<form>` and the form directive handles the rest — the targets, the debounce, and reporting the
 * messages to the field that owns them.
 *
 * Lives in the `@cynthion/ngx-formidable/vest` entry point, so `vest` stays an optional peer dependency.
 */
@Directive({
  selector: 'form[formSuite]',
  standalone: true,
  providers: [
    {
      provide: FORMIDABLE_VALIDATOR,
      useExisting: NgxFormidableVestValidatorDirective
    }
  ]
})
export class NgxFormidableVestValidatorDirective<T extends Record<string, unknown>> implements IFormidableValidator<T> {
  /**
   * A Vest `staticSuite` holding the rules for every target on this form. A whole-form rule is written
   * against the `WHOLE_FORM` target.
   */
  public readonly formSuite = input<StaticSuite<string, string, (model: T, field: string) => void> | null>(null);

  public validate(model: T, target: string): Observable<string[] | null> {
    const suite = this.formSuite();

    if (!suite) {
      return of(null);
    }

    return new Observable<string[] | null>((observer) => {
      suite(model, target).done((result) => {
        observer.next(result.getErrors()[target] ?? null);
        observer.complete();
      });
    });
  }
}
