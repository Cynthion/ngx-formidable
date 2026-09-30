import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, NgModel } from '@angular/forms';
import { form, FormField, max, maxLength, min, minLength } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { InputField } from './input-field/input-field';
import { SliderField } from './slider-field/slider-field';

/**
 * Contract of the state each forms API writes into a field, beyond what `field-contract.spec.ts` drives:
 * `[formField]` writes the schema's `name`, `min`, `max`, `minLength` and `maxLength` into the same-named
 * inputs, and `ngModel` attaches none of its directive validators to a field's control.
 */

@Component({
  imports: [FormField, InputField, SliderField],
  template: `
    <formidable-input-field [formField]="form.name" />
    <formidable-slider-field [formField]="form.amount" />
  `
})
class SchemaHost {
  readonly model = signal({ name: '', amount: 20 });
  readonly form = form(this.model, (path) => {
    minLength(path.name, 2);
    maxLength(path.name, 8);
    min(path.amount, 10);
    max(path.amount, 50);
  });
}

@Component({
  imports: [FormsModule, InputField],
  template: `<form>
    <formidable-input-field
      name="name"
      required
      minlength="3"
      [(ngModel)]="name" />
  </form>`
})
class DirectiveValidatorsHost {
  name = '';
}

describe('forms API state', () => {
  beforeEach(() => configureFormidableTestBed());

  it('takes name, minLength and maxLength from a Signal Forms schema', async () => {
    const fixture = TestBed.createComponent(SchemaHost);
    await settle(fixture);

    const input = (fixture.nativeElement as HTMLElement).querySelector('formidable-input-field input')!;

    expect(input.getAttribute('name')).toBe(fixture.componentInstance.form.name().name());
    expect(input.getAttribute('minlength')).toBe('2');
    expect(input.getAttribute('maxlength')).toBe('8');
  });

  it('takes min and max from a Signal Forms schema', async () => {
    const fixture = TestBed.createComponent(SchemaHost);
    await settle(fixture);

    const range = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="range"]')!;

    expect(range.min).toBe('10');
    expect(range.max).toBe('50');
  });

  // Angular's own gap, pinned so it is noticed once it closes.
  it('gets no directive validator attached by ngModel', async () => {
    const fixture = TestBed.createComponent(DirectiveValidatorsHost);
    await settle(fixture);

    const control = fixture.debugElement.query(By.directive(NgModel)).injector.get(NgModel).control;

    expect(control.errors).toBeNull();
  });
});
