import { ChangeDetectorRef, Component, input, model, signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, NgModel, ReactiveFormsModule } from '@angular/forms';
import {
  form,
  FormField,
  FormValueControl,
  max,
  maxLength,
  min,
  minLength,
  ParseResult,
  transformedValue,
  ValidationError
} from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { InputField } from './input-field/input-field';
import { SliderField } from './slider-field/slider-field';

/**
 * Contract of the state each forms API writes into a field, beyond what `field-contract.spec.ts` drives:
 * `[formField]` writes the schema's `name`, `min`, `max`, `minLength` and `maxLength` into the same-named
 * inputs, `ngModel` attaches none of its directive validators to a field's control, and the classic APIs
 * hand a custom control its parse error only on the host's next check.
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

/** A custom control that parses its text with `transformedValue`, as `BaseDateTimeField` does. */
@Component({
  selector: 'formidable-parsing-control',
  template: `<input
    [value]="text()"
    (input)="text.set($any($event.target).value)" />`
})
class ParsingControl implements FormValueControl<number | null> {
  readonly value = model<number | null>(null);
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  protected readonly text = transformedValue(this.value, {
    parse: (text: string): ParseResult<number | null> =>
      Number.isNaN(Number(text)) ? { error: { kind: 'parse' } } : { value: Number(text) },
    format: (value: number | null) => String(value ?? '')
  });
}

@Component({
  imports: [ReactiveFormsModule, ParsingControl],
  template: `<formidable-parsing-control [formControl]="control" />`
})
class ReactiveParsingHost {
  readonly control = new FormControl<number | null>(null);
}

@Component({
  imports: [FormsModule, ParsingControl],
  template: `<formidable-parsing-control [(ngModel)]="amount" />`
})
class TemplateDrivenParsingHost {
  amount: number | null = null;
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

  // Angular's own gap, pinned so it is noticed once it closes: https://github.com/angular/angular/issues/69756.
  it('gets no directive validator attached by ngModel', async () => {
    const fixture = TestBed.createComponent(DirectiveValidatorsHost);
    await settle(fixture);

    const control = fixture.debugElement.query(By.directive(NgModel)).injector.get(NgModel).control;

    expect(control.errors).toBeNull();
  });

  // Angular's own lag, which `BaseDateTimeField` works around, pinned so it is noticed once it closes:
  // https://github.com/angular/angular/issues/71127.
  const parsingHosts: Record<string, Type<ReactiveParsingHost | TemplateDrivenParsingHost>> = {
    'reactive': ReactiveParsingHost,
    'template-driven': TemplateDrivenParsingHost
  };

  for (const [api, host] of Object.entries(parsingHosts)) {
    it(`hands a custom control its parse error only on the host's next check, bound ${api}`, async () => {
      const fixture = TestBed.createComponent(host);
      await settle(fixture);

      const control = fixture.debugElement.query(By.directive(ParsingControl));
      const errors = () => (control.componentInstance as ParsingControl).errors().map((error) => error.kind);

      fill(control.nativeElement.querySelector('input'), 'x');
      await settle(fixture);

      expect(errors()).toEqual([]);

      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      await settle(fixture);

      expect(errors()).toEqual(['parse']);
    });
  }
});
