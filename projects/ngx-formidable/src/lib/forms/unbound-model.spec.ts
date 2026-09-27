import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { NgxFormidableFieldValidate } from './field-validate.directive';
import { NgxFormidableForm } from './form.directive';
import { StubValidator } from './testing/stub-validator.directive';

/**
 * Contract of a form whose model has not arrived, or never does: it still validates. The live control values
 * lead and the bound model only fills in what has no control of its own, so there is nothing for a missing
 * model to hold up.
 *
 * A form bound through `| async` is the case that matters: it reported valid until the first emission, with
 * no field ever validated, which is exactly when a submit button is most likely to be believed.
 */

interface Model extends Record<string, unknown> {
  name?: string;
}

@Component({
  imports: [FormsModule, NgxFormidableForm, NgxFormidableFieldValidate, StubValidator],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      [formValue]="value"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="name" />
    </form>
  `
})
class AsyncModelHost {
  /** Null until the stream emits. */
  value: Model | null = null;
  name = '';
  rules: Record<string, string> = { name: 'Required' };
}

/** No `[formValue]` at all. The controls are the whole truth. */
@Component({
  imports: [FormsModule, NgxFormidableForm, NgxFormidableFieldValidate, StubValidator],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="name" />
    </form>
  `
})
class NoModelHost {
  name = '';
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation without a bound model', () => {
  let fixture: ComponentFixture<AsyncModelHost | NoModelHost>;

  function control() {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get('name');
  }

  function mount(host: typeof AsyncModelHost | typeof NoModelHost): void {
    fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(fakeAsync(() => flush()));

  it('validates while the model is still null', fakeAsync(() => {
    mount(AsyncModelHost);

    expect(control()?.errors?.['errors']).toEqual(['Required']);
    expect(control()?.valid).toBe(false);
  }));

  it('keeps validating once the model arrives', fakeAsync(() => {
    mount(AsyncModelHost);

    (fixture.componentInstance as AsyncModelHost).value = { name: '' };
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();

    expect(control()?.errors?.['errors']).toEqual(['Required']);
  }));

  it('validates a form that never binds a model, against its control values', fakeAsync(() => {
    mount(NoModelHost);

    expect(control()?.errors?.['errors']).toEqual(['Required']);

    (fixture.componentInstance as NoModelHost).name = 'filled';
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();

    expect(control()?.errors).toBeNull();
  }));
});
