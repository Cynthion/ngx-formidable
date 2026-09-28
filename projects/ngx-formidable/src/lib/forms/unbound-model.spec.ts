import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { configureFormidableTestBed, settle } from '../testing/test-bed';
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
  template: `
    <form
      formidableForm
      [formValue]="model()"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="name" />
    </form>
  `
})
class AsyncModelHost {
  /** Null until the stream emits. */
  readonly model = signal<Model | null>(null);
  name = '';
  rules: Record<string, string> = { name: 'Required' };
}

/** No `[formValue]` at all. The controls are the whole truth. */
@Component({
  imports: [FormsModule, NgxFormidableForm, NgxFormidableFieldValidate, StubValidator],
  template: `
    <form
      formidableForm
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="name()" />
    </form>
  `
})
class NoModelHost {
  readonly name = signal('');
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation without a bound model', () => {
  let fixture: ComponentFixture<AsyncModelHost | NoModelHost>;

  function control() {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get('name');
  }

  /** Two passes: the first renders and commits what the host bound, which starts a run; the second lets it land. */
  async function validated(): Promise<void> {
    await settle(fixture);
    await settle(fixture);
  }

  async function mount(host: typeof AsyncModelHost | typeof NoModelHost): Promise<void> {
    fixture = TestBed.createComponent<AsyncModelHost | NoModelHost>(host);
    await validated();
  }

  beforeEach(() => configureFormidableTestBed());

  it('validates while the model is still null', async () => {
    await mount(AsyncModelHost);

    expect(control()?.errors).toEqual({ Required: true });
    expect(control()?.valid).toBe(false);
  });

  it('keeps validating once the model arrives', async () => {
    await mount(AsyncModelHost);

    (fixture.componentInstance as AsyncModelHost).model.set({ name: '' });
    await validated();

    expect(control()?.errors).toEqual({ Required: true });
  });

  it('validates a form that never binds a model, against its control values', async () => {
    await mount(NoModelHost);

    expect(control()?.errors).toEqual({ Required: true });

    (fixture.componentInstance as NoModelHost).name.set('filled');
    await validated();

    expect(control()?.errors).toBeNull();
  });
});
