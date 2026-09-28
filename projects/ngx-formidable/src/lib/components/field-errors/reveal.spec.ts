import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FieldErrorsRenderer } from '../../directives/field-errors-renderer';
import { NgxFormidableFieldValidate } from '../../forms/field-validate.directive';
import { NgxFormidableForm } from '../../forms/form.directive';
import { StubValidator } from '../../forms/testing/stub-validator.directive';
import { FormidableReveal } from '../../models/validation.model';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of the reveal axis: when a field's messages appear, which is the library's own and separate from
 * when the validator runs. `touched` is the default, so a form that asks for nothing behaves as it always
 * has. A field's own `revealOn` beats the form's.
 */

interface Model extends Record<string, unknown> {
  name?: string;
}

const IMPORTS = [FormsModule, NgxFormidableForm, NgxFormidableFieldValidate, StubValidator, FieldErrorsRenderer];

/** Asks for nothing, so it gets the default. */
@Component({
  imports: IMPORTS,
  template: `
    <form
      formidableForm
      [formValue]="formValue"
      [stubValidator]="rules">
      <input
        formidableFieldErrors
        name="name"
        [ngModel]="formValue.name" />
    </form>
  `
})
class DefaultHost {
  formValue: Model = { name: '' };
  rules: Record<string, string> = { name: 'Required' };
}

@Component({
  imports: IMPORTS,
  template: `
    <form
      formidableForm
      [formValue]="formValue()"
      [revealOn]="revealOn()"
      [stubValidator]="rules">
      <input
        formidableFieldErrors
        name="name"
        [ngModel]="formValue().name" />
    </form>
  `
})
class RevealHost {
  readonly revealOn = signal<FormidableReveal>('touched');
  readonly formValue = signal<Model>({ name: '' });
  rules: Record<string, string> = { name: 'Required' };
}

/** The form says one thing, this field says another. The field wins. */
@Component({
  imports: IMPORTS,
  template: `
    <form
      formidableForm
      revealOn="submitted"
      [formValue]="formValue"
      [stubValidator]="rules">
      <input
        formidableFieldErrors
        name="name"
        revealOn="always"
        [ngModel]="formValue.name" />
    </form>
  `
})
class OverrideHost {
  formValue: Model = { name: '' };
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation reveal axis', () => {
  let fixture: ComponentFixture<DefaultHost | RevealHost | OverrideHost>;
  let root: HTMLElement;

  function messages(): string[] {
    return Array.from(root.querySelectorAll('li.error')).map((el) => el.textContent!.trim());
  }

  function input(): HTMLInputElement {
    return root.querySelector('input') as HTMLInputElement;
  }

  async function touch(): Promise<void> {
    input().dispatchEvent(new FocusEvent('focus'));
    input().dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
  }

  async function submit(): Promise<void> {
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(fixture);
  }

  /** Binds, then lets the debounce window and the async validator run and paint what they produced. */
  async function mount(host: typeof DefaultHost | typeof RevealHost | typeof OverrideHost): Promise<void> {
    fixture = TestBed.createComponent<DefaultHost | RevealHost | OverrideHost>(host);
    root = fixture.nativeElement as HTMLElement;

    await settle(fixture);
  }

  beforeEach(() => {
    configureFormidableTestBed();
  });

  it('defaults to touched, so an invalid untouched field stays quiet', async () => {
    await mount(DefaultHost);

    expect(messages()).toEqual([]);

    await touch();

    expect(messages()).toEqual(['Required']);
  });

  it('reveals on dirty before any blur', async () => {
    await mount(RevealHost);
    (fixture.componentInstance as RevealHost).revealOn.set('dirty');
    (fixture.componentInstance as RevealHost).formValue.set({ name: 'filled' });
    await settle(fixture);

    fill(input(), '');
    await settle(fixture);

    // Dirty, never blurred, and reporting.
    expect(messages()).toEqual(['Required']);
  });

  it('holds everything back until submit under submitted', async () => {
    await mount(RevealHost);
    (fixture.componentInstance as RevealHost).revealOn.set('submitted');
    await settle(fixture);

    await touch();

    // Touched is not enough here, which is the whole point of the value.
    expect(messages()).toEqual([]);

    await submit();

    expect(messages()).toEqual(['Required']);
  });

  it('reveals with neither a touch nor a change under always', async () => {
    await mount(RevealHost);
    (fixture.componentInstance as RevealHost).revealOn.set('always');
    await settle(fixture);

    expect(messages()).toEqual(['Required']);
  });

  it('lets a field’s revealOn beat the form’s', async () => {
    await mount(OverrideHost);

    // The form said submitted; this field said always.
    expect(messages()).toEqual(['Required']);
  });
});
