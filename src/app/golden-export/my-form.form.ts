import {
  hidden,
  max,
  maxLength,
  metadata,
  min,
  REQUIRED,
  schema,
  validateStandardSchema
} from '@angular/forms/signals';
import { create, mode, Modes } from 'vest';

/** What the form edits: one key per field, and a grouped section nested under its group name. */
export interface MyFormModel {
  pizza: string | null;
  size: string | null;
  crust: string | null;
  sauce: string | null;
  toppings: string[];
  spice: number;
  pickup: boolean;
  address: string | null;
  branch: string | null;
  when: {
    date: Date | null;
    time: Date | null;
  };
  payment: {
    method: string | null;
    cardNumber: string;
  };
  orderName: string;
  quantity: number;
  phone: string;
  email: string;
  notes: string;
}

/** Every key defined, because Signal Forms drops an `undefined` one and binds a field only to a key. */
export const myFormInitialModel: MyFormModel = {
  pizza: null,
  size: null,
  crust: null,
  sauce: null,
  toppings: [],
  spice: 0,
  pickup: false,
  address: null,
  branch: null,
  when: {
    date: null,
    time: null
  },
  payment: {
    method: null,
    cardNumber: ''
  },
  orderName: '',
  quantity: 1,
  phone: '',
  email: '',
  notes: ''
};

/**
 * Your rules, run through Standard Schema. A suite carries state across every form it has run for, so
 * each form creates its own. The Studio has no rule editor, so there are none yet: give the callback its
 * `model: MyFormModel` and add them, for example
 * `test('pizza', 'Required.', () => enforce(model.pizza).isNotBlank())`.
 */
export function createMyFormSuite() {
  return create(() => {
    mode(Modes.ALL); // every failing rule, not only a field's first
  });
}

/** Each field's state, limits, condition and rules, which `[formField]` hands to the field. */
export const myFormSchema = schema<MyFormModel>((path) => {
  metadata(path.pizza, REQUIRED, () => true);
  metadata(path.size, REQUIRED, () => true);
  metadata(path.crust, REQUIRED, () => true);
  metadata(path.sauce, REQUIRED, () => true);
  min(path.spice, 0);
  max(path.spice, 4);
  metadata(path.address, REQUIRED, () => true);
  hidden(path.address, (context) => context.valueOf(path.pickup) !== false);
  metadata(path.branch, REQUIRED, () => true);
  hidden(path.branch, (context) => context.valueOf(path.pickup) !== true);
  metadata(path.payment.method, REQUIRED, () => true);
  metadata(path.payment.cardNumber, REQUIRED, () => true);
  hidden(path.payment.cardNumber, (context) => context.valueOf(path.payment.method) !== 'card');
  metadata(path.orderName, REQUIRED, () => true);
  min(path.quantity, 1);
  max(path.quantity, 10);
  metadata(path.phone, REQUIRED, () => true);
  metadata(path.email, REQUIRED, () => true);
  maxLength(path.notes, 200);
  validateStandardSchema(path, createMyFormSuite());
});
