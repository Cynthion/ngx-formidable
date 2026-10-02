import { page } from 'vitest/browser';
import { bindField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Contract of a field's first render: every field shows the value it is bound to, decorated or not, through
 * every forms API. `[formControl]` writes before the field's view exists, which once threw NG0951 in
 * `input-field`; inside a `<form>`, `ngModel` writes across a microtask.
 *
 * Each field is the only one rendered, so it is found by its role alone: an undecorated field has no label.
 * The first render has settled, so each assertion is made once.
 */

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

/** What the editor of `role` shows. */
const text = (role: 'textbox' | 'combobox' | 'slider', shown: string) => () =>
  expect(page.getByRole(role).element()).toHaveValue(shown);

/** That a group checks Beta and only Beta. */
const checksBeta = (role: 'radio' | 'checkbox') => () => {
  expect(page.getByRole(role, { name: 'Beta' }).element()).toBeChecked();
  expect(page.getByRole(role, { name: 'Alpha' }).element()).not.toBeChecked();
};

const fields: Record<string, { kind: FieldKind; value: unknown; inputs?: Record<string, unknown>; shows: () => void }> =
  {
    'input': { kind: 'input', value: 'Cynthion', shows: text('textbox', 'Cynthion') },
    'masked input': {
      kind: 'input',
      value: 'ABC1234',
      inputs: { mask: 'AAA-0000' },
      shows: text('textbox', 'ABC-1234')
    },
    'textarea': { kind: 'textarea', value: 'notes', shows: text('textbox', 'notes') },
    'autocomplete': { kind: 'autocomplete', value: 'b', inputs: { options }, shows: text('combobox', 'Beta') },
    'dropdown': { kind: 'dropdown', value: 'b', inputs: { options }, shows: text('combobox', 'Beta') },
    'select': { kind: 'select', value: 'b', inputs: { options }, shows: text('combobox', 'b') },
    'radio group': { kind: 'radio-group', value: 'b', inputs: { options }, shows: checksBeta('radio') },
    'checkbox group': { kind: 'checkbox-group', value: ['b'], inputs: { options }, shows: checksBeta('checkbox') },
    'date': { kind: 'date', value: new Date(2020, 0, 2), shows: text('combobox', '2020-01-02') },
    'time': { kind: 'time', value: new Date(2020, 0, 2, 13, 45), shows: text('textbox', '13.45') },
    'slider': { kind: 'slider', value: 40, shows: text('slider', '40') },
    'toggle': { kind: 'toggle', value: true, shows: () => expect(page.getByRole('switch').element()).toBeChecked() }
  };

describe('first render', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const [key, { kind, value, inputs, shows }] of Object.entries(fields)) {
      for (const decorated of [false, true]) {
        it(`shows the value of ${decorated ? 'a decorated' : 'an undecorated'} ${key}, bound ${api}`, async () => {
          await bindField(kind, api, { value, inputs, decorated });

          shows();
        });
      }
    }
  }
});
