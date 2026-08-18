import { booleanAttribute, Directive, inject, Injector, input, OnInit } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { WHOLE_FORM } from '../models/validation.model';
import { NgxFormidableFormDirective } from './form.directive';

/**
 * Validates the form as a whole, so a rule that is about no single field has somewhere to live.
 *
 * It runs the provided validator once for the `WHOLE_FORM` target and reports the result on the `<form>`'s
 * own control, which is where `errorsChange$` picks it up. A rule that reads several fields but is *about*
 * one of them, or about a group, belongs on that field or group instead.
 */
@Directive({
  selector: 'form[formidableValidateWholeForm]',
  standalone: true,
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: NgxFormidableWholeFormValidateDirective,
      multi: true
    }
  ]
})
export class NgxFormidableWholeFormValidateDirective implements AsyncValidator, OnInit {
  /** Switches the whole-form rule off without removing the attribute. The bare attribute means `true`. */
  public readonly formidableValidateWholeForm = input(true, { transform: booleanAttribute });

  private readonly injector = inject(Injector);

  private formDirective: NgxFormidableFormDirective<Record<string, unknown>> | null = null;

  /**
   * Resolved here rather than injected. `NgForm` builds its `FormGroup` inside its own constructor, and a
   * new `FormGroup` runs its async validators straight away — so `validate()` is first called while `NgForm`
   * is still being constructed. Asking for the form directive at that point would create it, it would ask
   * for the half-built `NgForm`, and DI would throw NG0200. `ngOnInit` runs well after both exist.
   */
  public ngOnInit(): void {
    this.formDirective = this.injector.get<NgxFormidableFormDirective<Record<string, unknown>> | null>(
      NgxFormidableFormDirective,
      null,
      { self: true, optional: true }
    );
  }

  public validate(control: AbstractControl): Observable<ValidationErrors | null> {
    // Before `ngOnInit` the form has no controls yet, so there is nothing to validate anyway. Every later
    // control registration re-runs the form's validity, which is what produces the first real result.
    if (!this.formidableValidateWholeForm() || !this.formDirective) {
      return of(null);
    }

    // The returned fn takes the control's value, not the control — see `createAsyncValidator`.
    return this.formDirective.createAsyncValidator(WHOLE_FORM)(
      control.getRawValue()
    ) as Observable<ValidationErrors | null>;
  }
}
