import { Directive, inject, input } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';
import { getFormControlFieldPath } from '../helpers/form.helpers';
import { FormValidationOptions } from '../models/formz.model';
import { FormDirective } from './form.directive';

/**
 * Hooks into Angular's 'ngModel' and creates an async validator.
 * Source: https://github.dev/simplifiedcourses/ngx-vest-forms
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
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
