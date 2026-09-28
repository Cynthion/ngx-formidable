import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, NgModel } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { FieldErrorsRenderer } from '../../directives/field-errors-renderer';
import { StubValidator } from '../../forms/testing/stub-validator.directive';
import { FieldHint } from '../../directives/field-hint';
import { FieldLabel } from '../../directives/field-label';
import { NgxFormidableForm } from '../../forms/form.directive';
import { FormidableOption } from '../../models/formidable.model';
import { fill, referenced } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { CheckboxGroupField } from '../fields/checkbox-group-field/checkbox-group-field';
import { InputField } from '../fields/input-field/input-field';
import { RadioGroupField } from '../fields/radio-group-field/radio-group-field';
import { SliderField } from '../fields/slider-field/slider-field';
import { ToggleField } from '../fields/toggle-field/toggle-field';
import { FieldDecorator } from './field-decorator';

/**
 * Contract of the fields' ARIA wiring.
 *
 * The decorator owns the label, the hint and the errors, so it is what mints the ids they carry —
 * `{fieldId}-label`, `{fieldId}-hint`, `{fieldId}-errors`. A field reads them back by injecting its
 * decorator optionally, which is why a field used on its own emits neither `aria-labelledby` nor
 * `aria-describedby` rather than pointing at ids that do not exist.
 *
 * `aria-describedby` is unconditional: both wrappers always render, and a reference to a hidden or empty
 * element contributes nothing to the accessible description, so there is no state here to go stale.
 *
 * `aria-labelledby` exists for the fields a `<label for>` cannot reach — the two groups and the slider
 * (`vertical` layout renders its label as a `div`) and the toggle (its `[id]` is on a hidden checkbox,
 * while the focusable element is the `role="switch"` div). Those are also the fields that had no
 * accessible name at all before this.
 *
 * `aria-invalid` is the one attribute that needs a repaint: validity lives in the errors component,
 * whose `markForCheck` reaches its own ancestors and never the sibling field. `FieldErrorsRenderer`
 * therefore pumps the field as well — the end-to-end spec at the bottom is what pins that hop.
 */

interface Model {
  field?: string;
}

const shape = { field: '' };

const options: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

@Component({
  imports: [
    FormsModule,
    FieldDecorator,
    RadioGroupField,
    CheckboxGroupField,
    ToggleField,
    SliderField,
    FieldLabel,
    FieldHint
  ],
  template: `
    <formidable-field-decorator>
      <formidable-radio-group-field
        name="colour"
        [options]="options"
        [required]="required()"
        [readonly]="readonly()"
        [disabled]="disabled()" />
      <div formidableFieldLabel>Favourite colour</div>
      @if (hasHint) {
        <div formidableFieldHint>Pick one.</div>
      }
    </formidable-field-decorator>

    <formidable-field-decorator>
      <formidable-checkbox-group-field
        name="colours"
        [options]="options" />
      <div formidableFieldLabel>Colours you like</div>
    </formidable-field-decorator>

    <formidable-field-decorator>
      <formidable-toggle-field
        name="notify"
        offLabel="Off" />
      <div formidableFieldLabel>Notifications</div>
    </formidable-field-decorator>

    <formidable-field-decorator>
      <formidable-slider-field
        name="amount"
        [transformValueToThumbLabel]="transform()" />
      <div formidableFieldLabel>Amount</div>
    </formidable-field-decorator>
  `
})
class NamedFieldsHost {
  options = options;
  readonly required = signal(false);
  readonly readonly = signal(false);
  readonly disabled = signal(false);
  hasHint = true;
  readonly transform = signal<((value: number) => string) | undefined>(undefined);
}

/** The same group with nothing projected to name it. */
@Component({
  imports: [FieldDecorator, RadioGroupField],
  template: `
    <formidable-field-decorator>
      <formidable-radio-group-field name="colour" />
    </formidable-field-decorator>
  `
})
class UnlabelledHost {}

/** An input with real validation behind it — the only way to reach the invalid state honestly. */
@Component({
  imports: [
    FormsModule,
    NgxFormidableForm,
    StubValidator,
    FieldDecorator,
    InputField,
    FieldErrorsRenderer,
    FieldLabel,
    FieldHint
  ],
  template: `
    <form
      formidableForm
      [formValue]="formValue"
      [formShape]="shape"
      [stubValidator]="required">
      <formidable-field-decorator>
        <formidable-input-field
          formidableFieldErrors
          name="field"
          [ngModel]="formValue.field" />
        <div formidableFieldLabel>Field</div>
        <div formidableFieldHint>Some hint.</div>
      </formidable-field-decorator>
    </form>
  `
})
class ErrorsHost {
  formValue: Model = {};
  shape = shape;
  required = { field: 'Required.' };
}

/** The shape a consumer uses for a bare field: no decorator, so nothing to point at. */
@Component({
  imports: [FormsModule, InputField],
  template: `<formidable-input-field name="field" />`
})
class NoDecoratorHost {}

describe('field ARIA', () => {
  beforeEach(() => configureFormidableTestBed());

  /** What a screen reader would actually read out of an idref list, empty references dropped. */
  function textOf(control: HTMLElement, attribute: string): string {
    return referenced(control, attribute)
      .map((element) => element?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
  }

  describe('naming the fields a <label for> cannot reach', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<NamedFieldsHost>>;
    let root: HTMLElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(NamedFieldsHost);
      fixture.detectChanges();
      root = fixture.nativeElement as HTMLElement;
    });

    function control(selector: string): HTMLElement {
      return root.querySelector(selector) as HTMLElement;
    }

    it('names the radio group from the projected label', () => {
      expect(textOf(control('[role="radiogroup"]'), 'aria-labelledby')).toBe('Favourite colour');
    });

    it('names the checkbox group from the projected label', () => {
      expect(textOf(control('[role="group"]'), 'aria-labelledby')).toBe('Colours you like');
    });

    // The toggle's own `offLabel` is state text, not a name — `aria-checked` is what carries the state.
    it('names the toggle from the projected label rather than from its own state text', () => {
      expect(textOf(control('[role="switch"]'), 'aria-labelledby')).toBe('Notifications');
    });

    it('names the slider from the projected label', () => {
      expect(textOf(control('input[type="range"]'), 'aria-labelledby')).toBe('Amount');
    });

    it('emits no aria-labelledby when no label is projected', () => {
      const unlabelled = TestBed.createComponent(UnlabelledHost);
      unlabelled.detectChanges();

      const group = unlabelled.nativeElement.querySelector('[role="radiogroup"]') as HTMLElement;

      expect(group.getAttribute('aria-labelledby')).toBeNull();
    });

    // The fieldset used to name itself from the raw control name, which duplicated the label above.
    it('renders no legend in the vertical layout', () => {
      expect(root.querySelector('fieldset')).not.toBeNull();
      expect(root.querySelector('legend')).toBeNull();
    });
  });

  describe('state', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<NamedFieldsHost>>;
    let root: HTMLElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(NamedFieldsHost);
      fixture.detectChanges();
      root = fixture.nativeElement as HTMLElement;
    });

    function group(): HTMLElement {
      return root.querySelector('[role="radiogroup"]') as HTMLElement;
    }

    it('reports required only while the field is required', () => {
      expect(group().getAttribute('aria-required')).toBeNull();

      fixture.componentInstance.required.set(true);
      fixture.detectChanges();

      expect(group().getAttribute('aria-required')).toBe('true');
    });

    // A `div` has no native `readonly` / `disabled` to speak for it.
    it('reports readonly and disabled on a div-rooted field', () => {
      fixture.componentInstance.readonly.set(true);
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(group().getAttribute('aria-readonly')).toBe('true');
      expect(group().getAttribute('aria-disabled')).toBe('true');
    });

    it('tracks the toggle state, which was a CSS class only', async () => {
      const toggle = root.querySelector('[role="switch"]') as HTMLElement;

      expect(toggle.getAttribute('aria-checked')).toBe('false');

      toggle.click();
      await settle(fixture);

      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    // A native range already reports its number; only a transformed value is something it cannot infer.
    it('gives the slider a valuetext only once the value is transformed', async () => {
      const range = root.querySelector('input[type="range"]') as HTMLInputElement;

      fill(range, '50');
      await settle(fixture);

      expect(range.getAttribute('aria-valuetext')).toBeNull();

      fixture.componentInstance.transform.set((value: number) => `${value} francs`);
      fixture.detectChanges();

      expect(range.getAttribute('aria-valuetext')).toBe('50 francs');
    });
  });

  describe('descriptions', () => {
    it('describes the field with its hint', () => {
      const fixture = TestBed.createComponent(NamedFieldsHost);
      fixture.detectChanges();

      const root = fixture.nativeElement as HTMLElement;
      const group = root.querySelector('[role="radiogroup"]') as HTMLElement;

      expect(textOf(group, 'aria-describedby')).toBe('Pick one.');
    });

    it('describes nothing while the hint and the errors are empty', () => {
      const fixture = TestBed.createComponent(NamedFieldsHost);
      fixture.componentInstance.hasHint = false;
      fixture.detectChanges();

      const root = fixture.nativeElement as HTMLElement;
      const group = root.querySelector('[role="radiogroup"]') as HTMLElement;

      // The attribute still points at both wrappers — they simply have nothing to contribute.
      expect(group.getAttribute('aria-describedby')).toBeTruthy();
      expect(textOf(group, 'aria-describedby')).toBe('');
    });

    it('emits neither aria-labelledby nor aria-describedby without a decorator', () => {
      const fixture = TestBed.createComponent(NoDecoratorHost);
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('input') as HTMLElement;

      expect(input.getAttribute('aria-labelledby')).toBeNull();
      expect(input.getAttribute('aria-describedby')).toBeNull();
    });

    // The end-to-end one: nothing here calls `markForCheck` or `detectChanges()` by hand. The input field is
    // `OnPush` and the errors are its sibling, so without the pump in `FieldErrorsRenderer` both assertions
    // fail. The first `settle` is what lets the debounced validator run — until it does the form stays
    // `PENDING`, `idle$` never emits, and the directive is not yet listening to the control.
    it('picks up the error message and reports invalid once the control is touched and invalid', async () => {
      const fixture = TestBed.createComponent(ErrorsHost);
      await settle(fixture);

      const root = fixture.nativeElement as HTMLElement;
      const input = root.querySelector('input') as HTMLElement;
      const control = fixture.debugElement.query(By.css('formidable-input-field')).injector.get(NgModel).control;

      expect(textOf(input, 'aria-describedby')).toBe('Some hint.');
      expect(input.getAttribute('aria-invalid')).toBeNull();

      control.markAsTouched();
      control.setErrors({ errors: ['Required.'] });
      await settle(fixture);

      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(textOf(input, 'aria-describedby')).toBe('Some hint. Required.');
    });
  });
});
