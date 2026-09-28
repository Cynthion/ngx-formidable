import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { fill } from '../testing/dom';
import { configureFormidableTestBed, settle } from '../testing/test-bed';
import { NgxFormidableFieldValidate } from './field-validate.directive';
import { NgxFormidableForm } from './form.directive';
import { StubValidator } from './testing/stub-validator.directive';

/**
 * Contract of the debounce window: the setting a consumer puts on the `<form>` governs how long the harness
 * waits before running the validator, for every target on that form.
 *
 * A plain `<input ngModel>` is deliberate — the debounce lives in the harness, not in a field component, so
 * this stays clear of the field's own mask/render timing.
 */

interface Model extends Record<string, unknown> {
  name?: string;
}

@Component({
  imports: [FormsModule, NgxFormidableForm, NgxFormidableFieldValidate, StubValidator],
  template: `
    <form
      formidableForm
      [formValue]="model"
      [debounceMs]="debounceMs()"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="model.name" />
    </form>
  `
})
class DebouncedHost {
  readonly debounceMs = signal(200);
  model: Model = { name: 'filled' };
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation debounce', () => {
  let fixture: ComponentFixture<DebouncedHost>;

  function control() {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get('name');
  }

  /** The first pass registers the control, which starts its first run; the second waits that run's window out. */
  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(DebouncedHost);
    await settle(fixture);
    await settle(fixture, 200);
  }

  beforeEach(() => configureFormidableTestBed());

  // The setting has to reach the fields, not just the whole-form validator. It did not before `debounceMs`
  // replaced the per-directive `validationOptions`: nothing on the `<form>` fed the `[ngModel]` directive, so
  // a field validated immediately no matter what the consumer bound.
  it('waits the form’s debounce window before a field reports', async () => {
    await mount();

    fill(fixture.nativeElement.querySelector('input'), '');
    await settle(fixture, 50);

    expect(control()?.errors).toBeNull();

    await settle(fixture, 200);

    expect(control()?.errors?.['errors']).toEqual(['Required']);
  });

  // The window used to be read once per target and cached for the life of the form, so a consumer could
  // widen it and every field already seen kept the old one.
  it('takes a new debounce window after a target has already validated', async () => {
    await mount();

    // Widened after this target has been through the validator once, which is what used to be too late.
    fixture.componentInstance.debounceMs.set(1000);
    await settle(fixture);

    fill(fixture.nativeElement.querySelector('input'), '');
    await settle(fixture, 500);

    // Half a second in, the old 200ms window would long since have reported.
    expect(control()?.status).toBe('PENDING');
    expect(control()?.errors).toBeNull();

    await settle(fixture, 600);

    expect(control()?.errors?.['errors']).toEqual(['Required']);
  });
});
