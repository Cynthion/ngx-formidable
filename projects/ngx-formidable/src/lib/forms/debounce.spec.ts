import { Component, ChangeDetectionStrategy } from '@angular/core';
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
  imports: [FormsModule, NgxFormidableFormDirective, NgxFormidableFieldValidateDirective, StubValidatorDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      [formValue]="value"
      [debounceMs]="debounceMs"
      [stubValidator]="rules">
      <input
        name="name"
        [ngModel]="value.name" />
    </form>
  `
})
class DebouncedHostComponent {
  debounceMs = 200;
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

  // The window used to be read once per target and cached for the life of the form, so a consumer could
  // widen it and every field already seen kept the old one.
  it('takes a new debounce window after a target has already validated', fakeAsync(() => {
    fixture = TestBed.createComponent(DebouncedHostComponent);
    fixture.detectChanges();
    tick(500);
    fixture.detectChanges();

    // Widened after this target has been through the validator once, which is what used to be too late.
    fixture.componentInstance.debounceMs = 1000;
    fixture.detectChanges();

    type('');
    tick(500);
    fixture.detectChanges();

    // Half a second in, the old 200ms window would long since have reported.
    expect(control()?.status).toBe('PENDING');
    expect(control()?.errors).toBeNull();

    tick(600);
    fixture.detectChanges();

    expect(control()?.errors?.['errors']).toEqual(['Required']);
  }));
});
