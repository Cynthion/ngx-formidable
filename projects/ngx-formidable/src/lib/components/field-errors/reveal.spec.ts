import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FieldErrorsDirective } from '../../directives/field-errors.directive';
import { NgxFormidableFieldValidateDirective } from '../../forms/field-validate.directive';
import { NgxFormidableFormDirective } from '../../forms/form.directive';
import { StubValidatorDirective } from '../../forms/testing/stub-validator.directive';
import { FormidableReveal } from '../../models/validation.model';

/**
 * Contract of the reveal axis: when a field's messages appear, which is the library's own and separate from
 * when the validator runs. `touched` is the default, so a form that asks for nothing behaves as it always
 * has. A field's own `revealOn` beats the form's.
 */

interface Model extends Record<string, unknown> {
  name?: string;
}

const IMPORTS = [
  FormsModule,
  NgxFormidableFormDirective,
  NgxFormidableFieldValidateDirective,
  StubValidatorDirective,
  FieldErrorsDirective
];

/** Asks for nothing, so it gets the default. */
@Component({
  standalone: true,
  imports: IMPORTS,
  template: `
    <form
      formidableForm
      [formValue]="value"
      [stubValidator]="rules">
      <input
        formidableFieldErrors
        name="name"
        [ngModel]="value.name" />
    </form>
  `
})
class DefaultHostComponent {
  value: Model = { name: '' };
  rules: Record<string, string> = { name: 'Required' };
}

@Component({
  standalone: true,
  imports: IMPORTS,
  template: `
    <form
      formidableForm
      [formValue]="value"
      [revealOn]="revealOn"
      [stubValidator]="rules">
      <input
        formidableFieldErrors
        name="name"
        [ngModel]="value.name" />
    </form>
  `
})
class RevealHostComponent {
  revealOn: FormidableReveal = 'touched';
  value: Model = { name: '' };
  rules: Record<string, string> = { name: 'Required' };
}

/** The form says one thing, this field says another. The field wins. */
@Component({
  standalone: true,
  imports: IMPORTS,
  template: `
    <form
      formidableForm
      revealOn="submitted"
      [formValue]="value"
      [stubValidator]="rules">
      <input
        formidableFieldErrors
        name="name"
        revealOn="always"
        [ngModel]="value.name" />
    </form>
  `
})
class OverrideHostComponent {
  value: Model = { name: '' };
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation reveal axis', () => {
  let fixture: ComponentFixture<DefaultHostComponent | RevealHostComponent | OverrideHostComponent>;
  let root: HTMLElement;

  function messages(): string[] {
    return Array.from(root.querySelectorAll('li.error')).map((el) => el.textContent!.trim());
  }

  function input(): HTMLInputElement {
    return root.querySelector('input') as HTMLInputElement;
  }

  function touch(): void {
    input().dispatchEvent(new FocusEvent('focus'));
    input().dispatchEvent(new FocusEvent('blur'));
    settle();
  }

  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    settle();
  }

  function submit(): void {
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    settle();
  }

  /** Binds, lets the debounce window and the async validator run, then paints what they produced. */
  function settle(): void {
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();
  }

  function mount(host: typeof DefaultHostComponent | typeof RevealHostComponent | typeof OverrideHostComponent): void {
    fixture = TestBed.createComponent(host);
    root = fixture.nativeElement as HTMLElement;

    fixture.detectChanges();
    settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(fakeAsync(() => flush()));

  it('defaults to touched, so an invalid untouched field stays quiet', fakeAsync(() => {
    mount(DefaultHostComponent);

    expect(messages()).toEqual([]);

    touch();

    expect(messages()).toEqual(['Required']);
  }));

  it('reveals on dirty before any blur', fakeAsync(() => {
    mount(RevealHostComponent);
    (fixture.componentInstance as RevealHostComponent).revealOn = 'dirty';
    (fixture.componentInstance as RevealHostComponent).value = { name: 'filled' };
    settle();

    type('');

    // Dirty, never blurred, and reporting.
    expect(messages()).toEqual(['Required']);
  }));

  it('holds everything back until submit under submitted', fakeAsync(() => {
    mount(RevealHostComponent);
    (fixture.componentInstance as RevealHostComponent).revealOn = 'submitted';
    settle();

    touch();

    // Touched is not enough here, which is the whole point of the value.
    expect(messages()).toEqual([]);

    submit();

    expect(messages()).toEqual(['Required']);
  }));

  it('reveals with neither a touch nor a change under always', fakeAsync(() => {
    mount(RevealHostComponent);
    (fixture.componentInstance as RevealHostComponent).revealOn = 'always';
    settle();

    expect(messages()).toEqual(['Required']);
  }));

  it('lets a field’s revealOn beat the form’s', fakeAsync(() => {
    mount(OverrideHostComponent);

    // The form said submitted; this field said always.
    expect(messages()).toEqual(['Required']);
  }));
});
