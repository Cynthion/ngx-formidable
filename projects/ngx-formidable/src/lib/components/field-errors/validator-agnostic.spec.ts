import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ValidationError } from '@angular/forms/signals';
import { FieldLabel } from '../../directives/field-label';
import { NgxFormidableFieldValidate } from '../../forms/field-validate.directive';
import { FORMIDABLE_ERROR_MESSAGE } from '../../models/validation.model';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, DIRECTIVE_VALIDATORS_UNATTACHED, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { InputField } from '../fields/input-field/input-field';

/**
 * Contract of the library's independence from any one validation library.
 *
 * Errors reach the UI through what `ngModel` writes into the field, so the decorator's `.is-invalid` state,
 * the field's `aria-invalid` and the message list must all work with no formidable form directive, no
 * `FORMIDABLE_VALIDATOR` and no validation library — driven by Angular's built-in validators alone.
 *
 * An Angular error reaches the field as its key, `{ kind: 'required' }`, which `FORMIDABLE_ERROR_MESSAGE`
 * renders as it is by default and as a consumer's text once overridden.
 */

@Component({
  imports: [FormsModule, FieldDecorator, InputField, FieldLabel],
  template: `
    <form>
      <formidable-field-decorator>
        <formidable-input-field
          name="name"
          [required]="true"
          [minlength]="3"
          [(ngModel)]="name" />
        <div formidableFieldLabel>Name</div>
      </formidable-field-decorator>
    </form>
  `
})
class AngularValidatorsHost {
  name = '';
}

/** The same field with the `[ngModel]` hijack directive imported and no harness above it. */
@Component({
  imports: [FormsModule, NgxFormidableFieldValidate, FieldDecorator, InputField],
  template: `
    <form>
      <formidable-field-decorator>
        <formidable-input-field
          name="name"
          [required]="true"
          [(ngModel)]="name" />
      </formidable-field-decorator>
    </form>
  `
})
class HijackWithoutHarnessHost {
  name = '';
}

describe('validator-agnostic error rendering', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fixture: ComponentFixture<any>;
  let root: HTMLElement;

  function decorator(): HTMLElement {
    return root.querySelector('formidable-field-decorator') as HTMLElement;
  }

  function input(): HTMLInputElement {
    return root.querySelector('input') as HTMLInputElement;
  }

  function messages(): (string | undefined)[] {
    return Array.from(root.querySelectorAll('.error')).map((e) => e.textContent?.trim());
  }

  /**
   * Builds the fixture and settles it. Settling matters: the field renders its input through an `@if` whose
   * branch flips once ngxMask initializes, replacing the element — so nothing may be dispatched before it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function mount(host: Type<any>): Promise<void> {
    fixture = TestBed.createComponent(host);
    root = fixture.nativeElement as HTMLElement;

    await settle(fixture);
  }

  function touch(): void {
    input().dispatchEvent(new FocusEvent('focus'));
    input().dispatchEvent(new FocusEvent('blur'));
  }

  describe('with Angular’s built-in validators and no formidable form', () => {
    beforeEach(() => {
      configureFormidableTestBed();
    });

    it('renders the decorator’s errors component without a harness in the injector chain', async () => {
      await mount(AngularValidatorsHost);

      expect(root.querySelector('formidable-field-errors')).toBeTruthy();
    });

    // `required` writes `{ required: true }`, and its key is the message the default renders.
    it('renders Angular’s error keys as messages once touched', async () => {
      pending(DIRECTIVE_VALIDATORS_UNATTACHED);

      await mount(AngularValidatorsHost);

      expect(messages()).toEqual([]);

      touch();
      await settle(fixture);

      expect(messages()).toEqual(['required']);
    });

    it('raises .is-invalid on the decorator and aria-invalid on the field', async () => {
      pending(DIRECTIVE_VALIDATORS_UNATTACHED);

      await mount(AngularValidatorsHost);

      expect(decorator().classList.contains('is-invalid')).toBe(false);
      expect(input().getAttribute('aria-invalid')).toBeNull();

      touch();
      await settle(fixture);

      expect(decorator().classList.contains('is-invalid')).toBe(true);
      expect(input().getAttribute('aria-invalid')).toBe('true');
    });

    it('follows the failing validator, and clears as the value satisfies them all', async () => {
      pending(DIRECTIVE_VALIDATORS_UNATTACHED);

      await mount(AngularValidatorsHost);

      touch();
      fill(input(), 'ab');
      await settle(fixture);

      expect(messages()).toEqual(['minlength']);

      fill(input(), 'abc');
      await settle(fixture);

      expect(messages()).toEqual([]);
      expect(decorator().classList.contains('is-invalid')).toBe(false);
      expect(input().getAttribute('aria-invalid')).toBeNull();
    });

    // `[ngModel]` is hijacked by the harness's async-validator directive. A consumer who imports
    // NgxFormidableModule gets it on every control, so it must not swallow Angular's own errors.
    it('leaves Angular’s validators alone when the ngModel hijack has no harness', async () => {
      pending(DIRECTIVE_VALIDATORS_UNATTACHED);

      await mount(HijackWithoutHarnessHost);

      touch();
      await settle(fixture);

      expect(messages()).toEqual(['required']);
    });
  });

  // An Angular error carries no message of its own, so the token is the one place a consumer gives it one.
  it('renders an Angular error through an overridden FORMIDABLE_ERROR_MESSAGE', async () => {
    pending(DIRECTIVE_VALIDATORS_UNATTACHED);

    configureFormidableTestBed({
      providers: [
        {
          provide: FORMIDABLE_ERROR_MESSAGE,
          useValue: (error: ValidationError) => (error.kind === 'required' ? 'Please tell us your name.' : error.kind)
        }
      ]
    });

    await mount(AngularValidatorsHost);

    touch();
    await settle(fixture);

    expect(messages()).toEqual(['Please tell us your name.']);
  });
});
