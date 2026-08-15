import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { NgxFormidableFieldValidateDirective } from './field-validate.directive';
import { NgxFormidableFormDirective } from './form.directive';
import { StubValidatorDirective } from './testing/stub-validator.directive';

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
  standalone: true,
  imports: [FormsModule, NgxFormidableFormDirective, NgxFormidableFieldValidateDirective, StubValidatorDirective],
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
class AsyncModelHostComponent {
  /** Null until the stream emits. */
  value: Model | null = null;
  name = '';
  rules: Record<string, string> = { name: 'Required' };
}

/** No `[formValue]` at all. The controls are the whole truth. */
@Component({
  standalone: true,
  imports: [FormsModule, NgxFormidableFormDirective, NgxFormidableFieldValidateDirective, StubValidatorDirective],
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
class NoModelHostComponent {
  name = '';
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation without a bound model', () => {
  let fixture: ComponentFixture<AsyncModelHostComponent | NoModelHostComponent>;

  function control() {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get('name');
  }

  function mount(host: typeof AsyncModelHostComponent | typeof NoModelHostComponent): void {
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
    mount(AsyncModelHostComponent);

    expect(control()?.errors?.['errors']).toEqual(['Required']);
    expect(control()?.valid).toBe(false);
  }));

  it('keeps validating once the model arrives', fakeAsync(() => {
    mount(AsyncModelHostComponent);

    (fixture.componentInstance as AsyncModelHostComponent).value = { name: '' };
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();

    expect(control()?.errors?.['errors']).toEqual(['Required']);
  }));

  it('validates a form that never binds a model, against its control values', fakeAsync(() => {
    mount(NoModelHostComponent);

    expect(control()?.errors?.['errors']).toEqual(['Required']);

    (fixture.componentInstance as NoModelHostComponent).name = 'filled';
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();

    expect(control()?.errors).toBeNull();
  }));
});
