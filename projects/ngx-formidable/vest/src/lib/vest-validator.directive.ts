import { Directive, input } from '@angular/core';
import { FORMIDABLE_VALIDATOR, IFormidableValidator } from '@cynthion/ngx-formidable';
import { from, map, Observable, of } from 'rxjs';
import { Suite } from 'vest';

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
   * A Vest suite, from `create`, holding the rules for every target on this form. A whole-form rule is
   * written against the `WHOLE_FORM` target.
   */
  public readonly formSuite = input<Suite<string, string, (model: T, field: string) => void> | null>(null);

  public validate(model: T, target: string): Observable<string[] | null> {
    const suite = this.formSuite();

    if (!suite) {
      return of(null);
    }

    // `runStatic` keeps each run independent of the last, as `staticSuite` used to. Its result is a
    // thenable that settles once the suite's async tests do, which is what replaced Vest 5's `done()`.
    return from(Promise.resolve(suite.runStatic(model, target))).pipe(
      map((result) => {
        const messages = result.getErrors(target);

        // Vest reports a clean or unknown target as an empty array; the seam's contract is `null`.
        return messages.length ? messages : null;
      })
    );
  }
}
