import { Directive, inject } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { NgxFormidableFormDirective } from './form.directive';
import { getGroupTarget } from './form.helpers';

/**
 * Validates every `ngModelGroup` on a formidable form as a **group rule**: it resolves the group's dotted
 * target and hands it to `NgxFormidableFormDirective`, which debounces it and runs the provided validator.
 *
 * This is where a rule that reads several fields at once belongs when its result is about the group rather
 * than about one of them — a password and its confirmation, for instance. A rule about the form as a whole
 * uses `WHOLE_FORM` instead; see `NgxFormidableWholeFormValidateDirective`.
 *
 * @example
 * ```html
 * <div ngModelGroup="passwords">
 *   <formidable-input-field name="password" [ngModel]="user.passwords?.password" />
 *   <formidable-input-field name="confirmPassword" [ngModel]="user.passwords?.confirmPassword" />
 * </div>
 * ```
 */
@Directive({
  selector: '[ngModelGroup]',
  standalone: true,
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: NgxFormidableGroupValidateDirective,
      multi: true
    }
  ]
})
export class NgxFormidableGroupValidateDirective implements AsyncValidator {
  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true, skipSelf: true });

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!this.formDirective) {
      return of(null);
    }

    const target = getGroupTarget(this.formDirective.ngForm.control, control);

    // Raw, like the field and whole-form paths: a group holding a disabled control is still validated
    // against a model that has that control's key.
    return this.formDirective.createAsyncValidator(target)(
      control.getRawValue()
    ) as Observable<ValidationErrors | null>;
  }
}
