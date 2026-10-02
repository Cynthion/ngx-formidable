import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * The five option fields' value, per **Options** in `user/fields.md`: the model names an option by its value,
 * and the field shows whichever option carries it. A value no option carries, yet or any more, renders as no
 * selection and stays in the model untouched; the moment its option arrives, the field shows it. A user's
 * pick is the model like any other value, so a changed option list leaves it where it is.
 *
 * A user picks with a trusted click, or the native select's own pick.
 */

const options: FormidableOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

const zeta: FormidableOption = { value: 'z', label: 'Zeta' };

const combobox = () => page.getByRole('combobox');

/** What a user sees picked in a select, a dropdown or an autocomplete: its text. Empty for no selection. */
function shown(): string[] {
  const field = combobox().element() as HTMLInputElement | HTMLSelectElement;

  if (field instanceof HTMLSelectElement) {
    return Array.from(field.selectedOptions, (option) => option.value && option.label).filter(Boolean);
  }

  return field.value ? [field.value] : [];
}

/** The options a group shows checked. */
const checked = (role: 'radio' | 'checkbox') => () =>
  page
    .getByRole(role, { checked: true })
    .elements()
    .map((option) => option.textContent!.trim());

/** Clicks the option of a field's open panel. */
const pickFromPanel = () => userEvent.click(page.getByRole('option', { name: 'Alpha' }));

interface OptionFieldCase {
  kind: FieldKind;
  /** A model naming `zeta`, which no option carries until it arrives. */
  unknown: unknown;
  /** The model a pick of the first option leaves. */
  picked: unknown;
  /** The user's pick of the first option. */
  pick: () => Promise<void>;
  /** The labels the field shows as picked, in order. Empty for no selection. */
  selection: () => string[];
}

const fields: OptionFieldCase[] = [
  {
    kind: 'select',
    unknown: 'z',
    picked: 'a',
    pick: () => userEvent.selectOptions(combobox(), 'Alpha'),
    selection: shown
  },
  {
    kind: 'dropdown',
    unknown: 'z',
    picked: 'a',
    pick: async () => {
      // The display input takes no pointer events, so a click on it lands on the field around it.
      await userEvent.click(combobox(), { force: true });
      await pickFromPanel();
    },
    selection: shown
  },
  {
    kind: 'autocomplete',
    unknown: 'z',
    picked: 'a',
    pick: async () => {
      await userEvent.click(combobox());
      await userEvent.keyboard('{ArrowDown}');
      await pickFromPanel();
    },
    selection: shown
  },
  {
    kind: 'radio-group',
    unknown: 'z',
    picked: 'a',
    pick: () => userEvent.click(page.getByRole('radio', { name: 'Alpha' })),
    selection: checked('radio')
  },
  {
    kind: 'checkbox-group',
    unknown: ['z'],
    picked: ['a'],
    pick: () => userEvent.click(page.getByRole('checkbox', { name: 'Alpha' })),
    selection: checked('checkbox')
  }
];

describe('option field value', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const { kind, unknown, picked, pick, selection } of fields) {
      describe(`${kind}, bound ${api}`, () => {
        it('renders a value no option carries as no selection, and leaves the model alone', async () => {
          const bound = await bindField(kind, api, { inputs: { options } });

          await bound.write(unknown);
          await settle(bound.fixture, 50);

          expect(selection()).toEqual([]);
          expect(bound.value()).toEqual(unknown);
          expect(bound.dirty()).toBe(false);
          expect(bound.events()).toEqual([]);
        });

        it('shows the value once its option arrives', async () => {
          const bound = await bindField(kind, api, { inputs: { options } });

          await bound.write(unknown);
          await bound.set('options', [...options, zeta]);

          expect(selection()).toEqual(['Zeta']);
          expect(bound.value()).toEqual(unknown);
        });

        it('shows a value written before any option exists, once the options arrive', async () => {
          const bound = await bindField(kind, api, { inputs: { options: [] } });

          await bound.write(unknown);
          await bound.set('options', [...options, zeta]);

          expect(selection()).toEqual(['Zeta']);
          expect(bound.value()).toEqual(unknown);
          expect(bound.events()).toEqual([]);
        });

        it("keeps the user's pick when the option list changes", async () => {
          const bound = await bindField(kind, api, { inputs: { options } });

          await pick();
          await expect.poll(bound.value).toEqual(picked);
          await bound.set('options', [zeta, ...options]);
          await settle(bound.fixture, 50);

          expect(bound.value()).toEqual(picked);
          expect(selection()).toEqual(['Alpha']);
        });
      });
    }
  }
});
