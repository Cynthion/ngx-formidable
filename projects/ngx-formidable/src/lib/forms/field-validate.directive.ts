import { Directive, inject } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { NgxFormidableForm } from './form.directive';
import { getFieldTarget } from './form.helpers';

/**
 * Validates every `ngModel` control on a formidable form as a **field rule**: it resolves the control's
 * dotted target and hands it to `NgxFormidableForm`, which debounces it and runs the provided
 * validator.
 *
 * The `[ngModel]` selector matches every model-bound control in the app, so this no-ops twice over — once
 * outside a formidable form, and again when no `FORMIDABLE_VALIDATOR` is provided. Angular's own validators
 * on the same control are untouched either way.
 */
@Directive({
  // Deliberately hijacks Angular's own selector so it attaches to every model-bound control.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[ngModel]',
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: NgxFormidableFieldValidate,
      multi: true
    }
  ]
})
export class NgxFormidableFieldValidate implements AsyncValidator {
  private readonly formDirective = inject(NgxFormidableForm, { optional: true, skipSelf: true });

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
