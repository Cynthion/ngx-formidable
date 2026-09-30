import { create, enforce, mode, Modes, omitWhen, test } from 'vest';
import { readPath } from '../helpers/model-path.helpers';

// The whole form, as a target naming no field of the model: Signal Forms resolves it to no field and reports
// the error on the path the schema validates, which is the root. An empty target would say so more plainly,
// and breaks Vest's check that the tests run in the same order on every run.
const WHOLE_FORM = 'wholeForm';

/** The preview form's model. Keys are field ids, so its type is derived from the definition, never declared. */
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

/** A group's value, which is a nested object because its section is a group. */
function group(model: PreviewModel, name: string): Record<string, unknown> {
  const value = model[name];

  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Builds the Vest suite behind the preview form, which the schema runs through `validateStandardSchema`.
 * Rules are written against the field ids in `preview-form.definition.ts`; a renamed field is a rule that
 * stops matching, which the model drawer shows.
 *
 * A factory rather than a shared constant: a suite from `create` carries its own state, and the cost of a
 * run grows with every form that has ever used it — `runStatic` does not isolate that, and `reset()` does
 * not clear it. Each build of the form gets its own.
 *
 * No rule here reads a condition: a hidden field is left out of validation by Signal Forms itself.
 */
export function createPreviewValidationSuite(): Pick<ReturnType<typeof createSuite>, '~standard'> {
  const standard = createSuite()['~standard'];

  // The suite is written for the sample form, and the structure editor builds others. Signal Forms throws on
  // an issue whose path runs through a key the model lacks, so only an issue on a target the model has, or
  // on the whole form, reaches it.
  return {
    '~standard': {
      ...standard,
      validate: (model) => {
        const result = standard.validate(model);
        if (result instanceof Promise || !result.issues) return result;

        return { issues: result.issues.filter((issue) => isOnTheForm(model as PreviewModel, issue.path)) };
      }
    }
  };
}

function isOnTheForm(model: PreviewModel, path?: readonly (PropertyKey | { key: PropertyKey })[]): boolean {
  if (!path?.length) return true;

  const target = path.map((part) => String(typeof part === 'object' ? part.key : part)).join('.');

  return target === WHOLE_FORM || readPath(model, target) !== undefined;
}

function createSuite() {
  return create((model: PreviewModel) => {
    mode(Modes.ALL);

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

    test('address', 'We need an address to deliver to.', () => {
      enforce(text(model['address'])).isNotBlank();
    });

    test('branch', 'Pick a branch to collect from.', () => {
      enforce(text(model['branch'])).isNotBlank();
    });

    // One group deeper, the target carries `payment.`, because that is where the group puts the field.
    test('payment.method', 'Choose how to pay.', () => {
      enforce(text(group(model, 'payment')['method'])).isNotBlank();
    });

    test('payment.cardNumber', 'A card number is required.', () => {
      enforce(text(group(model, 'payment')['cardNumber'])).isNotBlank();
    });

    test('payment.cardNumber', 'A card number is sixteen digits.', () => {
      enforce(text(group(model, 'payment')['cardNumber'])).matches(/^\d{4} \d{4} \d{4} \d{4}$/);
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

/** The fields the `angular` validator mode makes `required()`, keyed by field name, in place of a suite. */
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

/** The `minLength()` rules of the `angular` validator mode, keyed by field name. The mask fills 13 characters. */
export const ANGULAR_MIN_LENGTHS: ReadonlyMap<string, number> = new Map([['phone', 13]]);
