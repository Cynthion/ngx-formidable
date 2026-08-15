import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { FORMIDABLE_VALIDATOR } from '../models/validation.model';
import { NgxFormidableFieldValidateDirective } from './field-validate.directive';
import { NgxFormidableFormDirective } from './form.directive';
import { StubValidatorDirective } from './testing/stub-validator.directive';

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
  standalone: true,
  imports: [FormsModule, NgxFormidableFormDirective, NgxFormidableFieldValidateDirective, StubValidatorDirective],
  template: `
    <form
      formidableForm
      [formValue]="value"
      [ngFormOptions]="{ updateOn: updateOn }"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="value.name" />
    </form>
  `
})
class RunHostComponent {
  updateOn: 'change' | 'blur' | 'submit' = 'change';
  value: Model = { name: 'filled' };
  rules: Record<string, string> = { name: 'Required' };
}

/** The form asks for `blur`, this one field asks for `change`. The field wins — that is Angular's rule. */
@Component({
  standalone: true,
  imports: [FormsModule, NgxFormidableFormDirective, NgxFormidableFieldValidateDirective, StubValidatorDirective],
  template: `
    <form
      formidableForm
      [formValue]="value"
      [ngFormOptions]="{ updateOn: 'blur' }"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="value.name"
        [ngModelOptions]="{ updateOn: 'change' }" />
    </form>
  `
})
class OverrideHostComponent {
  value: Model = { name: 'filled' };
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation run axis', () => {
  let fixture: ComponentFixture<RunHostComponent | OverrideHostComponent>;
  let runs: jasmine.Spy;

  function control() {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get('name');
  }

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
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
   * goes through.
   */
  function mount(
    host: typeof RunHostComponent | typeof OverrideHostComponent,
    updateOn?: 'change' | 'blur' | 'submit'
  ): void {
    fixture = TestBed.createComponent(host);

    // Set before the first pass: `NgForm` reads its options once, in `ngAfterViewInit`.
    if (updateOn) (fixture.componentInstance as RunHostComponent).updateOn = updateOn;

    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();

    const validator = fixture.debugElement.children[0]!.injector.get(FORMIDABLE_VALIDATOR);
    runs = spyOn(validator, 'validate').and.callThrough();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(fakeAsync(() => flush()));

  // Settled between keystrokes on purpose: the commit is immediate, but the run is debounced, and three
  // keystrokes inside one window are one run by design. That is the debounce axis, not this one.
  it('commits on every keystroke under change, and runs with each', fakeAsync(() => {
    mount(RunHostComponent, 'change');

    type('a');
    expect(control()?.value).toBe('a');
    tick(500);

    type('ab');
    expect(control()?.value).toBe('ab');
    tick(500);

    type('abc');
    expect(control()?.value).toBe('abc');
    tick(500);

    expect(runs.calls.count()).toBe(3);
  }));

  it('commits and runs once per blur under blur, and not while typing', fakeAsync(() => {
    mount(RunHostComponent, 'blur');

    type('a');
    type('ab');
    type('abc');
    tick(500);

    // The value is still what the form was given: typing has committed nothing.
    expect(control()?.value).toBe('filled');
    expect(runs.calls.count()).toBe(0);

    blur();
    tick(500);

    expect(control()?.value).toBe('abc');
    expect(runs.calls.count()).toBe(1);
  }));

  it('commits and runs once per submit under submit, and not on blur', fakeAsync(() => {
    mount(RunHostComponent, 'submit');

    type('abc');
    blur();
    tick(500);

    expect(control()?.value).toBe('filled');
    expect(runs.calls.count()).toBe(0);

    submit();
    tick(500);

    expect(control()?.value).toBe('abc');
    expect(runs.calls.count()).toBe(1);
  }));

  it('lets a field’s ngModelOptions beat the form’s ngFormOptions', fakeAsync(() => {
    mount(OverrideHostComponent);

    type('abc');
    tick(500);

    // The form said blur; this field said change, and change is what it got.
    expect(control()?.value).toBe('abc');
    expect(runs.calls.count()).toBe(1);
  }));
});
