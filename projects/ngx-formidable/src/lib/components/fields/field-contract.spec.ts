import { page, userEvent } from 'vitest/browser';
import { BindFieldOptions, bindField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of every field, through every forms API, per **How Value And State Flow** in `user/forms.md`: the
 * model is what the field shows, only the user's edit reaches the model and dirties it, an edit inside the
 * field touches nothing, and leaving touches once, as the last act. The state each API holds — `disabled`,
 * `readonly`, `required` — reaches the field, and the classic APIs' `updateOn` never holds an edit back.
 *
 * Every edit is the user's own, with trusted clicks, keys and typing, on the field found by its role and label.
 */

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

const field = (role: 'textbox' | 'combobox' | 'switch' | 'slider') => page.getByRole(role, { name: 'Answer' });
const next = () => page.getByRole('button', { name: 'Next' });

/** Which of a group's options report themselves checked, in order. */
const checked = (role: 'radio' | 'checkbox') => () =>
  page
    .getByRole(role)
    .elements()
    .map((option) => option.getAttribute('aria-checked'));

/** Tabs into the field, types `text` and commits it with `Enter`, as a date or a time takes typing. */
const typeAndCommit = (text: string) => async () => {
  await userEvent.tab();
  await userEvent.keyboard(text);
  await userEvent.keyboard('{Enter}');
};

interface FieldCase {
  kind: FieldKind;
  inputs?: Record<string, unknown>;
  /** A value the model holds, and what the field shows for it. */
  value: unknown;
  shows: () => unknown;
  shown: unknown;
  /** The user's edit on top of `value`, which leaves focus in the field, and the model it leaves. */
  edit: () => Promise<void>;
  edited: unknown;
}

const fields: Record<string, FieldCase> = {
  'input': {
    kind: 'input',
    value: 'Cynthion',
    shows: () => (field('textbox').element() as HTMLInputElement).value,
    shown: 'Cynthion',
    edit: () => userEvent.fill(field('textbox'), 'Anna'),
    edited: 'Anna'
  },
  'textarea': {
    kind: 'textarea',
    value: 'notes',
    shows: () => (field('textbox').element() as HTMLTextAreaElement).value,
    shown: 'notes',
    edit: () => userEvent.fill(field('textbox'), 'more notes'),
    edited: 'more notes'
  },
  'select': {
    kind: 'select',
    inputs: { options },
    value: 'b',
    shows: () => (field('combobox').element() as HTMLSelectElement).value,
    shown: 'b',
    // A click would open the platform's own list, which no page can reach into.
    edit: async () => {
      await userEvent.tab();
      await userEvent.selectOptions(field('combobox'), 'a');
    },
    edited: 'a'
  },
  'dropdown': {
    kind: 'dropdown',
    inputs: { options },
    value: 'b',
    shows: () => (field('combobox').element() as HTMLInputElement).value,
    shown: 'Beta',
    // The display input takes no pointer events, so the click lands on the field around it.
    edit: async () => {
      await userEvent.click(field('combobox'), { force: true });
      await userEvent.click(page.getByRole('option', { name: 'Alpha' }));
    },
    edited: 'a'
  },
  'autocomplete': {
    kind: 'autocomplete',
    inputs: { options },
    value: 'b',
    shows: () => (field('combobox').element() as HTMLInputElement).value,
    shown: 'Beta',
    // The text it shows filters its list, so the label typed is what brings the option up to pick.
    edit: async () => {
      await userEvent.fill(field('combobox'), 'Alpha');
      await userEvent.click(page.getByRole('option', { name: 'Alpha' }));
    },
    edited: 'a'
  },
  'date': {
    kind: 'date',
    value: new Date(2020, 0, 2),
    shows: () => (field('combobox').element() as HTMLInputElement).value,
    shown: '2020-01-02',
    edit: typeAndCommit('20240512'),
    edited: new Date(2024, 4, 12)
  },
  'time': {
    kind: 'time',
    value: new Date(1970, 0, 1, 13, 45),
    shows: () => (field('textbox').element() as HTMLInputElement).value,
    shown: '13.45',
    edit: typeAndCommit('0815'),
    edited: new Date(1970, 0, 1, 8, 15)
  },
  'toggle': {
    kind: 'toggle',
    value: true,
    shows: () => field('switch').element().getAttribute('aria-checked'),
    shown: 'true',
    edit: () => userEvent.click(field('switch')),
    edited: false
  },
  'slider': {
    kind: 'slider',
    value: 40,
    shows: () => (field('slider').element() as HTMLInputElement).value,
    shown: '40',
    edit: async () => {
      await userEvent.tab();
      await userEvent.keyboard('{End}');
    },
    edited: 100
  },
  'radio group': {
    kind: 'radio-group',
    inputs: { options },
    value: 'b',
    shows: checked('radio'),
    shown: ['false', 'true'],
    edit: () => userEvent.click(page.getByRole('radio', { name: 'Alpha' })),
    edited: 'a'
  },
  'checkbox group': {
    kind: 'checkbox-group',
    inputs: { options },
    value: ['b'],
    shows: checked('checkbox'),
    shown: ['false', 'true'],
    edit: () => userEvent.click(page.getByRole('checkbox', { name: 'Alpha' })),
    edited: ['b', 'a']
  }
};

describe('field contract', () => {
  beforeEach(() => {
    configureFormidableTestBed();

    // A focused element left over from a previous spec would take the first Tab somewhere else.
    (document.activeElement as HTMLElement | null)?.blur();
  });

  for (const api of FORMS_APIS) {
    for (const [key, { kind, inputs, value, shows, shown, edit, edited }] of Object.entries(fields)) {
      describe(`${key}, bound ${api}`, () => {
        /** Binds the field under a label, with a button after it for focus to leave to. */
        const bind = (options: BindFieldOptions = {}) =>
          bindField(kind, api, {
            inputs,
            decorated: true,
            decoration: '<div formidableFieldLabel>Answer</div>',
            after: '<button type="button">Next</button>',
            ...options
          });

        it('shows what the model holds', async () => {
          const bound = await bind();

          await bound.write(value);

          expect(shows()).toEqual(shown);
        });

        it('leaves a programmatic write pristine, untouched and unreported', async () => {
          const bound = await bind();

          await bound.write(value);

          expect(bound.value()).toEqual(value);
          expect(bound.dirty()).toBe(false);
          expect(bound.touched()).toBe(false);
          expect(bound.events()).toEqual([]);
        });

        it("takes the user's edit into the model and dirties it, touching nothing while focus stays", async () => {
          const bound = await bind({ value });

          await edit();
          await expect.poll(bound.value).toEqual(edited);
          await settle(bound.fixture);

          expect(bound.element.contains(document.activeElement)).toBe(true);
          expect(bound.dirty()).toBe(true);
          expect(bound.touched()).toBe(false);
          expect(bound.events()).not.toContain('touch');
        });

        it('touches once, as the last act of leaving the field', async () => {
          const bound = await bind({ value });

          await edit();
          await userEvent.tab();
          await expect.element(next()).toHaveFocus();
          await settle(bound.fixture);

          expect(bound.touched()).toBe(true);
          expect(bound.events()).toContain('value');
          expect(bound.events().filter((event) => event === 'touch')).toEqual(['touch']);
          expect(bound.events().at(-1)).toBe('touch');
        });

        // A toggle's edit and a checkbox's pick flip what they are given, so repeating them is a change.
        if (kind !== 'toggle' && kind !== 'checkbox-group') {
          it('reports nothing for an edit that changes nothing', async () => {
            const bound = await bind({ value: edited });

            await edit();
            await settle(bound.fixture);

            expect(bound.events()).not.toContain('value');
            expect(bound.dirty()).toBe(false);
            expect(bound.value()).toEqual(edited);
          });
        }

        for (const state of ['disabled', 'readonly'] as const) {
          it(`follows the ${state} state the API holds`, async () => {
            const bound = await bind({ value });
            const decorator = bound.element.closest('formidable-field-decorator')!;

            await bound.state({ [state]: true });
            expect(decorator.classList).toContain(`is-${state}`);

            await bound.state({ [state]: false });
            expect(decorator.classList).not.toContain(`is-${state}`);
          });
        }

        it('shows the required marker the API holds', async () => {
          const bound = await bind({ value });
          const marker = () => bound.element.closest('formidable-field-decorator')!.querySelector('.required-marker');

          await bound.state({ required: true });
          expect(marker()).not.toBeNull();

          await bound.state({ required: false });
          expect(marker()).toBeNull();
        });

        if (api !== 'signal') {
          for (const updateOn of ['blur', 'submit'] as const) {
            it(`commits an edit at once under updateOn ${updateOn}`, async () => {
              const bound = await bind({ value, updateOn });

              await edit();

              await expect.poll(bound.value).toEqual(edited);
            });
          }
        }
      });
    }
  }

  // Typing commits on blur, per **The Touch Comes Last**, so the value has to be written by the time it touches.
  for (const api of FORMS_APIS) {
    for (const [kind, role, typed, committed] of [
      ['date', 'combobox', '20240512', new Date(2024, 4, 12)],
      ['time', 'textbox', '0815', new Date(1970, 0, 1, 8, 15)]
    ] as const) {
      it(`commits typed text before it touches, as focus leaves: ${kind}, bound ${api}`, async () => {
        const bound = await bindField(kind, api, {
          decorated: true,
          decoration: '<div formidableFieldLabel>Answer</div>',
          after: '<button type="button">Next</button>'
        });

        await userEvent.tab();
        await userEvent.keyboard(typed);
        await expect.element(field(role)).toHaveValue(kind === 'date' ? '2024-05-12' : '08.15');
        await userEvent.tab();
        await expect.element(next()).toHaveFocus();
        await settle(bound.fixture);

        expect(bound.value()).toEqual(committed);
        expect(bound.events()).toEqual(['value', 'touch']);
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
