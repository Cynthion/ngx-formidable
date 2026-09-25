import {
  DEFAULT_DECORATION,
  DEFAULT_STATE,
  PortalFieldDecoration,
  PortalFieldSpec,
  PortalFieldState,
  PortalFormDefinition,
  PortalFormOptions,
  PortalOptionSpec,
  PortalSectionSpec
} from './field-spec.model';

/**
 * The preview form: a pizza order.
 *
 * The domain is chosen for being one nobody has to be taught. A visitor changing a setting in the sidebar
 * should see the consequence and recognise it immediately, which a form about its own subject matter cannot
 * do — the reading of the domain competes with the reading of the change.
 *
 * **Every field type is on screen when the form loads.** A component reachable only by flipping a switch is
 * a component a visitor never finds, and the Studio's whole claim is that every field is on the page. That
 * is the rule the layout cannot trade away, and it is what decides where a type appears twice.
 *
 * **The form starts as a pizza off the menu.** The picker carries a `presets` patch per option, so choosing
 * one fills the sauce and the toppings and leaves everything else alone — a template to adjust rather than
 * a blank form to fill. `Custom` simply has no patch, so it changes nothing.
 *
 * Four things the form demonstrates beyond the individual fields:
 *
 * - **Two groups.** `When` and `Payment` each carry a `groupName`, so their fields nest in the model. `When`
 *   also carries a rule that reads both members and reports on the group rather than on either one.
 * - **Conditional fields.** One toggle decides whether the address or the branch is rendered, and the
 *   payment method decides whether the card number is. A field that is not rendered is destroyed, so its
 *   key leaves the model — which is what the rules have to survive.
 * - **A template picker.** `presets` on the pizza field, above.
 * - **Consumer-side filtering.** The autocomplete's `filterStrategy` is the portal's, not the field's.
 */

const DECORATION: PortalFieldDecoration = DEFAULT_DECORATION;
const STATE: PortalFieldState = DEFAULT_STATE;

function field(
  spec: Partial<PortalFieldSpec> & Pick<PortalFieldSpec, 'id' | 'kind' | 'sectionId' | 'label'>
): PortalFieldSpec {
  return {
    name: spec.id,
    placeholder: '',
    span: 1,
    decoration: DECORATION,
    state: STATE,
    ...spec
  };
}

// Sold out is `disabled`, already-in-the-price is `readonly`. Both states have a reason a visitor reads off
// the label without being told, which is what makes the sample honest rather than decorative.
const PIZZAS: readonly PortalOptionSpec[] = [
  { value: 'margherita', label: 'Margherita' },
  { value: 'marinara', label: 'Marinara' },
  { value: 'funghi', label: 'Funghi' },
  { value: 'diavola', label: 'Diavola' },
  { value: 'hawaii', label: 'Hawaii' },
  { value: 'quattro-formaggi', label: 'Quattro Formaggi' },
  { value: 'custom', label: 'Custom — Your Own Combination' },
  { value: 'calzone', label: 'Calzone — the oven is full', disabled: true }
];

/**
 * What each pizza stands for. `custom` and the sold-out entry are deliberately absent: an option with no
 * patch leaves the model alone, which is what makes `Custom` the absence of a rule rather than a special
 * case.
 */
const PIZZA_PRESETS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  'margherita': { sauce: 'tomato', toppings: ['mozzarella', 'basil'] },
  'marinara': { sauce: 'tomato', toppings: [] },
  'funghi': { sauce: 'tomato', toppings: ['mozzarella', 'mushrooms'] },
  'diavola': { sauce: 'arrabbiata', toppings: ['mozzarella', 'salami', 'chilli'] },
  'hawaii': { sauce: 'tomato', toppings: ['mozzarella', 'ham', 'pineapple'] },
  'quattro-formaggi': { sauce: 'gorgonzola', toppings: ['mozzarella'] }
};

const SIZES: readonly PortalOptionSpec[] = [
  { value: 'small', label: 'Small — 26 cm' },
  { value: 'medium', label: 'Medium — 32 cm' },
  { value: 'large', label: 'Large — 40 cm' },
  { value: 'family', label: 'Family — sold out today', disabled: true }
];

const CRUSTS: readonly PortalOptionSpec[] = [
  { value: 'thin', label: 'Thin' },
  { value: 'classic', label: 'Classic' },
  { value: 'deep-pan', label: 'Deep Pan' },
  { value: 'stuffed', label: 'Stuffed' },
  { value: 'sourdough', label: 'Sourdough — tomorrow only', readonly: true },
  { value: 'gluten-free', label: 'Gluten-Free — sold out', disabled: true }
];

// The two lists are the same length on purpose: they sit side by side at one column each, and two option
// lists of equal height are what lets a single choice and a multiple choice be read against each other.
const SAUCES: readonly PortalOptionSpec[] = [
  { value: 'tomato', label: 'Tomato' },
  { value: 'arrabbiata', label: 'Arrabbiata' },
  { value: 'white', label: 'White (Garlic Cream)' },
  { value: 'gorgonzola', label: 'Gorgonzola Cream' },
  { value: 'bbq', label: 'BBQ' },
  { value: 'pesto', label: 'Pesto' },
  { value: 'house', label: 'House Sauce — the kitchen decides', readonly: true },
  { value: 'truffle', label: 'Truffle Cream — sold out', disabled: true }
];

const TOPPINGS: readonly PortalOptionSpec[] = [
  { value: 'basil', label: 'Basil' },
  { value: 'chilli', label: 'Chilli' },
  { value: 'ham', label: 'Ham' },
  { value: 'mushrooms', label: 'Mushrooms' },
  { value: 'pineapple', label: 'Pineapple' },
  { value: 'salami', label: 'Salami' },
  { value: 'mozzarella', label: 'Mozzarella — in the price', readonly: true },
  { value: 'anchovies', label: 'Anchovies — sold out', disabled: true }
];

// The autocomplete projects a custom option component, so these carry the second line it renders. The two
// halves of each entry are what makes the filter strategy legible: a street number is in the label and a
// postcode in the subtitle, and only fuzzy reaches both.
const ADDRESSES: readonly PortalOptionSpec[] = [
  { value: 'bahnhofstrasse', label: 'Bahnhofstrasse 12', subtitle: '8001 Zürich' },
  { value: 'langstrasse', label: 'Langstrasse 84', subtitle: '8004 Zürich' },
  { value: 'seefeldstrasse', label: 'Seefeldstrasse 40', subtitle: '8008 Zürich' },
  { value: 'birmensdorferstrasse', label: 'Birmensdorferstrasse 5', subtitle: '8003 Zürich' },
  { value: 'hardturmstrasse', label: 'Hardturmstrasse 120', subtitle: '8005 Zürich' },
  { value: 'flughafen', label: 'Flughafen Zürich', subtitle: 'Outside the delivery zone', disabled: true },
  { value: 'office', label: 'Office — on file', subtitle: 'Set by your account', readonly: true }
];

const BRANCHES: readonly PortalOptionSpec[] = [
  { value: 'central', label: 'Central — Bahnhofstrasse' },
  { value: 'west', label: 'West — Hardturm' },
  { value: 'lake', label: 'Lakeside — Seefeld' },
  { value: 'north', label: 'North — closed for renovation', disabled: true },
  { value: 'airport', label: 'Airport — staff only', readonly: true }
];

const PAYMENT_METHODS: readonly PortalOptionSpec[] = [
  { value: 'card', label: 'Card' },
  { value: 'twint', label: 'Twint' },
  { value: 'cash', label: 'Cash On Handover' },
  { value: 'invoice', label: 'Invoice — regular customers only', disabled: true }
];

const PREVIEW_SECTIONS: readonly PortalSectionSpec[] = [
  { id: 'pizza', title: 'Your Pizza' },
  { id: 'handover', title: 'Delivery Or Collection' },
  // The first group: neither the date nor the time is wrong on its own, only the pair is, so the rule that
  // reads both has nowhere to report but the group.
  { id: 'when', title: 'When', groupName: 'when' },
  // The second group, and the plainer reason to have one: payment details belong together in the model,
  // whether or not a rule ever reads two of them at once.
  { id: 'payment', title: 'Payment', groupName: 'payment' },
  { id: 'order', title: 'Your Order' }
];

export const PREVIEW_FIELDS: readonly PortalFieldSpec[] = [
  // #region Your Pizza
  field({
    id: 'pizza',
    kind: 'dropdown',
    sectionId: 'pizza',
    label: 'Pizza',
    placeholder: 'Choose one from the menu…',
    span: 2,
    options: PIZZAS,
    presets: PIZZA_PRESETS,
    panelPosition: 'right',
    decoration: {
      ...DECORATION,
      showRequiredMarker: true,
      hint: 'Fills the sauce and the toppings below. Change either afterwards — a pizza is a starting point, not a lock.',
      hintAlign: 'start'
    }
  }),
  field({
    id: 'size',
    kind: 'select',
    sectionId: 'pizza',
    label: 'Size',
    placeholder: 'Choose a size…',
    options: SIZES,
    decoration: { ...DECORATION, showRequiredMarker: true }
  }),
  field({
    id: 'crust',
    kind: 'select',
    sectionId: 'pizza',
    label: 'Crust',
    placeholder: 'Choose a crust…',
    options: CRUSTS,
    decoration: { ...DECORATION, showRequiredMarker: true }
  }),
  // The two group fields sit side by side at one column each, on option lists of equal length, so the
  // single-choice list and the multi-choice list are read against each other rather than one under the other.
  field({
    id: 'sauce',
    kind: 'radio-group',
    sectionId: 'pizza',
    label: 'Sauce',
    options: SAUCES,
    decoration: { ...DECORATION, showRequiredMarker: true }
  }),
  field({
    id: 'toppings',
    kind: 'checkbox-group',
    sectionId: 'pizza',
    label: 'Toppings',
    options: TOPPINGS,
    sortAlphabetically: true,
    decoration: { ...DECORATION, hint: 'Five is the limit.', hintAlign: 'start' }
  }),
  field({
    id: 'spice',
    kind: 'slider',
    sectionId: 'pizza',
    label: 'Spice',
    span: 2,
    min: 0,
    max: 4,
    step: 1,
    minLabel: 'Mild',
    maxLabel: 'Volcanic',
    showThumbLabel: true,
    showTickMarks: true,
    showMinMaxLabels: true,
    showTickLabels: false
  }),
  // #endregion

  // #region Delivery Or Collection
  // The switch, then the two fields it decides between. Delivery is the default, so the address is the one
  // on screen at load and the branch is the one a visitor reveals.
  field({
    id: 'pickup',
    kind: 'toggle',
    sectionId: 'handover',
    label: 'How To Get It',
    span: 2,
    toggleLabelPosition: 'after',
    onLabel: 'I Will Pick It Up',
    offLabel: 'Deliver It To Me'
  }),
  field({
    id: 'address',
    kind: 'autocomplete',
    sectionId: 'handover',
    label: 'Delivery Address',
    placeholder: 'Start typing a street…',
    span: 2,
    options: ADDRESSES,
    // Last in the list and exempt from the filter, so it is there precisely when nothing matched. It runs
    // the page's own create process instead of committing a value — see `user/fields.md`.
    actionOption: { value: 'add-address', label: 'Add A New Address…' },
    actionOptionMode: 'always',
    filterStrategy: 'fuzzy',
    visibleWhen: { field: 'pickup', equals: false },
    decoration: {
      ...DECORATION,
      showRequiredMarker: true,
      hint: 'Fuzzy search over a custom option component.',
      hintAlign: 'start'
    }
  }),
  // The second dropdown, and the reason the pair is workable: the pizza picker keeps the type on screen
  // while this half of the swap is destroyed.
  field({
    id: 'branch',
    kind: 'dropdown',
    sectionId: 'handover',
    label: 'Pick Up From',
    placeholder: 'Which branch?',
    span: 2,
    options: BRANCHES,
    defaultOption: { value: 'nearest', label: 'Nearest Branch To Me' },
    defaultOptionMode: 'always',
    panelPosition: 'left',
    visibleWhen: { field: 'pickup', equals: true },
    decoration: { ...DECORATION, showRequiredMarker: true }
  }),
  // #endregion

  // #region When
  field({
    id: 'date',
    kind: 'date',
    sectionId: 'when',
    label: 'Date',
    unicodeTokenFormat: 'dd . MM . yyyy',
    emptyHint: 'format',
    locale: 'en-GB',
    decoration: { ...DECORATION, hint: 'Open 11:00 to 23:00, closed on Mondays.', hintAlign: 'start' }
  }),
  field({
    id: 'time',
    kind: 'time',
    sectionId: 'when',
    label: 'Time',
    unicodeTokenFormat: 'HH:mm',
    emptyHint: 'format',
    locale: 'en-GB'
  }),
  // #endregion

  // #region Payment
  // The same reveal pattern as the handover pair, one group deeper: the condition names `method`, which is
  // `payment.method` in the model, and the `@if` the export writes carries that whole path.
  field({
    id: 'method',
    kind: 'radio-group',
    sectionId: 'payment',
    label: 'Pay By',
    options: PAYMENT_METHODS,
    decoration: { ...DECORATION, showRequiredMarker: true }
  }),
  field({
    id: 'cardNumber',
    kind: 'input',
    sectionId: 'payment',
    label: 'Card Number',
    mask: '0000 0000 0000 0000',
    showMaskTyped: true,
    visibleWhen: { field: 'method', equals: 'card' },
    decoration: {
      ...DECORATION,
      // The one field that states its own label position. It shares a row with the radio group, whose
      // vertical layout labels `outside` and cannot do otherwise, so the app default's `inside` here would
      // put the two labels of one row at different heights.
      labelPosition: 'outside',
      showRequiredMarker: true,
      hint: 'This form posts nowhere. Type whatever you like.',
      hintAlign: 'start'
    }
  }),
  // #endregion

  // #region Your Order
  field({
    id: 'orderName',
    kind: 'input',
    sectionId: 'order',
    label: 'Name On The Order',
    placeholder: 'Who is it for?',
    decoration: { ...DECORATION, showRequiredMarker: true }
  }),
  // The custom field sits late: a cart quantity belongs beside the order, not at the top of the pizza, and
  // it keeps the library's own components first — which is what a visitor came for.
  field({
    id: 'quantity',
    kind: 'counter',
    sectionId: 'order',
    label: 'How Many',
    min: 1,
    max: 10,
    step: 1
  }),
  // The two ways to reach you share the second row, and the mask is the only difference between them:
  // what a mask does, side by side and without a word of prose.
  field({
    id: 'phone',
    kind: 'input',
    sectionId: 'order',
    label: 'Phone Number',
    mask: '000 000 00 00',
    showMaskTyped: true,
    decoration: {
      ...DECORATION,
      showRequiredMarker: true,
      hint: 'Only used if the driver cannot find you.',
      hintAlign: 'start'
    }
  }),
  field({
    id: 'email',
    kind: 'input',
    sectionId: 'order',
    label: 'Email Address',
    placeholder: 'you@example.com',
    autocompleteHint: 'email',
    decoration: { ...DECORATION, showRequiredMarker: true, hint: 'The receipt goes here.', hintAlign: 'start' }
  }),
  field({
    id: 'notes',
    kind: 'textarea',
    sectionId: 'order',
    label: 'Notes For The Kitchen',
    placeholder: 'Extra crispy? Ring twice?',
    span: 2,
    maxLength: 200,
    enableAutosize: true,
    showLengthIndicator: true
  })
  // #endregion
];

// No `revealOn` or `showRequiredMarkers`: the form states neither, so both follow the app default.
const PREVIEW_FORM_OPTIONS: PortalFormOptions = {
  showLabels: true,
  showHints: true,
  showAdornments: false,
  readonly: false,
  disabled: false,
  updateOn: 'change',
  validator: 'vest',
  locale: 'en-GB'
};

export const PREVIEW_FORM_DEFINITION: PortalFormDefinition = {
  title: 'Order A Pizza',
  intro: 'Start from a pizza on the menu, then change anything. Nothing leaves this page.',
  submit: {
    label: 'Place Order',
    accepted: 'Order placed. About 30 minutes.',
    rejected: 'Something is missing.'
  },
  sections: PREVIEW_SECTIONS,
  fields: PREVIEW_FIELDS,
  options: PREVIEW_FORM_OPTIONS
};

/**
 * What the form starts filled with: a Margherita, which is the picker's own preset applied once up front.
 * An empty form shows none of the filled, selected or floating-label states that a theme is judged by.
 *
 * `when` and `payment` are nested because their sections are `ngModelGroup`s, and `branch` is absent because
 * the toggle it waits on starts off — the model carries what the rendered form carries, and nothing else.
 */
export const PREVIEW_INITIAL_MODEL: Readonly<Record<string, unknown>> = {
  pizza: 'margherita',
  size: 'large',
  crust: 'classic',
  sauce: 'tomato',
  toppings: ['mozzarella', 'basil'],
  spice: 2,
  pickup: false,
  address: 'langstrasse',
  when: { date: new Date(2026, 8, 25), time: new Date(2000, 0, 1, 19, 30) },
  payment: { method: 'card', cardNumber: '4242 4242 4242 4242' },
  orderName: 'Alex Moser',
  email: 'alex.moser@example.com',
  phone: '079 123 45 67',
  quantity: 2,
  notes: 'Ring twice, the bell is broken.'
};
