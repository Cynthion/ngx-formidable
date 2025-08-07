import { Directive, inject, input } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';
import { getFormGroupFieldPath } from '../helpers/form.helpers';
import { FormValidationOptions } from '../models/formidable.model';
import { FormDirective } from './form.directive';

/**
 * Hooks into Angular's 'ngModelGroup' and creates an async validator.
 * Source: https://github.dev/simplifiedcourses/ngx-vest-forms
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
