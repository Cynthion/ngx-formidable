import { bindField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Contract of a field's first render: every field shows the value it is bound to, decorated or not, through
 * every forms API.
 *
 * `[formControl]` writes from its own `ngOnChanges`, before the field's view exists. A standalone `ngModel`,
 * one outside a `<form>`, writes at the same point, and it is where `input-field` once read its `@if`-held
 * input and threw NG0951 — so the reactive run covers that path. Inside a `<form>` the control registers
 * across a microtask.
 */

const options = [{ value: 'a' }, { value: 'b' }];

/** What an editor shows: an input's or a textarea's text, or the value of the option a select has selected. */
const text = (element: HTMLElement) =>
  element.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')!.value;

/** Which of a group's native boxes are checked, in order. */
const checked = (element: HTMLElement) =>
  Array.from(element.querySelectorAll<HTMLInputElement>('input[hidden]'), (box) => box.checked);

/** Whether a toggle reports itself switched on. */
const switched = (element: HTMLElement) => element.querySelector('[role="switch"]')!.getAttribute('aria-checked');

const fields: Record<
  string,
  {
    kind: FieldKind;
    value: unknown;
    inputs?: Record<string, unknown>;
    shows: (element: HTMLElement) => unknown;
    shown: unknown;
  }
> = {
  'input': { kind: 'input', value: 'Cynthion', shows: text, shown: 'Cynthion' },
  'masked input': { kind: 'input', value: 'ABC1234', inputs: { mask: 'AAA-0000' }, shows: text, shown: 'ABC-1234' },
  'textarea': { kind: 'textarea', value: 'notes', shows: text, shown: 'notes' },
  'autocomplete': { kind: 'autocomplete', value: 'b', inputs: { options }, shows: text, shown: 'b' },
  'dropdown': { kind: 'dropdown', value: 'b', inputs: { options }, shows: text, shown: 'b' },
  'select': { kind: 'select', value: 'b', inputs: { options }, shows: text, shown: 'b' },
  'radio group': { kind: 'radio-group', value: 'b', inputs: { options }, shows: checked, shown: [false, true] },
  'checkbox group': { kind: 'checkbox-group', value: ['b'], inputs: { options }, shows: checked, shown: [false, true] },
  'date': { kind: 'date', value: new Date(2020, 0, 2), shows: text, shown: '2020-01-02' },
  'time': { kind: 'time', value: new Date(2020, 0, 2, 13, 45), shows: text, shown: '13.45' },
  'slider': { kind: 'slider', value: 40, shows: text, shown: '40' },
  'toggle': { kind: 'toggle', value: true, shows: switched, shown: 'true' }
};

describe('first render', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const [key, { kind, value, inputs, shows, shown }] of Object.entries(fields)) {
      for (const decorated of [false, true]) {
        it(`shows the value of ${decorated ? 'a decorated' : 'an undecorated'} ${key}, bound ${api}`, async () => {
          const { element } = await bindField(kind, api, { value, inputs, decorated });

          expect(shows(element)).toEqual(shown);
        });
      }
    }
  }
});
