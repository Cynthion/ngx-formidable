import { hidden, max, maxLength, min, pattern, required, schema, validate } from '@angular/forms/signals';

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

/** Each field's state, limits, condition and rules, which `[formField]` hands to the field. */
export const myFormSchema = schema<MyFormModel>((path) => {
  min(path.spice, 0);
  max(path.spice, 4);
  hidden(path.address, (context) => context.valueOf(path.pickup) !== false);
  hidden(path.branch, (context) => context.valueOf(path.pickup) !== true);
  hidden(path.payment.cardNumber, (context) => context.valueOf(path.payment.method) !== 'card');
  min(path.quantity, 1);
  max(path.quantity, 10);
  maxLength(path.notes, 200);

  required(path.pizza, { message: 'Pick a pizza to start from.' });
  required(path.size, { message: 'Pick a size.' });
  required(path.crust, { message: 'Pick a crust.' });
  required(path.sauce, { message: 'Pick a sauce.' });
  maxLength(path.toppings, 5, { message: 'Five toppings is the limit.' });
  required(path.address, { message: 'We need an address to deliver to.' });
  required(path.branch, { message: 'Pick a branch to collect from.' });
  required(path.payment.method, { message: 'Choose how to pay.' });
  required(path.payment.cardNumber, { message: 'A card number is required.' });
  pattern(path.payment.cardNumber, /^\d{4} \d{4} \d{4} \d{4}$/, { message: 'A card number is sixteen digits.' });
  required(path.orderName, { message: 'We need a name for the order.' });
  required(path.phone, { message: 'A phone number is required.' });
  pattern(path.phone, /^\d{3} \d{3} \d{2} \d{2}$/, { message: 'A phone number reads 079 123 45 67.' });
  required(path.email, { message: 'An email address is required.' });
  pattern(path.email, /^[^@\s]+@[^@\s.]+\.[^@\s]+$/, { message: 'That does not look like an email address.' });
  validate(path.when, (context) => {
    const model = context.valueOf(path);

    return !model.when.time || (model.when.time.getHours() >= 11 && model.when.time.getHours() < 23)
      ? undefined
      : { kind: 'openingHours', message: 'We are open from 11:00 to 23:00.' };
  });
  validate(path.when, (context) => {
    const model = context.valueOf(path);

    return model.when.date?.getDay() !== 1
      ? undefined
      : { kind: 'closedOnMondays', message: 'We are closed on Mondays.' };
  });
  validate(path, (context) => {
    const model = context.valueOf(path);

    return !(model.sauce === 'bbq' && model.toppings.includes('pineapple'))
      ? undefined
      : { kind: 'pineappleOnBbq', message: 'Pineapple on a BBQ base is a combination this kitchen refuses.' };
  });
});
