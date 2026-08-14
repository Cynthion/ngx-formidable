import { Directive, inject } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { NgxFormidableFormDirective } from './form.directive';
import { getFieldTarget } from './form.helpers';

/**
 * Validates every `ngModel` control on a formidable form as a **field rule**: it resolves the control's
 * dotted target and hands it to `NgxFormidableFormDirective`, which debounces it and runs the provided
 * validator.
 *
 * The `[ngModel]` selector matches every model-bound control in the app, so this no-ops twice over — once
 * outside a formidable form, and again when no `FORMIDABLE_VALIDATOR` is provided. Angular's own validators
 * on the same control are untouched either way.
 *
 * @example
 * ```html
 * <form formidableForm [formValue]="user" [debounceMs]="200">
 *   <formidable-input-field name="email" [ngModel]="user.email" />
 * </form>
 * ```
 */
@Directive({
  selector: '[ngModel]',
  standalone: true,
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: NgxFormidableFieldValidateDirective,
      multi: true
    }
  ]
})
export class NgxFormidableFieldValidateDirective implements AsyncValidator {
  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true, skipSelf: true });

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!this.formDirective) {
      return of(null);
    }

    const target = getFieldTarget(this.formDirective.ngForm.control, control);

    return this.formDirective.createAsyncValidator(target)(
      control.getRawValue()
    ) as Observable<ValidationErrors | null>;
  }
}
