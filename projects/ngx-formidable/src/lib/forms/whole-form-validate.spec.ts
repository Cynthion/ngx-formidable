import { Component, Directive, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { InputField } from '../components/fields/input-field/input-field';
import {
  FORMIDABLE_VALIDATOR,
  FormidableFormErrors,
  FormidableValidator,
  WHOLE_FORM
} from '../models/validation.model';
import { fill } from '../testing/dom';
import { configureFormidableTestBed, settle } from '../testing/test-bed';
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
  template: `
    <form
      formidableForm
      formidableValidateWholeForm
      [formValue]="model()"
      [stubValidator]="rules()">
      <formidable-input-field
        name="name"
        [ngModel]="model().name" />
    </form>
  `
})
class BareAttributeHost {
  readonly model = signal<Model>({});
  readonly rules = signal<Record<string, string>>({ [WHOLE_FORM]: 'The form as a whole is wrong.', name: 'Required' });
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
  template: `
    <form
      formidableForm
      [formValue]="model"
      [formidableValidateWholeForm]="false"
      [stubValidator]="rules">
      <formidable-input-field
        name="name"
        [ngModel]="model.name" />
    </form>
  `
})
class SwitchedOffHost {
  model: Model = {};
  rules = { [WHOLE_FORM]: 'The form as a whole is wrong.' };
}

/** A form whose only rule is Angular's own `required`, so `errorsChange$` has a non-message shape to fold. */
@Component({
  imports: [FormsModule, NgxFormidableForm, InputField],
  template: `
    <form
      formidableForm
      [formValue]="model"
      (errorsChange)="errors = $event">
      <formidable-input-field
        name="name"
        [required]="true"
        [ngModel]="model.name" />
    </form>
  `
})
class AngularValidatorHost {
  model: Model = {};
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
  template: `
    <form
      formidableForm
      formidableValidateWholeForm
      crossFieldValidator
      [formValue]="model"
      (formValueChange)="model = $event">
      <input
        name="name"
        [ngModel]="model.name" />
    </form>
  `
})
class RoundTripHost {
  model: Model = { name: '' };
}

describe('NgxFormidableWholeFormValidate', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function formErrorsOf(fixture: ComponentFixture<any>): Record<string, unknown> | null {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.errors;
  }

  /**
   * Two passes. The directive resolves the form directive in `ngOnInit`, so the first validity run — the one
   * `NgForm` triggers while building its own `FormGroup` — is deliberately a no-op; the run that counts is
   * the one the first control registration causes, and the second pass lets it land.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function validated(fixture: ComponentFixture<any>): Promise<void> {
    await settle(fixture);
    await settle(fixture);
  }

  beforeEach(() => configureFormidableTestBed());

  // The regression this spec exists for: as a plain attribute the input receives `''`, and a directive
  // that took it as a raw boolean would both fail the consumer's build and read it as falsy.
  it('runs from the bare attribute and reports under WHOLE_FORM', async () => {
    const fixture = TestBed.createComponent(BareAttributeHost);
    await validated(fixture);

    expect(formErrorsOf(fixture)?.['errors']).toEqual(['The form as a whole is wrong.']);
  });

  it('clears the root error once the model satisfies the rule', async () => {
    const fixture = TestBed.createComponent(BareAttributeHost);
    await validated(fixture);

    expect(formErrorsOf(fixture)?.['errors']).toEqual(['The form as a whole is wrong.']);

    fixture.componentInstance.model.set({ name: 'Chris' });
    fixture.componentInstance.rules.set({ name: 'Required' });
    await validated(fixture);

    expect(formErrorsOf(fixture)).toBeNull();
  });

  // `errorsChange$` used to be typed `Record<string, string>` while holding arrays, `true`s and option
  // objects. Every entry now goes through FORMIDABLE_ERROR_EXTRACTOR, so the map is one homogeneous shape
  // whichever validator wrote it — Angular's `required` included.
  it('folds Angular’s own error keys into the same message map', async () => {
    const fixture = TestBed.createComponent(AngularValidatorHost);
    await validated(fixture);

    expect(fixture.componentInstance.errors['name']).toEqual(['required']);
  });

  it('does not run when switched off', async () => {
    const fixture = TestBed.createComponent(SwitchedOffHost);
    await validated(fixture);

    expect(formErrorsOf(fixture)).toBeNull();
  });

  // Angular invokes the root's async validator *before* it emits the `ValueChangeEvent` that
  // `formValueChange$` turns into the next `formValue`, so the bound model is a change behind at that
  // moment. The rule has to see the form's live values instead.
  it('sees the change that triggered it, not the one before', async () => {
    const fixture = TestBed.createComponent(RoundTripHost);
    await validated(fixture);

    expect(formErrorsOf(fixture)).toBeNull();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    fill(input, 'Test');
    await validated(fixture);

    expect(formErrorsOf(fixture)?.['errors']).toEqual(['Not that name.']);
  });
});
