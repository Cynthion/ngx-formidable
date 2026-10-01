import { Component, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { FieldDecorator, InputField } from '@cynthion/ngx-formidable';
import { provideNgxMask } from 'ngx-mask';
import { create, enforce, mode, Modes, test } from 'vest';

/**
 * A Vest suite is a Standard Schema, and `validateStandardSchema` is all it takes to run one under Signal
 * Forms. Pinned here because two of the ways it reports are not what a Vest user expects: the whole form is a
 * target that names no field, and an async test never surfaces at all.
 */

interface Order {
  name: string;
  payment: { method: string; card: string };
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
  readonly form = form(this.model, (path) => validateStandardSchema(path, orderSuite()));
}

@Component({
  imports: [FormField, InputField],
  template: `<formidable-input-field [formField]="form.name" />`
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

  it('renders a test’s message on its field, a dotted target on the nested one', fakeAsync(() => {
    const fixture = TestBed.createComponent(OrderHost);
    settle(fixture);

    expect(messages(fixture)).toEqual([['We need a name.'], ['A card number is required.']]);
  }));

  it('reports a test on a group on the group, and on neither of its fields', fakeAsync(() => {
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

  it('reports a test whose target names no field on the whole form', fakeAsync(() => {
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

    host.model.set({ name: 'Anna', payment: { method: 'card', card: '4242' } });
    settle(fixture);

    expect(host.form().errors()).toEqual([]);
  }));

  // Vest's own defect, pinned so it is noticed once fixed: https://github.com/ealush/vest/issues/1346.
  it('fails Vest’s order check on every later run of a test whose target is empty', async () => {
    await jasmine.spyOnGlobalErrorsAsync(async (globalError) => {
      const suite = create(() => {
        test('', 'Nobody delivers today.', () => {
          enforce(false).isTruthy();
        });
      });

      suite['~standard'].validate({});
      suite['~standard'].validate({});
      // Vest defers the throw to a timer of its own.
      await new Promise((resolve) => setTimeout(resolve));

      expect(globalError).toHaveBeenCalledWith(
        jasmine.objectContaining({ message: jasmine.stringContaining('Tests called in different order') })
      );
    });
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

  it('never surfaces an async test, and holds the form valid while it fails', fakeAsync(() => {
    const fixture = TestBed.createComponent(AsyncHost);
    const host = fixture.componentInstance;
    settle(fixture);

    host.model.set({ name: 'Anna' });
    settle(fixture);

    expect(host.form.name().errors()).toEqual([]);
    expect(host.form().pending()).toBeFalse();
    expect(host.form().valid()).toBeTrue();
  }));
});
