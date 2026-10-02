import { TestBed } from '@angular/core/testing';
import { FormDefinitionStore } from '../state/form-definition.store';
import { FormValueStore } from '../state/form-value.store';
import { PortalValidatorKind } from './field-spec.model';
import { PREVIEW_INITIAL_MODEL } from './preview-form.definition';

/**
 * One rule set in every validator: the stage runs the sample's rules as Angular's own, as a Vest suite and as
 * a Zod schema, and each reports the same messages on the same paths — read off the stage's own field tree,
 * so a hidden field is left out as it is on the page.
 */
describe('one rule set in every validator', () => {
  // Every rule broken at once. 28 September 2026 is a Monday, and 09:00 is before opening.
  const BROKEN: Record<string, unknown> = {
    ...PREVIEW_INITIAL_MODEL,
    sauce: 'bbq',
    toppings: ['basil', 'chilli', 'ham', 'mushrooms', 'pineapple', 'salami'],
    when: { date: new Date(2026, 8, 28), time: new Date(2000, 0, 1, 9, 0) },
    payment: { method: 'card', cardNumber: '4242' },
    phone: '079',
    email: 'alex'
  };

  // Nothing filled in. The card is the payment method, so the card number is on the form.
  const EMPTY: Record<string, unknown> = {
    ...PREVIEW_INITIAL_MODEL,
    pizza: null,
    size: null,
    crust: null,
    sauce: null,
    toppings: [],
    address: null,
    when: { date: null, time: null },
    payment: { method: 'card', cardNumber: '' },
    orderName: '',
    phone: '',
    email: ''
  };

  const MODELS = { sample: PREVIEW_INITIAL_MODEL, broken: BROKEN, empty: EMPTY };

  let definition: FormDefinitionStore;
  let values: FormValueStore;

  beforeEach(() => {
    definition = TestBed.inject(FormDefinitionStore);
    values = TestBed.inject(FormValueStore);
  });

  /** The messages the model drawer lists for a model, by path — `''` for the whole form. */
  function errors(validator: PortalValidatorKind, model: Readonly<Record<string, unknown>>) {
    definition.updateOptions({ validator });
    values.model.set(model);

    return values.errors();
  }

  it('reports every broken rule on the path it names', () => {
    expect(errors('angular', BROKEN)).toEqual({
      'toppings': ['Five toppings is the limit.'],
      'when': ['We are open from 11:00 to 23:00.', 'We are closed on Mondays.'],
      'payment.cardNumber': ['A card number is sixteen digits.'],
      'phone': ['A phone number reads 079 123 45 67.'],
      'email': ['That does not look like an email address.'],
      '': ['Pineapple on a BBQ base is a combination this kitchen refuses.']
    });
  });

  // The branch is required too, and hidden while the order is delivered, so nothing validates it.
  it('reports an empty required field as empty, and runs no format check on it', () => {
    expect(errors('angular', EMPTY)).toEqual({
      'pizza': ['Pick a pizza to start from.'],
      'size': ['Pick a size.'],
      'crust': ['Pick a crust.'],
      'sauce': ['Pick a sauce.'],
      'address': ['We need an address to deliver to.'],
      'payment.cardNumber': ['A card number is required.'],
      'orderName': ['We need a name for the order.'],
      'phone': ['A phone number is required.'],
      'email': ['An email address is required.']
    });
  });

  it('reports nothing on the sample as it loads', () => {
    expect(errors('angular', PREVIEW_INITIAL_MODEL)).toEqual({});
  });

  it('reports the same messages on the same paths under Vest and Zod', () => {
    for (const [name, model] of Object.entries(MODELS)) {
      const expected = errors('angular', model);

      expect(errors('vest', model), `Vest, ${name}`).toEqual(expected);
      expect(errors('zod', model), `Zod, ${name}`).toEqual(expected);
    }
  });

  // Starting again seeds every key the new fields bring, which is what each validator then reads.
  it('reports the same under every validator on a sample started again from a blank form', () => {
    // Read in between, as the stage renders the blank form: the model follows the fields lazily.
    definition.clear();
    values.model();
    definition.reset();

    const reported = (validator: PortalValidatorKind) => {
      definition.updateOptions({ validator });

      return values.errors();
    };

    expect(reported('angular')['orderName']).toEqual(['We need a name for the order.']);
    expect(reported('vest')).toEqual(reported('angular'));
    expect(reported('zod')).toEqual(reported('angular'));
  });

  // A counter renamed to the phone's name sits at its path, and writes a number no phone rule can check.
  it('leaves out a rule whose field writes another type than the sample’s, under every validator', () => {
    // Read first, as the stage renders the sample: the model follows the fields lazily.
    values.model();
    definition.removeField('phone');
    definition.updateField('quantity', { name: 'phone' });

    expect(values.model()['phone']).toBe(2);

    for (const validator of ['angular', 'vest', 'zod'] as const) {
      definition.updateOptions({ validator });

      expect(values.errors()['phone'], validator).toBeUndefined();
      expect(values.errors()['orderName'], validator).toBeUndefined();
    }
  });

  it('reports nothing without a validator', () => {
    expect(errors('none', BROKEN)).toEqual({});
    expect(errors('none', EMPTY)).toEqual({});
  });

  // The opening hours read the time, and the pineapple rule the sauce: both leave with the field they read.
  it('leaves out a rule whose fields are not all on the form, under every validator', () => {
    definition.removeField('time');
    definition.removeField('sauce');

    for (const validator of ['angular', 'vest', 'zod'] as const) {
      const reported = errors(validator, BROKEN);

      expect(reported['when'], validator).toEqual(['We are closed on Mondays.']);
      expect(reported[''], validator).toBeUndefined();
      expect(reported['toppings'], validator).toEqual(['Five toppings is the limit.']);
    }
  });
});
