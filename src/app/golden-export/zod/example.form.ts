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
import * as z from 'zod';

/** What the form edits: one key per field, and a grouped section nested under its group name. */
export interface ExampleFormModel {
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
export const initialExampleFormModel: ExampleFormModel = {
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
 * The form's checks, as a Zod schema run through Standard Schema. It holds no state, so one serves every
 * form. A check across fields refines the whole, and reports on the path it names.
 */
export const exampleZodSchema = z
  .object({
    pizza: z.string().nullable().refine((value) => !!value, 'Pick a pizza to start from.'),
    size: z.string().nullable().refine((value) => !!value, 'Pick a size.'),
    crust: z.string().nullable().refine((value) => !!value, 'Pick a crust.'),
    sauce: z.string().nullable().refine((value) => !!value, 'Pick a sauce.'),
    toppings: z.array(z.string()).max(5, 'Five toppings is the limit.'),
    address: z.string().nullable().refine((value) => !!value, 'We need an address to deliver to.'),
    branch: z.string().nullable().refine((value) => !!value, 'Pick a branch to collect from.'),
    when: z.object({
      date: z.date().nullable(),
      time: z.date().nullable()
    }),
    payment: z.object({
      method: z.string().nullable().refine((value) => !!value, 'Choose how to pay.'),
      cardNumber: z.string()
        .min(1, 'A card number is required.')
        .refine((value) => !value || /^\d{16}$/.test(value), 'A card number is sixteen digits.')
    }),
    orderName: z.string().min(1, 'We need a name for the order.'),
    phone: z.string()
      .min(1, 'A phone number is required.')
      .refine((value) => !value || /^\d{10}$/.test(value), 'A phone number is ten digits.'),
    email: z.string()
      .min(1, 'An email address is required.')
      .refine((value) => !value || /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value), 'That does not look like an email address.')
  })
  .refine((model) => !model.when.time || (model.when.time.getHours() >= 11 && model.when.time.getHours() < 23), {
    error: 'We are open from 11:00 to 23:00.',
    path: ['when']
  })
  .refine((model) => model.when.date?.getDay() !== 1, {
    error: 'We are closed on Mondays.',
    path: ['when']
  })
  .refine((model) => !(model.sauce === 'bbq' && model.toppings.includes('pineapple')), {
    error: 'Pineapple on a BBQ base is a combination this kitchen refuses.'
  });

/** Each field's state, limits, condition and rules, which `[formField]` hands to the field. */
export const exampleSchema = schema<ExampleFormModel>((path) => {
  min(path.spice, 0);
  max(path.spice, 4);
  hidden(path.address, (context) => context.valueOf(path.pickup) !== false);
  hidden(path.branch, (context) => context.valueOf(path.pickup) !== true);
  hidden(path.payment.cardNumber, (context) => context.valueOf(path.payment.method) !== 'card');
  min(path.quantity, 1);
  max(path.quantity, 10);
  maxLength(path.notes, 200);

  metadata(path.pizza, REQUIRED, () => true);
  metadata(path.size, REQUIRED, () => true);
  metadata(path.crust, REQUIRED, () => true);
  metadata(path.sauce, REQUIRED, () => true);
  metadata(path.address, REQUIRED, () => true);
  metadata(path.branch, REQUIRED, () => true);
  metadata(path.payment.method, REQUIRED, () => true);
  metadata(path.payment.cardNumber, REQUIRED, () => true);
  metadata(path.orderName, REQUIRED, () => true);
  metadata(path.phone, REQUIRED, () => true);
  metadata(path.email, REQUIRED, () => true);
  validateStandardSchema(path, exampleZodSchema);
});
