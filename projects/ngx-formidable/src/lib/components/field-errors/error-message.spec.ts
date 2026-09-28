import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { form, FormField, minLength, ValidationError } from '@angular/forms/signals';
import { FORMIDABLE_ERROR_MESSAGE } from '../../models/validation.model';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { InputField } from '../fields/input-field/input-field';
import { FieldErrors } from './field-errors';

/**
 * Contract of the message text: every error the library renders becomes a message through
 * `FORMIDABLE_ERROR_MESSAGE`, which defaults to the error's `message`, else its `kind`. A classic API hands
 * a field its errors as `{ kind, context }` with no `message`, so the token is where one gets its text.
 */

/** Placed by hand, as a consumer places one for a group or the form. */
@Component({
  imports: [FieldErrors],
  template: `<formidable-field-errors [errors]="errors()" />`
})
class ErrorsHost {
  readonly errors = signal<ValidationError[]>([]);
}

@Component({
  imports: [ReactiveFormsModule, FieldDecorator, InputField],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        revealOn="always"
        [formControl]="control" />
    </formidable-field-decorator>
  `
})
class ReactiveHost {
  readonly control = new FormControl('ab', Validators.minLength(3));
}

@Component({
  imports: [FormField, FieldDecorator, InputField],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        revealOn="always"
        [formField]="form.name" />
    </formidable-field-decorator>
  `
})
class SignalHost {
  readonly model = signal({ name: 'ab' });
  readonly form = form(this.model, (path) => minLength(path.name, 3, { message: 'At least three letters.' }));
}

function messages(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('.error'), (error) => error.textContent!.trim());
}

describe('error message', () => {
  it('renders an error’s message, else its kind', async () => {
    configureFormidableTestBed();
    const fixture = TestBed.createComponent(ErrorsHost);
    fixture.componentInstance.errors.set([{ kind: 'taken', message: 'Taken.' }, { kind: 'required' }]);
    await settle(fixture);

    expect(messages(fixture.nativeElement)).toEqual(['Taken.', 'required']);
  });

  it('keeps its live region in place while it has nothing to announce', async () => {
    configureFormidableTestBed();
    const fixture = TestBed.createComponent(ErrorsHost);
    await settle(fixture);

    const errors = (fixture.nativeElement as HTMLElement).querySelector('formidable-field-errors')!;

    expect(errors.getAttribute('aria-live')).toBe('polite');
    expect(errors.getBoundingClientRect().height).toBe(0);
  });

  it('renders every message through FORMIDABLE_ERROR_MESSAGE', async () => {
    configureFormidableTestBed({
      providers: [{ provide: FORMIDABLE_ERROR_MESSAGE, useValue: (error: ValidationError) => `No: ${error.kind}` }]
    });
    const fixture = TestBed.createComponent(ErrorsHost);
    fixture.componentInstance.errors.set([{ kind: 'taken', message: 'Taken.' }]);
    await settle(fixture);

    expect(messages(fixture.nativeElement)).toEqual(['No: taken']);
  });

  it('renders a Signal Forms rule’s own message', async () => {
    configureFormidableTestBed();
    const fixture = TestBed.createComponent(SignalHost);
    await settle(fixture);

    expect(messages(fixture.nativeElement)).toEqual(['At least three letters.']);
  });

  it('hands a classic error over as its kind and context, with no message', async () => {
    const seen: ValidationError[] = [];
    const message = (error: ValidationError): string => {
      seen.push(error);
      const { requiredLength } = (error as ValidationError & { context: { requiredLength: number } }).context;

      return `At least ${requiredLength} letters.`;
    };

    configureFormidableTestBed({ providers: [{ provide: FORMIDABLE_ERROR_MESSAGE, useValue: message }] });
    const fixture = TestBed.createComponent(ReactiveHost);
    await settle(fixture);

    expect(messages(fixture.nativeElement)).toEqual(['At least 3 letters.']);
    expect(seen[0]?.kind).toBe('minlength');
    expect(seen[0]?.message).toBeUndefined();
    expect((seen[0] as ValidationError & { context: unknown }).context).toEqual({ requiredLength: 3, actualLength: 2 });
  });
});
