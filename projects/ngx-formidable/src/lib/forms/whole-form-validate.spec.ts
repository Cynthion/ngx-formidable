import { Component, Directive, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { Observable, of } from 'rxjs';
import { InputField } from '../components/fields/input-field/input-field';
import {
  FORMIDABLE_VALIDATOR,
  FormidableFormErrors,
  FormidableValidator,
  WHOLE_FORM
} from '../models/validation.model';
import { NgxFormidableFieldValidate } from './field-validate.directive';
import { NgxFormidableWholeFormValidate } from './whole-form-validate.directive';
import { NgxFormidableForm } from './form.directive';
import { StubValidator } from './testing/stub-validator.directive';

/**
 * Contract of root-level validation: `formidableValidateWholeForm` runs the same `FORMIDABLE_VALIDATOR` as every
 * field does, under the `WHOLE_FORM` path, and reports the result on the form control itself.
 *
 * `formidableValidateWholeForm` is a boolean attribute, so the bare attribute has to switch it on — it is written
 * that way in the demo, the README and every consumer form.
 */

interface Model extends Record<string, unknown> {
  name?: string;
}

@Component({
  imports: [
    FormsModule,
    NgxFormidableForm,
    NgxFormidableFieldValidate,
    NgxFormidableWholeFormValidate,
    StubValidator,
    InputField
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      formidableValidateWholeForm
      [formValue]="value"
      [stubValidator]="rules">
      <formidable-input-field
        name="name"
        [ngModel]="value.name" />
    </form>
  `
})
class BareAttributeHost {
  value: Model = {};
  rules: Record<string, string> = { [WHOLE_FORM]: 'The form as a whole is wrong.', name: 'Required' };
}

@Component({
  imports: [
    FormsModule,
    NgxFormidableForm,
    NgxFormidableFieldValidate,
    NgxFormidableWholeFormValidate,
    StubValidator,
    InputField
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      [formValue]="value"
      [formidableValidateWholeForm]="false"
      [stubValidator]="rules">
      <formidable-input-field
        name="name"
        [ngModel]="value.name" />
    </form>
  `
})
class SwitchedOffHost {
  value: Model = {};
  rules = { [WHOLE_FORM]: 'The form as a whole is wrong.' };
}

/** A form whose only rule is Angular's own `required`, so `errorsChange$` has a non-message shape to fold. */
@Component({
  imports: [FormsModule, NgxFormidableForm, InputField],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      [formValue]="value"
      (errorsChange)="errors = $event">
      <formidable-input-field
        name="name"
        [required]="true"
        [ngModel]="value.name" />
    </form>
  `
})
class AngularValidatorHost {
  value: Model = {};
  errors: FormidableFormErrors = {};
}

/** Reports on `WHOLE_FORM` while `name` is `Test`, so the rule depends on a field it does not report on. */
@Directive({
  selector: 'form[crossFieldValidator]',
  providers: [{ provide: FORMIDABLE_VALIDATOR, useExisting: CrossFieldValidator }]
})
class CrossFieldValidator implements FormidableValidator {
  public validate(model: Record<string, unknown>, target: string): Observable<string[] | null> {
    return of(target === WHOLE_FORM && model['name'] === 'Test' ? ['Not that name.'] : null);
  }
}

/**
 * A form wired the way a consumer wires one: the model is bound in, and the form's own changes are piped
 * back into it. A plain `<input ngModel>` keeps this clear of a field component's mask and render timing.
 */
@Component({
  imports: [
    FormsModule,
    NgxFormidableForm,
    NgxFormidableFieldValidate,
    NgxFormidableWholeFormValidate,
    CrossFieldValidator
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      formidableValidateWholeForm
      crossFieldValidator
      [formValue]="value"
      (formValueChange)="value = $event">
      <input
        name="name"
        [ngModel]="value.name" />
    </form>
  `
})
class RoundTripHost {
  value: Model = { name: '' };
}

describe('NgxFormidableWholeFormValidate', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function formErrorsOf(fixture: ComponentFixture<any>): Record<string, unknown> | null {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.errors;
  }

  /**
   * Two rounds. The directive resolves the form directive in `ngOnInit`, so the first validity run — the one
   * `NgForm` triggers while building its own `FormGroup` — is deliberately a no-op; the run that counts is
   * the one the first control registration causes.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function settle(fixture: ComponentFixture<any>): void {
    for (let i = 0; i < 2; i++) {
      fixture.detectChanges();
      tick();
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });
  });

  // The regression this spec exists for: as a plain attribute the input receives `''`, and a directive
  // that took it as a raw boolean would both fail the consumer's build and read it as falsy.
  it('runs from the bare attribute and reports under WHOLE_FORM', fakeAsync(() => {
    const fixture = TestBed.createComponent(BareAttributeHost);
    settle(fixture);

    expect(formErrorsOf(fixture)?.['errors']).toEqual(['The form as a whole is wrong.']);
  }));

  it('clears the root error once the model satisfies the rule', fakeAsync(() => {
    const fixture = TestBed.createComponent(BareAttributeHost);
    settle(fixture);

    expect(formErrorsOf(fixture)?.['errors']).toEqual(['The form as a whole is wrong.']);

    fixture.componentInstance.value = { name: 'Chris' };
    fixture.componentInstance.rules = { name: 'Required' };
    settle(fixture);

    expect(formErrorsOf(fixture)).toBeNull();
  }));

  // `errorsChange$` used to be typed `Record<string, string>` while holding arrays, `true`s and option
  // objects. Every entry now goes through FORMIDABLE_ERROR_EXTRACTOR, so the map is one homogeneous shape
  // whichever validator wrote it — Angular's `required` included.
  it('folds Angular’s own error keys into the same message map', fakeAsync(() => {
    const fixture = TestBed.createComponent(AngularValidatorHost);
    settle(fixture);

    expect(fixture.componentInstance.errors['name']).toEqual(['required']);
  }));

  it('does not run when switched off', fakeAsync(() => {
    const fixture = TestBed.createComponent(SwitchedOffHost);
    settle(fixture);

    expect(formErrorsOf(fixture)).toBeNull();
  }));

  // Angular invokes the root's async validator *before* it emits the `ValueChangeEvent` that
  // `formValueChange$` turns into the next `formValue`, so the bound model is a change behind at that
  // moment. The rule has to see the form's live values instead.
  it('sees the change that triggered it, not the one before', fakeAsync(() => {
    const fixture = TestBed.createComponent(RoundTripHost);
    settle(fixture);

    expect(formErrorsOf(fixture)).toBeNull();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = 'Test';
    input.dispatchEvent(new Event('input'));
    settle(fixture);

    expect(formErrorsOf(fixture)?.['errors']).toEqual(['Not that name.']);
  }));
});
