import { Directive, inject, input } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';
import { getFormControlFieldPath } from '../helpers/form.helpers';
import { FormValidationOptions } from '../models/formidable.model';
import { FormDirective } from './form.directive';

/**
 * Hooks into each `ngModel` control and wires up an async validator that will:
 * 1. Locate the control’s path
 * 2. Call `FormDirective.createAsyncValidator()` for that path
 * 3. Debounce and run your Vest suite against the individual field
 *
 * Provides per-control validation feedback directly on `ngModel`.
 *
 * Inputs (inherited via DI from FormDirective):
 * - `@Input() validationOptions: FormValidationOptions`
 *
 * @example
 * ```html
 * <input
 *   name="email"
 *   ngModel
 *   [validationOptions]="{ debounceValidationInMs: 200 }"
 *   (ngModelChange)="onEmailChange($event)"
 * />
 * <div *ngIf="form.errors['email']">{{ form.errors['email'] }}</div>
 * ```
 */
@Directive({
  selector: '[ngModel]',
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: FormModelDirective,
      multi: true
    }
  ]
})
export class FormModelDirective implements AsyncValidator {
  public validationOptions = input<FormValidationOptions>({ debounceValidationInMs: 0 });

  private readonly formDirective = inject(FormDirective);

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    const { ngForm } = this.formDirective;

    const fieldPath = getFormControlFieldPath(ngForm.control, control);

    const validator = this.formDirective.createAsyncValidator(fieldPath, this.validationOptions());

    return validator(control.getRawValue()) as Observable<ValidationErrors | null>;
  }
}
