import { WHOLE_FORM } from '@cynthion/ngx-formidable';
import { create, enforce, mode, Modes, omitWhen, only, Suite, test } from 'vest';

/** The preview form's model. Keys are field ids, so the shape is derived from the definition, never declared. */
type PreviewModel = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function list(value: unknown): readonly string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function date(value: unknown): Date | null {
  return value instanceof Date ? value : null;
}

/** The `when` group's value, which is a nested object because its section is an `ngModelGroup`. */
function group(model: PreviewModel, name: string): Record<string, unknown> {
  const value = model[name];

  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Builds the Vest suite behind the preview form. Rules are written against the field ids in
 * `preview-form.definition.ts`; a renamed field is a rule that stops matching, which the model drawer shows.
 *
 * A factory rather than a shared constant: a suite from `create` carries its own state, and the cost of a
 * run grows with every form that has ever used it — `runStatic` does not isolate that, and `reset()` does
 * not clear it. One suite across many forms turns the portal's spec into a quadratic, and rebuilding the
 * form on a new `updateOn` degrades the running app the same way. Each form gets its own.
 */
export function createPreviewValidationSuite(): Suite<string, string, (model: PreviewModel, field?: string) => void> {
  return create((model: PreviewModel, field?: string) => {
    mode(Modes.ALL);

    if (field) {
      only(field);
    }

    test('pizza', 'Pick a pizza to start from.', () => {
      enforce(text(model['pizza'])).isNotBlank();
    });

    test('size', 'Pick a size.', () => {
      enforce(text(model['size'])).isNotBlank();
    });

    test('crust', 'Pick a crust.', () => {
      enforce(text(model['crust'])).isNotBlank();
    });

    test('sauce', 'Pick a sauce.', () => {
      enforce(text(model['sauce'])).isNotBlank();
    });

    test('toppings', 'Five toppings is the limit.', () => {
      enforce(list(model['toppings']).length).lessThanOrEquals(5);
    });

    test('orderName', 'We need a name for the order.', () => {
      enforce(text(model['orderName'])).isNotBlank();
    });

    test('email', 'An email address is required.', () => {
      enforce(text(model['email'])).isNotBlank();
    });

    test('email', 'That does not look like an email address.', () => {
      enforce(text(model['email'])).matches(/^[^@\s]+@[^@\s.]+\.[^@\s]+$/);
    });

    test('phone', 'A phone number is required.', () => {
      enforce(text(model['phone'])).isNotBlank();
    });

    test('phone', 'A phone number reads 079 123 45 67.', () => {
      enforce(text(model['phone'])).matches(/^\d{3} \d{3} \d{2} \d{2}$/);
    });

    // The two conditional fields. `@if` destroys the control that is not showing, so its key is gone from
    // the model — a rule left running against it would report on a field nobody can see or fix. `omitWhen`
    // is what keeps each rule alive only while its field is on screen; `PREVIEW_DEPENDENT_FIELDS` re-runs
    // both the moment the toggle moves.
    omitWhen(model['pickup'] === true, () => {
      test('address', 'We need an address to deliver to.', () => {
        enforce(text(model['address'])).isNotBlank();
      });
    });

    omitWhen(model['pickup'] !== true, () => {
      test('branch', 'Pick a branch to collect from.', () => {
        enforce(text(model['branch'])).isNotBlank();
      });
    });

    // The same pattern one group deeper: both the target and the key the condition reads carry `payment.`,
    // because that is where the `ngModelGroup` puts them.
    test('payment.method', 'Choose how to pay.', () => {
      enforce(text(group(model, 'payment')['method'])).isNotBlank();
    });

    omitWhen(group(model, 'payment')['method'] !== 'card', () => {
      test('payment.cardNumber', 'A card number is required.', () => {
        enforce(text(group(model, 'payment')['cardNumber'])).isNotBlank();
      });

      test('payment.cardNumber', 'A card number is sixteen digits.', () => {
        enforce(text(group(model, 'payment')['cardNumber'])).matches(/^\d{4} \d{4} \d{4} \d{4}$/);
      });
    });

    // Two group rules. Each reads a member of `when` and reports on the group, because neither the date nor
    // the time is wrong on its own — being shut is a fact about the pair. `mode(Modes.ALL)` is what lets
    // both messages render at once.
    omitWhen(!date(group(model, 'when')['time']), () => {
      test('when', 'We are open from 11:00 to 23:00.', () => {
        const hour = date(group(model, 'when')['time'])!.getHours();

        enforce(hour >= 11 && hour < 23).isTruthy();
      });
    });

    omitWhen(!date(group(model, 'when')['date']), () => {
      test('when', 'We are closed on Mondays.', () => {
        enforce(date(group(model, 'when')['date'])!.getDay()).notEquals(1);
      });
    });

    // A whole-form rule: it reads two fields and reports on neither of them.
    test(WHOLE_FORM, 'Pineapple on a BBQ base is a combination this kitchen refuses.', () => {
      const bbq = model['sauce'] === 'bbq';
      const pineapple = list(model['toppings']).includes('pineapple');

      enforce(bbq && pineapple).isFalsy();
    });
  });
}

/** The rules the `angular` validator mode wires with Angular's own validators instead of a suite. */
export const ANGULAR_REQUIRED_FIELDS: ReadonlySet<string> = new Set([
  'pizza',
  'size',
  'crust',
  'sauce',
  'orderName',
  'email',
  'phone',
  'address',
  'branch',
  'method',
  'cardNumber'
]);

/** Minimum lengths for the `angular` validator mode, keyed by field id. The mask fills 13 characters. */
export const ANGULAR_MIN_LENGTHS: ReadonlyMap<string, number> = new Map([['phone', 13]]);

/**
 * Targets whose rules read another field, so the form re-validates them when that field moves.
 *
 * Each entry is a field whose value gates an `omitWhen`: without it, flipping the switch leaves the message
 * from the field that just disappeared standing on a form that no longer has it. A group needs no entry —
 * `NgxFormidableGroupValidateDirective` validates on the group's own value, which every member changes.
 */
export const PREVIEW_DEPENDENT_FIELDS: Readonly<Record<string, string[]>> = {
  'pickup': ['address', 'branch'],
  'payment.method': ['payment.cardNumber']
};
