import { Directive, inject, input } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { getFormGroupFieldPath } from '../helpers/form.helpers';
import { NgxFormidableFormValidationOptions } from '../models/formidable.model';
import { NgxFormidableFormDirective } from './form.directive';

/**
 * Hooks into each `ngModelGroup` container and wires up an async validator that will:
 * 1. Locate the group’s path
 * 2. Call `NgxFormidableFormDirective.createAsyncValidator()` for that group path
 * 3. Debounce and run your Vest suite against the nested group value
 *
 * Useful when an entire sub-object (e.g. address group) has composite rules.
 *
 * Inputs (inherited via DI from NgxFormidableFormDirective):
 * - `@Input() validationOptions: NgxFormidableFormValidationOptions`
 *
 * @example
 * ```html
 * <div ngModelGroup="passwords">
 *   <input name="password" ngModel />
 *   <input name="confirmPassword" ngModel />
 * </div>
 * <div *ngIf="form.errors['passwords']">{{ form.errors['passwords'] }}</div>
 * ```
 */
@Directive({
  selector: '[ngModelGroup]',
  standalone: true,
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: NgxFormidableFormModelGroupDirective,
      multi: true
    }
  ]
})
export class NgxFormidableFormModelGroupDirective implements AsyncValidator {
  public validationOptions = input<NgxFormidableFormValidationOptions>({ debounceValidationInMs: 0 });

  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true, skipSelf: true });

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    // The `[ngModelGroup]` selector matches every ngModelGroup, including those outside a formidable form.
    // Without a host NgxFormidableFormDirective there is nothing to validate against, so skip.
    if (!this.formDirective) return of(null);

    const { ngForm } = this.formDirective;

    const fieldPath = getFormGroupFieldPath(ngForm.control, control);

    const validator = this.formDirective.createAsyncValidator(fieldPath, this.validationOptions());

    return validator(control.value) as Observable<ValidationErrors | null>;
  }
}
