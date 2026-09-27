import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { FORMIDABLE_VALIDATOR } from '../models/validation.model';
import { fill } from '../testing/dom';
import { configureFormidableTestBed, settle } from '../testing/test-bed';
import { NgxFormidableFieldValidate } from './field-validate.directive';
import { NgxFormidableForm } from './form.directive';
import { StubValidator } from './testing/stub-validator.directive';

/**
 * Contract of the run axis: when the validator runs is Angular's `updateOn`, set with `ngFormOptions` on the
 * form and overridden with `ngModelOptions` on one field. The library adds no input of its own, so what these
 * pin is that the harness does not get in the way: a commit lands exactly once per keystroke, per blur or per
 * submit, and the validator runs with it.
 *
 * A plain `<input ngModel>` is deliberate, as in `debounce.spec.ts` — the run axis belongs to Angular, not to
 * a field component, so this stays clear of the field's own mask and render timing.
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
      [ngFormOptions]="{ updateOn: updateOn }"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="model.name" />
    </form>
  `
})
class RunHost {
  updateOn: 'change' | 'blur' | 'submit' = 'change';
  model: Model = { name: 'filled' };
  rules: Record<string, string> = { name: 'Required' };
}

/** The form asks for `blur`, this one field asks for `change`. The field wins — that is Angular's rule. */
@Component({
  imports: [FormsModule, NgxFormidableForm, NgxFormidableFieldValidate, StubValidator],
  template: `
    <form
      formidableForm
      [formValue]="model"
      [ngFormOptions]="{ updateOn: 'blur' }"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="model.name"
        [ngModelOptions]="{ updateOn: 'change' }" />
    </form>
  `
})
class OverrideHost {
  model: Model = { name: 'filled' };
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation run axis', () => {
  let fixture: ComponentFixture<RunHost | OverrideHost>;
  let runs: jasmine.Spy;

  function control() {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get('name');
  }

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  function blur(): void {
    input().dispatchEvent(new FocusEvent('blur'));
  }

  function submit(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true })
    );
  }

  /**
   * Mounts, settles the initial validation, then spies on the validator so every run counted below is one the
   * spec caused. The spy sits on the `FORMIDABLE_VALIDATOR` the form provides, which is the seam every target
   * goes through. Two passes: the first registers the control, which starts the initial run, and the second
   * lets that run land.
   */
  async function mount(
    host: typeof RunHost | typeof OverrideHost,
    updateOn?: 'change' | 'blur' | 'submit'
  ): Promise<void> {
    fixture = TestBed.createComponent(host);

    // Set before the first pass: `NgForm` reads its options once, in `ngAfterViewInit`.
    if (updateOn) (fixture.componentInstance as RunHost).updateOn = updateOn;

    await settle(fixture);
    await settle(fixture);

    const validator = fixture.debugElement.children[0]!.injector.get(FORMIDABLE_VALIDATOR);
    runs = spyOn(validator, 'validate').and.callThrough();
  }

  beforeEach(() => configureFormidableTestBed());

  // Settled between keystrokes on purpose: the commit is immediate, but the run is debounced, and three
  // keystrokes inside one window are one run by design. That is the debounce axis, not this one.
  it('commits on every keystroke under change, and runs with each', async () => {
    await mount(RunHost, 'change');

    fill(input(), 'a');
    expect(control()?.value).toBe('a');
    await settle(fixture);

    fill(input(), 'ab');
    expect(control()?.value).toBe('ab');
    await settle(fixture);

    fill(input(), 'abc');
    expect(control()?.value).toBe('abc');
    await settle(fixture);

    expect(runs.calls.count()).toBe(3);
  });

  it('commits and runs once per blur under blur, and not while typing', async () => {
    await mount(RunHost, 'blur');

    fill(input(), 'a');
    fill(input(), 'ab');
    fill(input(), 'abc');
    await settle(fixture);

    // The value is still what the form was given: typing has committed nothing.
    expect(control()?.value).toBe('filled');
    expect(runs.calls.count()).toBe(0);

    blur();
    await settle(fixture);

    expect(control()?.value).toBe('abc');
    expect(runs.calls.count()).toBe(1);
  });

  it('commits and runs once per submit under submit, and not on blur', async () => {
    await mount(RunHost, 'submit');

    fill(input(), 'abc');
    blur();
    await settle(fixture);

    expect(control()?.value).toBe('filled');
    expect(runs.calls.count()).toBe(0);

    submit();
    await settle(fixture);

    expect(control()?.value).toBe('abc');
    expect(runs.calls.count()).toBe(1);
  });

  it('lets a field’s ngModelOptions beat the form’s ngFormOptions', async () => {
    await mount(OverrideHost);

    fill(input(), 'abc');
    await settle(fixture);

    // The form said blur; this field said change, and change is what it got.
    expect(control()?.value).toBe('abc');
    expect(runs.calls.count()).toBe(1);
  });
});
