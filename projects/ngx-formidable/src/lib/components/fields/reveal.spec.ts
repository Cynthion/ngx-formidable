import { Component, signal, Type, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, NgForm, NgModel, ReactiveFormsModule, Validators } from '@angular/forms';
import { form, FormField, FormRoot, required, ValidationError } from '@angular/forms/signals';
import { FormidableReveal } from '../../models/validation.model';
import { bindField, BoundField, FORMS_APIS } from '../../testing/bind-field';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { InputField } from './input-field/input-field';

/**
 * Contract of the reveal: a field's messages appear once it is `touched` (the default), once it is `dirty`,
 * or `always`, whichever forms API holds its errors. The field turns invalid at that moment and not before —
 * `aria-invalid` on its control, `.is-invalid` on its decorator — and the decorator renders the messages.
 */

/** The field's state inputs bound by hand, as a custom forms integration would bind them. */
@Component({
  imports: [FieldDecorator, InputField],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        name="field"
        [errors]="errors()"
        [invalid]="invalid()"
        [pending]="pending()"
        [touched]="true" />
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
  imports: [FormRoot, FormField, FieldDecorator, InputField],
  template: `
    <form [formRoot]="form">
      <formidable-field-decorator>
        <formidable-input-field [formField]="form.name" />
      </formidable-field-decorator>
    </form>
  `
})
class SignalSubmitHost {
  readonly model = signal({ name: '' });
  readonly form = form(this.model, (path) => required(path.name), { submission: { action: async () => undefined } });
}

@Component({
  imports: [ReactiveFormsModule, FieldDecorator, InputField],
  template: `
    <form [formGroup]="group">
      <formidable-field-decorator>
        <formidable-input-field formControlName="name" />
      </formidable-field-decorator>
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
  imports: [FormsModule, FieldDecorator, InputField],
  template: `
    <form>
      <formidable-field-decorator>
        <formidable-input-field
          name="name"
          [(ngModel)]="name" />
      </formidable-field-decorator>
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

function messages(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('formidable-field-errors .error'), (error) => error.textContent!.trim());
}

/** Submits the form as a submit button does. */
async function submit(fixture: ComponentFixture<unknown>): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.requestSubmit();
  await settle(fixture);
}

/** Whether the field shows as invalid, which the control and its decorator must agree on. */
function isInvalid(root: HTMLElement): boolean {
  const control = root.querySelector('input')!.getAttribute('aria-invalid') === 'true';
  const decorator = root.querySelector('formidable-field-decorator')!.classList.contains('is-invalid');

  expect(control).toBe(decorator);

  return control;
}

describe('reveal', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    describe(`bound ${api}`, () => {
      async function bindInvalid(revealOn?: FormidableReveal): Promise<BoundField> {
        const inputs = revealOn ? { revealOn } : {};
        const bound = await bindField('input', api, { value: 'filled', inputs, decorated: true });

        await bound.state({ invalid: true });

        return bound;
      }

      function root(bound: BoundField): HTMLElement {
        return bound.fixture.nativeElement as HTMLElement;
      }

      it('reveals once the field is touched by default', async () => {
        const bound = await bindInvalid();

        expect(messages(root(bound))).toEqual([]);
        expect(isInvalid(root(bound))).toBe(false);

        const input = bound.element.querySelector('input')!;

        input.focus();
        input.dispatchEvent(new FocusEvent('blur'));
        await settle(bound.fixture);

        expect(messages(root(bound))).toEqual(['invalid']);
        expect(isInvalid(root(bound))).toBe(true);
      });

      // What a submit does: the API marks every field touched, and none of them was blurred.
      it('reveals on a touch the API makes itself', async () => {
        const bound = await bindInvalid();

        await bound.markAsTouched();

        expect(messages(root(bound))).toEqual(['invalid']);
        expect(isInvalid(root(bound))).toBe(true);
      });

      it('reveals once the field is dirty under dirty, before any blur', async () => {
        const bound = await bindInvalid('dirty');

        expect(messages(root(bound))).toEqual([]);

        fill(bound.element.querySelector('input')!, 'edited');
        await settle(bound.fixture);

        expect(bound.touched()).toBe(false);
        expect(messages(root(bound))).toEqual(['invalid']);
        expect(isInvalid(root(bound))).toBe(true);
      });

      it('reveals with neither a touch nor an edit under always', async () => {
        const bound = await bindInvalid('always');

        expect(messages(root(bound))).toEqual(['invalid']);
        expect(isInvalid(root(bound))).toBe(true);
      });

      it('takes a revealOn changed after the first render', async () => {
        const bound = await bindInvalid('touched');

        expect(messages(root(bound))).toEqual([]);

        await bound.set('revealOn', 'always');

        expect(messages(root(bound))).toEqual(['invalid']);
      });

      it('clears once the error goes', async () => {
        const bound = await bindInvalid('always');

        await bound.state({ invalid: false });

        expect(messages(root(bound))).toEqual([]);
        expect(isInvalid(root(bound))).toBe(false);
      });
    });
  }

  describe('bound by hand', () => {
    let fixture: ComponentFixture<StateHost>;
    let host: StateHost;
    let root: HTMLElement;

    beforeEach(async () => {
      fixture = TestBed.createComponent(StateHost);
      host = fixture.componentInstance;
      root = fixture.nativeElement as HTMLElement;
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

      expect(messages(root)).toEqual(['Taken.']);
      expect(isInvalid(root)).toBe(true);

      host.pending.set(false);
      await settle(fixture);

      expect(messages(root)).toEqual([]);
      expect(isInvalid(root)).toBe(false);
    });

    it('shows a field invalid with no message when the API holds it invalid without errors', async () => {
      host.invalid.set(true);
      await settle(fixture);

      expect(isInvalid(root)).toBe(true);
      expect(messages(root)).toEqual([]);
    });
  });

  // `touched` covers a submit only where the submit touches: Signal Forms' `submit()` does, a classic
  // `ngSubmit` does not.
  describe('on submit', () => {
    it('reveals every field on a Signal Forms submit', async () => {
      const fixture = TestBed.createComponent(SignalSubmitHost);
      await settle(fixture);

      expect(messages(fixture.nativeElement)).toEqual([]);

      await submit(fixture);

      expect(messages(fixture.nativeElement)).toEqual(['required']);
      expect(isInvalid(fixture.nativeElement)).toBe(true);
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

        expect(messages(fixture.nativeElement)).toEqual([]);

        component.markAllAsTouched();
        await settle(fixture);

        expect(messages(fixture.nativeElement)).toEqual(['required']);
      });
    }
  });
});
