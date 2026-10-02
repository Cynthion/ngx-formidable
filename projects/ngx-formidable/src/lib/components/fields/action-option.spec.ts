import type { Mock } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { FieldDefaultOptionMode, FormidableOption } from '../../models/formidable.model';
import { bindField, BoundField } from '../../testing/bind-field';
import { referenced } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * The `actionOption` the two panel fields take, per **An Action Row Is Not A Value** in `user/fields.md`: an
 * entry at the end of the list that runs an action instead of becoming a value, "Add A New Address…".
 *
 * It renders as an option and the keyboard walks it as one. What separates it from an option is the value:
 * picking it commits nothing, a model written to its value finds no option, the autocomplete never picks it
 * off its typed label, and the dropdown's type-ahead walks past it. It never stands in for a result either: a
 * list showing the action still says that nothing matched.
 *
 * Every spec opens the panel and picks from it as a user does, with trusted clicks and keys.
 */

const OPTIONS: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

const ACTION = 'Add A New One…';

const combobox = () => page.getByRole('combobox', { name: 'Colour' });

/** The labels of the options the open panel shows, in order. */
const labels = () =>
  page
    .getByRole('option')
    .elements()
    .map((option) => option.textContent!.trim());

/** The label of the option the field highlights, or `null` for none. */
const highlighted = () => referenced(combobox().element(), 'aria-activedescendant')[0]?.textContent?.trim() ?? null;

describe('action option', () => {
  let runs: Mock<() => void>;

  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
    runs = vi.fn();
  });

  /** Binds the field under a label, with an action entry. */
  function bind(
    kind: 'dropdown' | 'autocomplete',
    { options = OPTIONS, mode = 'always' }: { options?: FormidableOption[]; mode?: FieldDefaultOptionMode } = {}
  ): Promise<BoundField> {
    return bindField(kind, 'signal', {
      inputs: { options, actionOption: { value: '__add__', label: ACTION, action: runs }, actionOptionMode: mode },
      decorated: true,
      decoration: '<div formidableFieldLabel>Colour</div>'
    });
  }

  describe('dropdown', () => {
    /** Opens the panel with a click, as a user does. The display input takes no pointer events, so it lands on the field around it. */
    async function open(): Promise<void> {
      await userEvent.click(combobox(), { force: true });
      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
    }

    it('renders last, after the options', async () => {
      await bind('dropdown');
      await open();

      expect(labels()).toEqual(['Red', 'Blue', ACTION]);
    });

    it('stays out of the list in the fallback mode while options exist', async () => {
      await bind('dropdown', { mode: 'fallback' });
      await open();

      expect(labels()).toEqual(['Red', 'Blue']);
    });

    it('renders beside the empty-state text, not instead of it', async () => {
      await bind('dropdown', { options: [], mode: 'fallback' });
      await open();

      expect(labels()).toEqual([ACTION]);
      await expect.element(page.getByRole('listbox').getByText('No options available.')).toBeVisible();
    });

    it('runs its action on a click, commits nothing and closes the panel', async () => {
      const field = await bind('dropdown');
      await open();

      await userEvent.click(page.getByRole('option', { name: ACTION }));

      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
      expect(runs).toHaveBeenCalledOnce();
      expect(field.value()).toBeNull();
      await expect.element(combobox()).toHaveValue('');
    });

    it('is reached by the keyboard and runs its action on Enter', async () => {
      const field = await bind('dropdown');
      await userEvent.tab();

      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
      await expect.poll(highlighted).toBe(ACTION);

      await userEvent.keyboard('{Enter}');

      await expect.poll(() => runs.mock.calls.length).toBe(1);
      expect(field.value()).toBeNull();
    });

    // "a" starts no option's label, but it does start the action entry's.
    it('is skipped by the type-ahead', async () => {
      const field = await bind('dropdown');
      await userEvent.tab();

      await userEvent.keyboard('a');
      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
      await settle(field.fixture, 200);

      expect(highlighted()).toBeNull();
    });

    it('is not selected by a model written to its value', async () => {
      const field = await bind('dropdown');

      await field.write('__add__');
      await open();

      await expect.element(combobox()).toHaveValue('');
      expect(page.getByRole('option', { selected: true }).elements()).toEqual([]);
    });
  });

  describe('autocomplete', () => {
    /** Types into the field and lets its filter through. */
    async function search(field: BoundField, text: string): Promise<void> {
      await userEvent.click(combobox());
      await userEvent.keyboard(text);
      await settle(field.fixture, 300); // clears the 200ms filter debounce
    }

    it('survives a filter that matches nothing, beside the empty-state text', async () => {
      const field = await bind('autocomplete');

      await search(field, 'zzz');

      expect(labels()).toEqual([ACTION]);
      await expect.element(page.getByRole('listbox').getByText('No options available.')).toBeVisible();
    });

    it('runs its action on a click, commits nothing and closes the panel', async () => {
      const field = await bind('autocomplete');
      await search(field, 'zzz');

      await userEvent.click(page.getByRole('option', { name: ACTION }));

      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
      expect(runs).toHaveBeenCalledOnce();
      expect(field.value()).toBeNull();
    });

    it('leaves the typed filter alone, so the action can read it', async () => {
      const field = await bind('autocomplete');
      await search(field, 'Wiesenstrasse 5');

      await userEvent.click(page.getByRole('option', { name: ACTION }));

      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
      await expect.element(combobox()).toHaveValue('Wiesenstrasse 5');
    });

    it('is not picked by typing its label exactly', async () => {
      const field = await bind('autocomplete');

      await search(field, ACTION);

      expect(runs).not.toHaveBeenCalled();
      expect(field.value()).toBeNull();
      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
