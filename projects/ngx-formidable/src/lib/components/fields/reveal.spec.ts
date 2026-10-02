import { Component, signal, Type, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, NgForm, NgModel, ReactiveFormsModule, Validators } from '@angular/forms';
import { form, FormField, FormRoot, required, ValidationError } from '@angular/forms/signals';
import { page, userEvent } from 'vitest/browser';
import { FieldLabel } from '../../directives/field-label';
import { FormidableReveal } from '../../models/validation.model';
import { bindField, BoundField, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { InputField } from './input-field/input-field';

/**
 * Per **When A Rule Runs And When Its Messages Appear** in `user/validation.md`: a field's messages appear once
 * it is `touched` (the default), once it is `dirty`, or `always`, whichever forms API holds its errors. The
 * field turns invalid at that moment and not before, `aria-invalid` on its control and `.is-invalid` on its
 * decorator, and the decorator renders the messages.
 */

/** The field's state inputs bound by hand, as a custom forms integration would bind them. */
@Component({
  imports: [FieldDecorator, InputField, FieldLabel],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        [errors]="errors()"
        [invalid]="invalid()"
        [pending]="pending()"
        [touched]="true" />
      <div formidableFieldLabel>Name</div>
    </formidable-field-decorator>
  `
})
class StateHost {
  readonly errors = signal<ValidationError[]>([]);
  readonly invalid = signal(false);
  readonly pending = signal(false);
}

/** A required field in a form that submits, as a consumer writes one under each forms API. */
@Component({
  imports: [FormRoot, FormField, FieldDecorator, InputField, FieldLabel],
  template: `
    <form [formRoot]="form">
      <formidable-field-decorator>
        <formidable-input-field [formField]="form.name" />
        <div formidableFieldLabel>Name</div>
      </formidable-field-decorator>
      <button type="submit">Submit</button>
    </form>
  `
})
class SignalSubmitHost {
  readonly model = signal({ name: '' });
  readonly form = form(this.model, (path) => required(path.name), { submission: { action: async () => undefined } });
}

@Component({
  imports: [ReactiveFormsModule, FieldDecorator, InputField, FieldLabel],
  template: `
    <form [formGroup]="group">
      <formidable-field-decorator>
        <formidable-input-field formControlName="name" />
        <div formidableFieldLabel>Name</div>
      </formidable-field-decorator>
      <button type="submit">Submit</button>
    </form>
  `
})
class ReactiveSubmitHost {
  readonly group = new FormGroup({ name: new FormControl('', Validators.required) });

  markAllAsTouched(): void {
    this.group.markAllAsTouched();
  }
}

@Component({
  imports: [FormsModule, FieldDecorator, InputField, FieldLabel],
  template: `
    <form>
      <formidable-field-decorator>
        <formidable-input-field
          name="name"
          [(ngModel)]="name" />
        <div formidableFieldLabel>Name</div>
      </formidable-field-decorator>
      <button type="submit">Submit</button>
    </form>
  `
})
class TemplateDrivenSubmitHost {
  readonly ngForm = viewChild.required(NgForm);
  readonly ngModel = viewChild.required(NgModel);
  readonly name = signal('');

  markAllAsTouched(): void {
    this.ngForm().form.markAllAsTouched();
  }
}

const input = () => page.getByRole('textbox', { name: 'Name' });
const messages = () =>
  page
    .getByRole('listitem')
    .elements()
    .map((message) => message.textContent!.trim());

/** Whether the field shows as invalid, which the control and its decorator must agree on. */
function isInvalid(): boolean {
  const control = input().element().getAttribute('aria-invalid') === 'true';
  const decorator = document.querySelector('formidable-field-decorator')!.classList.contains('is-invalid');

  expect(control).toBe(decorator);

  return control;
}

/** Submits the form as a user does, with its submit button. */
async function submit(fixture: ComponentFixture<unknown>): Promise<void> {
  await userEvent.click(page.getByRole('button', { name: 'Submit' }));
  await settle(fixture);
}

describe('reveal', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    describe(`bound ${api}`, () => {
      async function bindInvalid(revealOn?: FormidableReveal): Promise<BoundField> {
        const bound = await bindField('input', api, {
          value: 'filled',
          inputs: revealOn ? { revealOn } : {},
          decorated: true,
          decoration: '<div formidableFieldLabel>Name</div>',
          after: '<button type="button">Next</button>'
        });

        await bound.state({ invalid: true });

        return bound;
      }

      it('reveals once the field is touched by default', async () => {
        await bindInvalid();

        expect(messages()).toEqual([]);
        expect(isInvalid()).toBe(false);

        await userEvent.click(input());
        await userEvent.tab();

        await expect.poll(messages).toEqual(['invalid']);
        expect(isInvalid()).toBe(true);
      });

      // What a submit does: the API marks every field touched, and none of them was blurred.
      it('reveals on a touch the API makes itself', async () => {
        const bound = await bindInvalid();

        await bound.markAsTouched();

        expect(messages()).toEqual(['invalid']);
        expect(isInvalid()).toBe(true);
      });

      it('reveals once the field is dirty under dirty, before any blur', async () => {
        const bound = await bindInvalid('dirty');

        expect(messages()).toEqual([]);

        await userEvent.type(input(), 'x');

        await expect.poll(messages).toEqual(['invalid']);
        expect(bound.touched()).toBe(false);
        expect(isInvalid()).toBe(true);
      });

      it('reveals with neither a touch nor an edit under always', async () => {
        await bindInvalid('always');

        expect(messages()).toEqual(['invalid']);
        expect(isInvalid()).toBe(true);
      });

      it('takes a revealOn changed after the first render', async () => {
        const bound = await bindInvalid('touched');

        expect(messages()).toEqual([]);

        await bound.set('revealOn', 'always');

        expect(messages()).toEqual(['invalid']);
      });

      it('clears once the error goes', async () => {
        const bound = await bindInvalid('always');

        await bound.state({ invalid: false });

        expect(messages()).toEqual([]);
        expect(isInvalid()).toBe(false);
      });
    });
  }

  describe('bound by hand', () => {
    let fixture: ComponentFixture<StateHost>;
    let host: StateHost;

    beforeEach(async () => {
      fixture = TestBed.createComponent(StateHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    // A pending validator has not reported yet, so the API holds none of its errors while it runs.
    it('keeps the last messages while a validator is pending, and drops them once it settles valid', async () => {
      host.errors.set([{ kind: 'taken', message: 'Taken.' }]);
      host.invalid.set(true);
      await settle(fixture);

      host.errors.set([]);
      host.invalid.set(false);
      host.pending.set(true);
      await settle(fixture);

      expect(messages()).toEqual(['Taken.']);
      expect(isInvalid()).toBe(true);

      host.pending.set(false);
      await settle(fixture);

      expect(messages()).toEqual([]);
      expect(isInvalid()).toBe(false);
    });

    it('shows a field invalid with no message when the API holds it invalid without errors', async () => {
      host.invalid.set(true);
      await settle(fixture);

      expect(isInvalid()).toBe(true);
      expect(messages()).toEqual([]);
    });
  });

  // `touched` covers a submit only where the submit touches: Signal Forms' `submit()` does, a classic
  // `ngSubmit` does not.
  describe('on submit', () => {
    it('reveals every field on a Signal Forms submit', async () => {
      const fixture = TestBed.createComponent(SignalSubmitHost);
      await settle(fixture);

      expect(messages()).toEqual([]);

      await submit(fixture);

      expect(messages()).toEqual(['required']);
      expect(isInvalid()).toBe(true);
    });

    const classicHosts: Record<string, Type<ReactiveSubmitHost | TemplateDrivenSubmitHost>> = {
      'reactive': ReactiveSubmitHost,
      'template-driven': TemplateDrivenSubmitHost
    };

    for (const [api, host] of Object.entries(classicHosts)) {
      it(`reveals nothing on a ${api} submit until the form marks its controls touched`, async () => {
        const fixture = TestBed.createComponent(host);
        await settle(fixture);

        // `ngModel` attaches no directive validator to a custom control, so its rule goes on imperatively.
        const component = fixture.componentInstance;
        if (component instanceof TemplateDrivenSubmitHost) {
          component.ngModel().control.addValidators(Validators.required);
          component.ngModel().control.updateValueAndValidity();
          await settle(fixture);
        }

        await submit(fixture);

        expect(messages()).toEqual([]);

        component.markAllAsTouched();
        await settle(fixture);

        expect(messages()).toEqual(['required']);
      });
    }
  });
});
