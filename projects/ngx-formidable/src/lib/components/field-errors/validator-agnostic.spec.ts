import { Component, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ValidationError } from '@angular/forms/signals';
import { page, userEvent } from 'vitest/browser';
import { FieldLabel } from '../../directives/field-label';
import { FORMIDABLE_ERROR_MESSAGE } from '../../models/validation.model';
import { configureFormidableTestBed, DIRECTIVE_VALIDATORS_UNATTACHED, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { InputField } from '../fields/input-field/input-field';

/**
 * Per **Classic Validators** and **Messages** in `user/validation.md`: the decorator's invalid state, the field's
 * `aria-invalid` and its messages need no validation library, Angular's built-in validators alone drive
 * them. An Angular error reaches the field as its key, `{ kind: 'required' }`, which
 * `FORMIDABLE_ERROR_MESSAGE` renders as it is by default and as a consumer's text once overridden.
 *
 * Every spec here waits on **Directive Validators On A Custom Control** in `impl/backlog.md`.
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
      <button type="button">Next</button>
    </form>
  `
})
class AngularValidatorsHost {
  name = '';
}

const input = () => page.getByRole('textbox', { name: 'Name' });
const messages = () =>
  page
    .getByRole('listitem')
    .elements()
    .map((message) => message.textContent!.trim());
const isInvalid = () => document.querySelector('formidable-field-decorator')!.classList.contains('is-invalid');

async function mount(host: Type<unknown>): Promise<void> {
  await settle(TestBed.createComponent(host));
}

/** Leaves the field as a user does, which touches it. */
async function touch(): Promise<void> {
  await userEvent.click(input());
  await userEvent.tab();
}

describe('validator-agnostic error rendering', () => {
  describe('with Angular’s built-in validators', () => {
    beforeEach(() => configureFormidableTestBed());

    // `required` writes `{ required: true }`, and its key is the message the default renders.
    it('renders Angular’s error keys as messages once touched', async ({ skip }) => {
      skip(DIRECTIVE_VALIDATORS_UNATTACHED);

      await mount(AngularValidatorsHost);

      expect(messages()).toEqual([]);

      await touch();

      await expect.poll(messages).toEqual(['required']);
    });

    it('raises .is-invalid on the decorator and aria-invalid on the field', async ({ skip }) => {
      skip(DIRECTIVE_VALIDATORS_UNATTACHED);

      await mount(AngularValidatorsHost);

      expect(isInvalid()).toBe(false);
      await expect.element(input()).not.toHaveAttribute('aria-invalid');

      await touch();

      await expect.element(input()).toHaveAttribute('aria-invalid', 'true');
      expect(isInvalid()).toBe(true);
    });

    it('follows the failing validator, and clears as the value satisfies them all', async ({ skip }) => {
      skip(DIRECTIVE_VALIDATORS_UNATTACHED);

      await mount(AngularValidatorsHost);

      await touch();
      await userEvent.type(input(), 'ab');

      await expect.poll(messages).toEqual(['minlength']);

      await userEvent.type(input(), 'c');

      await expect.poll(messages).toEqual([]);
      expect(isInvalid()).toBe(false);
      await expect.element(input()).not.toHaveAttribute('aria-invalid');
    });
  });

  // An Angular error carries no message of its own, so the token is the one place a consumer gives it one.
  it('renders an Angular error through an overridden FORMIDABLE_ERROR_MESSAGE', async ({ skip }) => {
    skip(DIRECTIVE_VALIDATORS_UNATTACHED);

    configureFormidableTestBed({
      providers: [
        {
          provide: FORMIDABLE_ERROR_MESSAGE,
          useValue: (error: ValidationError) => (error.kind === 'required' ? 'Please tell us your name.' : error.kind)
        }
      ]
    });

    await mount(AngularValidatorsHost);

    await touch();

    await expect.poll(messages).toEqual(['Please tell us your name.']);
  });
});
