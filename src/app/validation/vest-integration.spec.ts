import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { FieldDecorator, FieldLabel, InputField } from '@cynthion/ngx-formidable';
import { page, userEvent } from 'vitest/browser';
import { create, enforce, mode, Modes, test } from 'vest';
import { openPage, settle } from '../portal/testing/studio';

/**
 * A Vest suite is a Standard Schema, and `validateStandardSchema` is all it takes to run one under Signal
 * Forms. Pinned here because two of the ways it reports are not what a Vest user expects: the whole form is a
 * target that names no field, and an async test never surfaces at all.
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

    // A path into a key the model does not have resolves to no field, so the error falls back to the path
    // the schema is validating — here the root. An empty target, which Vest gives no path at all, would
    // land there too, but breaks Vest's check that the tests run in the same order on every run.
    test('wholeForm', 'Nobody delivers today.', () => {
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

@Component({
  imports: [FormField, FieldDecorator, FieldLabel, InputField],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        revealOn="always"
        [formField]="form.name" />
      <div formidableFieldLabel>Name</div>
    </formidable-field-decorator>
  `
})
class AsyncHost {
  readonly model = signal({ name: '' });
  readonly form = form(this.model, (path) =>
    validateStandardSchema(
      path,
      create(() => {
        test('name', 'The name is taken.', async () => {
          await Promise.resolve();
          throw new Error('taken');
        });
      })
    )
  );
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

  it('reports a test whose target names no field on the whole form', async () => {
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

  // Vest's own defect, pinned so it is noticed once fixed: https://github.com/ealush/vest/issues/1346.
  it('fails Vest’s order check on every later run of a test whose target is empty', async ({ onTestFinished }) => {
    let thrown = '';
    // A listener of the spec's own keeps the runner from failing the run on the throw it is here to catch.
    const onError = (event: ErrorEvent) => {
      thrown = event.message;
      event.preventDefault();
    };

    window.addEventListener('error', onError);
    onTestFinished(() => window.removeEventListener('error', onError));

    const suite = create(() => {
      test('', 'Nobody delivers today.', () => {
        enforce(false).isTruthy();
      });
    });

    suite['~standard'].validate({});
    suite['~standard'].validate({});

    // Vest defers the throw to a timer of its own.
    await expect.poll(() => thrown).toContain('Tests called in different order');
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

  it('never surfaces an async test, and holds the form valid while it fails', async () => {
    const fixture = await openPage(AsyncHost);
    const host = fixture.componentInstance;

    await userEvent.type(field('Name'), 'Anna');
    await expect.poll(() => host.model().name).toBe('Anna');
    await settle(fixture, 50);

    await expect.element(field('Name')).toHaveAccessibleDescription('');
    expect(host.form.name().errors()).toEqual([]);
    expect(host.form().pending()).toBe(false);
    expect(host.form().valid()).toBe(true);
  });
});
