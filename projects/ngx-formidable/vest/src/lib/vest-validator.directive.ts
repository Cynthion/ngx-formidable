import { Directive, input } from '@angular/core';
import { FORMIDABLE_VALIDATOR, IFormidableValidator } from '@cynthion/ngx-formidable';
import { Observable, of } from 'rxjs';
import { StaticSuite } from 'vest';

/**
 * Validates a `formidableForm` with a Vest static suite.
 *
 * Provides `FORMIDABLE_VALIDATOR`, which is what `NgxFormidableFormDirective` delegates to. Put it on the
 * same `<form>` and the harness handles the rest — field paths, the debounce, and reporting the messages
 * to the field that owns them.
 *
 * Inputs:
 * - `@Input() formSuite: StaticSuite<string, string, (model: T, field: string) => void> | null`
 *   A Vest `staticSuite` defining all field and root-level tests. Root-level tests use the `WHOLE_FORM` path.
 *
 * @example
 * ```html
 * <form
 *   formidableForm
 *   [formValue]="user$ | async"
 *   [formSuite]="userSuite"
 * >
 *   <!-- form fields here -->
 * </form>
 * ```
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
