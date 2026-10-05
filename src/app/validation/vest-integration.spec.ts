import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { FieldDecorator, FieldLabel, InputField } from '@cynthion/ngx-formidable';
import { page, userEvent } from 'vitest/browser';
import { create, enforce, mode, Modes, test } from 'vest';
import { openPage } from '../portal/testing/studio';

/**
 * A Vest suite is a Standard Schema, and `validateStandardSchema` is all it takes to run one under Signal
 * Forms. Pinned here because two of the ways it reports are not what a Vest user expects: the whole form is an
 * empty target, and an async test holds back every message of the suite until it settles.
 */

interface Order {
  name: string;
  payment: {
    method: string;
    card: string;
  };
}

const EMPTY_ORDER: Order = { name: '', payment: { method: '', card: '' } };

// One suite per host: a suite from `create` carries state across the forms that run it.
function orderSuite() {
  return create((order: Order) => {
    mode(Modes.ALL);

    test('name', 'We need a name.', () => {
      enforce(order.name).isNotBlank();
    });

    test('payment.card', 'A card number is required.', () => {
      enforce(order.payment.card).isNotBlank();
    });

    test('payment', 'Cash takes no card.', () => {
      enforce(order.payment.method === 'cash' && order.payment.card !== '').isFalsy();
    });

    // An empty target gives the issue no path, so it reports on the path the schema validates: the root.
    test('', 'Nobody delivers today.', () => {
      enforce(order.name === 'Closed').isFalsy();
    });
  });
}

@Component({
  imports: [FormField, FieldDecorator, FieldLabel, InputField],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        revealOn="always"
        [formField]="form.name" />
      <div formidableFieldLabel>Name</div>
    </formidable-field-decorator>
    <formidable-field-decorator>
      <formidable-input-field
        revealOn="always"
        [formField]="form.payment.card" />
      <div formidableFieldLabel>Card</div>
    </formidable-field-decorator>
  `
})
class OrderHost {
  readonly model = signal<Order>(EMPTY_ORDER);
  readonly form = form(this.model, (path) => validateStandardSchema(path, orderSuite()));
}

describe('Vest through Standard Schema', () => {
  const field = (name: string) => page.getByRole('textbox', { name });

  it('renders a test’s message on its field, a dotted target on the nested one', async () => {
    await openPage(OrderHost);

    await expect.element(field('Name')).toHaveAccessibleDescription('We need a name.');
    await expect.element(field('Card')).toHaveAccessibleDescription('A card number is required.');
  });

  it('reports a test on a group on the group, and on neither of its fields', async () => {
    const { componentInstance: host } = await openPage(OrderHost);

    host.model.set({ name: 'Anna', payment: { method: 'cash', card: '4242' } });

    await expect.element(field('Card')).toHaveAccessibleDescription('');
    expect(
      host.form
        .payment()
        .errors()
        .map((error) => error.message)
    ).toEqual(['Cash takes no card.']);
    expect(host.form.payment.card().errors()).toEqual([]);
    expect(host.form.payment.method().errors()).toEqual([]);
  });

  it('reports a test whose target is empty on the whole form, on every later run as well', async () => {
    const { componentInstance: host } = await openPage(OrderHost);

    host.model.set({ name: 'Closed', payment: { method: 'card', card: '4242' } });

    await expect.element(field('Name')).toHaveAccessibleDescription('');
    expect(
      host
        .form()
        .errors()
        .map((error) => error.message)
    ).toEqual(['Nobody delivers today.']);
    expect(host.form().errorSummary().length).toBe(1);

    await userEvent.tripleClick(field('Name'));
    await userEvent.keyboard('Anna');

    await expect.poll(() => host.form().errors()).toEqual([]);
    expect(host.model().name).toBe('Anna');
  });

  // Angular's own defect, pinned so it is noticed once fixed: https://github.com/angular/angular/issues/71128.
  it('throws on a test whose target runs through a key the model does not have', () => {
    const tree = TestBed.runInInjectionContext(() =>
      form(signal({ name: '' }), (path) =>
        validateStandardSchema(
          path,
          create(() => {
            test('ghost.name', 'Nobody reads this.', () => {
              enforce(false).isTruthy();
            });
          })
        )
      )
    );

    expect(() => tree().errors()).toThrowError(TypeError);
  });

  it('holds back every message while an async test runs, and reports them all once it settles', async () => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    const tree = TestBed.runInInjectionContext(() =>
      form(signal({ name: '' }), (path) =>
        validateStandardSchema(
          path,
          create(() => {
            mode(Modes.ALL);

            test('name', 'We need a name.', () => {
              enforce('').isNotBlank();
            });

            test('name', 'The name is taken.', async () => {
              await answered;
              throw new Error('taken');
            });
          })
        )
      )
    );
    const messages = () => {
      TestBed.tick();
      return tree
        .name()
        .errors()
        .map((error) => error.message);
    };

    expect(messages()).toEqual([]);
    expect(tree().pending()).toBe(true);
    expect(tree().valid()).toBe(false);

    answer();

    await expect.poll(messages).toEqual(['We need a name.', 'The name is taken.']);
    expect(tree().pending()).toBe(false);
    expect(tree().invalid()).toBe(true);
  });
});
