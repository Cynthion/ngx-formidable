import { Directive, inject, input } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';
import { getFormGroupFieldPath } from '../helpers/form.helpers';
import { FormValidationOptions } from '../models/formidable.model';
import { FormDirective } from './form.directive';

/**
 * Hooks into each `ngModelGroup` container and wires up an async validator that will:
 * 1. Locate the group’s path
 * 2. Call `FormDirective.createAsyncValidator()` for that group path
 * 3. Debounce and run your Vest suite against the nested group value
 *
 * Useful when an entire sub-object (e.g. address group) has composite rules.
 *
 * Inputs (inherited via DI from FormDirective):
 * - `@Input() validationOptions: FormValidationOptions`
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
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: FormModelGroupDirective,
      multi: true
    }
  ]
})
export class FormModelGroupDirective implements AsyncValidator {
  public validationOptions = input<FormValidationOptions>({ debounceValidationInMs: 0 });

  private readonly formDirective = inject(FormDirective);

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    const { ngForm } = this.formDirective;

    const fieldPath = getFormGroupFieldPath(ngForm.control, control);

    const validator = this.formDirective.createAsyncValidator(fieldPath, this.validationOptions());

    return validator(control.value) as Observable<ValidationErrors | null>;
  }
}
