import { Component, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { FieldDecorator, InputField } from '@cynthion/ngx-formidable';
import { provideNgxMask } from 'ngx-mask';
import * as z from 'zod';

/**
 * A Zod schema is a Standard Schema, and `validateStandardSchema` is all it takes to run one under Signal
 * Forms. Pinned here because the Studio's Zod export relies on a refinement reporting on the path it names: a
 * check across fields reports on a group or on the whole form, and on none of the fields it reads.
 */

interface Order {
  name: string;
  payment: { method: string; card: string };
}

const EMPTY_ORDER: Order = { name: '', payment: { method: '', card: '' } };

// A Zod schema holds no state, so one serves every form, unlike a Vest suite.
const ORDER = z
  .object({
    name: z.string().min(1, 'We need a name.'),
    payment: z.object({ method: z.string(), card: z.string().min(1, 'A card number is required.') })
  })
  .refine((order) => order.payment.method !== 'cash' || order.payment.card === '', {
    error: 'Cash takes no card.',
    path: ['payment']
  })
  .refine((order) => order.name !== 'Closed', 'Nobody delivers today.');

@Component({
  imports: [FormField, FieldDecorator, InputField],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        revealOn="always"
        [formField]="form.name" />
    </formidable-field-decorator>
    <formidable-field-decorator>
      <formidable-input-field
        revealOn="always"
        [formField]="form.payment.card" />
    </formidable-field-decorator>
  `
})
class OrderHost {
  readonly model = signal<Order>(EMPTY_ORDER);
  readonly form = form(this.model, (path) => validateStandardSchema(path, ORDER));
}

describe('Zod through Standard Schema', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNgxMask()] }));

  function settle(fixture: ComponentFixture<unknown>): void {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      tick(50);
    }
  }

  function messages(fixture: ComponentFixture<unknown>): string[][] {
    const decorators = (fixture.nativeElement as HTMLElement).querySelectorAll('formidable-field-decorator');

    return Array.from(decorators, (decorator) =>
      Array.from(decorator.querySelectorAll('.error'), (error) => error.textContent!.trim())
    );
  }

  it('renders a check’s message on its field, a nested one on the nested field', fakeAsync(() => {
    const fixture = TestBed.createComponent(OrderHost);
    settle(fixture);

    expect(messages(fixture)).toEqual([['We need a name.'], ['A card number is required.']]);
  }));

  it('reports a refinement on the path it names, and on none of the fields it reads', fakeAsync(() => {
    const fixture = TestBed.createComponent(OrderHost);
    const host = fixture.componentInstance;
    host.model.set({ name: 'Anna', payment: { method: 'cash', card: '4242' } });
    settle(fixture);

    expect(
      host.form
        .payment()
        .errors()
        .map((error) => error.message)
    ).toEqual(['Cash takes no card.']);
    expect(host.form.payment.card().errors()).toEqual([]);
    expect(host.form.payment.method().errors()).toEqual([]);
  }));

  it('reports a refinement that names no path on the whole form', fakeAsync(() => {
    const fixture = TestBed.createComponent(OrderHost);
    const host = fixture.componentInstance;
    host.model.set({ name: 'Closed', payment: { method: 'card', card: '4242' } });
    settle(fixture);

    expect(
      host
        .form()
        .errors()
        .map((error) => error.message)
    ).toEqual(['Nobody delivers today.']);
    expect(host.form().errorSummary().length).toBe(1);
  }));
});
