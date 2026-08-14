import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { NgxFormidableFieldValidateDirective } from './field-validate.directive';
import { NgxFormidableFormDirective } from './form.directive';
import { StubValidatorDirective } from './testing/stub-validator.directive';

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
  standalone: true,
  imports: [FormsModule, NgxFormidableFormDirective, NgxFormidableFieldValidateDirective, StubValidatorDirective],
  template: `
    <form
      formidableForm
      [formValue]="value"
      [debounceMs]="200"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="value.name" />
    </form>
  `
})
class DebouncedHostComponent {
  value: Model = { name: 'filled' };
  rules: Record<string, string> = { name: 'Required' };
}

describe('validation debounce', () => {
  let fixture: ComponentFixture<DebouncedHostComponent>;

  function control() {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get('name');
  }

  function type(value: string): void {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  // The setting has to reach the fields, not just the whole-form validator. It did not before `debounceMs`
  // replaced the per-directive `validationOptions`: nothing on the `<form>` fed the `[ngModel]` directive, so
  // a field validated immediately no matter what the consumer bound.
  it('waits the form’s debounce window before a field reports', fakeAsync(() => {
    fixture = TestBed.createComponent(DebouncedHostComponent);
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();

    type('');
    tick(50);
    fixture.detectChanges();

    expect(control()?.errors).toBeNull();

    tick(200);
    fixture.detectChanges();

    expect(control()?.errors?.['errors']).toEqual(['Required']);
  }));
});
