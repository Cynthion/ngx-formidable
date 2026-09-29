import { bindField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of every field, through every forms API: the model is what the field shows, only the user's
 * edit reaches the model and dirties it, a blur touches as its last act, and the state each API forwards —
 * `disabled`, `readonly`, `required` — reaches the field. The field implements `FormValueControl`, so
 * `[formField]`, `ngModel` and `[formControl]` all bind it the same way, and the classic APIs' `updateOn`
 * never holds its value back.
 */

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

const within = (selector: string) => (element: HTMLElement) => element.querySelector<HTMLElement>(selector)!;

const text = (selector: string) => (element: HTMLElement) =>
  element.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)!.value;

/** Which of a group's options report themselves checked, in order. */
const checked = (element: HTMLElement) =>
  Array.from(element.querySelectorAll('formidable-field-option'), (option) => option.getAttribute('aria-checked'));

/** Clicks the option at `index`, as a pointer does. */
const pick = (index: number) => (element: HTMLElement) =>
  element
    .querySelectorAll('formidable-field-option')
    [index]!.querySelector('div')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));

/** Types a whole value and leaves, which is when a date or a time commits what was typed. */
const typeAndLeave = (text: string) => (element: HTMLElement) => {
  const input = element.querySelector('input')!;

  input.focus();
  fill(input, text);
  input.blur();
};

interface FieldCase {
  kind: FieldKind;
  inputs?: Record<string, unknown>;
  /** What takes focus. */
  focusable: (element: HTMLElement) => HTMLElement;
  /** A value the model holds, and what the field shows for it. */
  value: unknown;
  shows: (element: HTMLElement) => unknown;
  shown: unknown;
  /** A user's edit on top of `value`, and the model it leaves. */
  edit: (element: HTMLElement) => void;
  edited: unknown;
}

const fields: Record<string, FieldCase> = {
  'input': {
    kind: 'input',
    focusable: within('input'),
    value: 'Cynthion',
    shows: text('input'),
    shown: 'Cynthion',
    edit: (element) => fill(element.querySelector('input')!, 'Anna'),
    edited: 'Anna'
  },
  'textarea': {
    kind: 'textarea',
    focusable: within('textarea'),
    value: 'notes',
    shows: text('textarea'),
    shown: 'notes',
    edit: (element) => fill(element.querySelector('textarea')!, 'more notes'),
    edited: 'more notes'
  },
  'select': {
    kind: 'select',
    inputs: { options },
    focusable: within('select'),
    value: 'b',
    shows: text('select'),
    shown: 'b',
    edit: (element) => {
      const select = element.querySelector('select')!;

      select.value = 'a';
      select.dispatchEvent(new Event('change'));
    },
    edited: 'a'
  },
  'dropdown': {
    kind: 'dropdown',
    inputs: { options },
    focusable: within('input'),
    value: 'b',
    shows: text('input'),
    shown: 'Beta',
    edit: pick(0),
    edited: 'a'
  },
  'autocomplete': {
    kind: 'autocomplete',
    inputs: { options },
    focusable: within('input'),
    value: 'b',
    shows: text('input'),
    shown: 'Beta',
    edit: pick(0),
    edited: 'a'
  },
  'date': {
    kind: 'date',
    focusable: within('input'),
    value: new Date(2020, 0, 2),
    shows: text('input'),
    shown: '2020-01-02',
    edit: typeAndLeave('2024-05-12'),
    edited: new Date(2024, 4, 12)
  },
  'time': {
    kind: 'time',
    focusable: within('input'),
    value: new Date(1970, 0, 1, 13, 45),
    shows: text('input'),
    shown: '13.45',
    edit: typeAndLeave('08.15'),
    edited: new Date(1970, 0, 1, 8, 15)
  },
  'toggle': {
    kind: 'toggle',
    focusable: within('[role="switch"]'),
    value: true,
    shows: (element) => element.querySelector('[role="switch"]')!.getAttribute('aria-checked'),
    shown: 'true',
    edit: (element) => element.querySelector<HTMLElement>('[role="switch"]')!.click(),
    edited: false
  },
  'slider': {
    kind: 'slider',
    focusable: within('input[type="range"]'),
    value: 40,
    shows: text('input[type="range"]'),
    shown: '40',
    edit: (element) => {
      const range = element.querySelector<HTMLInputElement>('input[type="range"]')!;

      range.value = '60';
      range.dispatchEvent(new Event('input'));
    },
    edited: 60
  },
  'radio group': {
    kind: 'radio-group',
    inputs: { options },
    focusable: within('[role="radiogroup"]'),
    value: 'b',
    shows: checked,
    shown: ['false', 'true'],
    edit: pick(0),
    edited: 'a'
  },
  'checkbox group': {
    kind: 'checkbox-group',
    inputs: { options },
    focusable: within('[role="group"]'),
    value: ['b'],
    shows: checked,
    shown: ['false', 'true'],
    edit: pick(0),
    edited: ['b', 'a']
  }
};

describe('field contract', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const [key, field] of Object.entries(fields)) {
      const { kind, inputs, focusable, value, shows, shown, edit, edited } = field;

      describe(`${key}, bound ${api}`, () => {
        it('shows what the model holds', async () => {
          const bound = await bindField(kind, api, { inputs });

          await bound.write(value);

          expect(shows(bound.element)).toEqual(shown);
        });

        it('leaves a programmatic write pristine, untouched and unreported', async () => {
          const bound = await bindField(kind, api, { inputs });

          await bound.write(value);

          expect(bound.value()).toEqual(value);
          expect(bound.dirty()).toBe(false);
          expect(bound.touched()).toBe(false);
          expect(bound.events()).toEqual([]);
        });

        it("takes the user's edit into the model and dirties it", async () => {
          const bound = await bindField(kind, api, { value, inputs });

          edit(bound.element);
          await settle(bound.fixture);

          expect(bound.value()).toEqual(edited);
          expect(bound.dirty()).toBe(true);
        });

        it('touches as the last act of a blur', async () => {
          const bound = await bindField(kind, api, { value, inputs });
          const target = focusable(bound.element);

          target.focus();
          edit(bound.element);
          target.blur();
          await settle(bound.fixture);

          expect(bound.touched()).toBe(true);
          expect(bound.events()).toContain('value');
          expect(bound.events().at(-1)).toBe('touch');
        });

        // A toggle's edit and a checkbox's pick flip what they are given, so repeating them is a change.
        if (kind !== 'toggle' && kind !== 'checkbox-group') {
          it('reports nothing for an edit that changes nothing', async () => {
            const bound = await bindField(kind, api, { value: edited, inputs });

            edit(bound.element);
            await settle(bound.fixture);

            expect(bound.events()).not.toContain('value');
            expect(bound.dirty()).toBe(false);
            expect(bound.value()).toEqual(edited);
          });
        }

        for (const state of ['disabled', 'readonly'] as const) {
          it(`follows the ${state} state the API holds`, async () => {
            const bound = await bindField(kind, api, { value, inputs, decorated: true });
            const decorator = bound.element.closest('formidable-field-decorator')!;

            await bound.state({ [state]: true });
            expect(decorator.classList).toContain(`is-${state}`);

            await bound.state({ [state]: false });
            expect(decorator.classList).not.toContain(`is-${state}`);
          });
        }

        it('shows the required marker the API holds', async () => {
          const bound = await bindField(kind, api, { value, inputs, decorated: true });
          const marker = () => bound.element.closest('formidable-field-decorator')!.querySelector('.required-marker');

          await bound.state({ required: true });
          expect(marker()).not.toBeNull();

          await bound.state({ required: false });
          expect(marker()).toBeNull();
        });

        if (api !== 'signal') {
          for (const updateOn of ['blur', 'submit'] as const) {
            it(`commits an edit at once under updateOn ${updateOn}`, async () => {
              const bound = await bindField(kind, api, { value, inputs, updateOn });

              edit(bound.element);
              await settle(bound.fixture);

              expect(bound.value()).toEqual(edited);
            });
          }
        }
      });
    }
  }

  // Clamping a slider, re-masking an input or dropping a value no option carries would each write back what
  // the field was never asked to change.
  const uncorrected: Record<string, { kind: FieldKind; value: unknown; inputs?: Record<string, unknown> }> = {
    'an out-of-range slider': { kind: 'slider', value: 150, inputs: { max: 100 } },
    'an off-step slider': { kind: 'slider', value: 33, inputs: { step: 10 } },
    'a masked input': { kind: 'input', value: '123456', inputs: { mask: '000-000' } },
    'a dropdown with no such option': { kind: 'dropdown', value: 'z', inputs: { options } },
    'a checkbox group with no such option': { kind: 'checkbox-group', value: ['a', 'z'], inputs: { options } }
  };

  for (const api of FORMS_APIS) {
    for (const [key, { kind, value, inputs }] of Object.entries(uncorrected)) {
      it(`corrects nothing it is given: ${key}, bound ${api}`, async () => {
        const bound = await bindField(kind, api, { inputs });

        await bound.write(value);
        await settle(bound.fixture, 50);

        expect(bound.value()).toEqual(value);
        expect(bound.dirty()).toBe(false);
        expect(bound.events()).toEqual([]);
      });
    }
  }
});
