import { Directive, inject, Injector, OnInit } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, NgModel, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { FORMIDABLE_FIELD } from '../models/formidable.model';
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
 *
 * On a library field it attaches itself to the control: Angular binds such a field through its `value`
 * model rather than a value accessor, and on that path never attaches a directive's validators.
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
export class NgxFormidableFieldValidate implements AsyncValidator, OnInit {
  private readonly formDirective = inject(NgxFormidableForm, { optional: true, skipSelf: true });
  private readonly injector = inject(Injector);
  private readonly isLibraryField = !!inject(FORMIDABLE_FIELD, { self: true, optional: true });

  ngOnInit(): void {
    if (!this.isLibraryField) return;

    // Resolved here rather than injected: `NgModel` collects this directive as one of its validators in its
    // own constructor, so asking for it from this one's would close the loop and throw NG0200.
    const ngModel = this.injector.get(NgModel, null, { self: true });

    ngModel?.control.addAsyncValidators((control) => this.validate(control));
  }

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
