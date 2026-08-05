import { Directive, inject, input } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { getFormControlFieldPath } from '../helpers/form.helpers';
import { NgxFormidableFormValidationOptions } from '../models/formidable.model';
import { NgxFormidableFormDirective } from './form.directive';

/**
 * Hooks into each `ngModel` control and wires up an async validator that will:
 * 1. Locate the control’s path
 * 2. Call `NgxFormidableFormDirective.createAsyncValidator()` for that path
 * 3. Debounce and run your Vest suite against the individual field
 *
 * Provides per-control validation feedback directly on `ngModel`.
 *
 * Inputs (inherited via DI from NgxFormidableFormDirective):
 * - `@Input() validationOptions: NgxFormidableFormValidationOptions`
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
  standalone: true,
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: NgxFormidableFormModelDirective,
      multi: true
    }
  ]
})
export class NgxFormidableFormModelDirective implements AsyncValidator {
  public validationOptions = input<NgxFormidableFormValidationOptions>({ debounceValidationInMs: 0 });

  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true, skipSelf: true });

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    // The `[ngModel]` selector matches every ngModel, including those outside a formidable form.
    // Without a host NgxFormidableFormDirective there is nothing to validate against, so skip.
    if (!this.formDirective) return of(null);

    const { ngForm } = this.formDirective;

    const fieldPath = getFormControlFieldPath(ngForm.control, control);

    const validator = this.formDirective.createAsyncValidator(fieldPath, this.validationOptions());

    return validator(control.getRawValue()) as Observable<ValidationErrors | null>;
  }
}
