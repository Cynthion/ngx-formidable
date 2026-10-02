import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { referenced } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * The ARIA a field owns inside its own box, the mirror of the decorator's. A dropdown and an autocomplete are
 * comboboxes that control a listbox; a date field is a combobox over a dialog, because a calendar is not a list
 * and Pikaday's cells carry no ids of ours; a radio group holds radios and a checkbox group checkboxes. The
 * active descendant names the option the highlight is on, and an option reports itself selected in a listbox
 * and checked in a group. A native select keeps the platform's own.
 *
 * Every spec finds the field and its options by role and label, as assistive technology does, and works them
 * with real keys. An id-reference is resolved rather than compared, so a dangling one fails.
 */

const OPTIONS: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green', disabled: true }
];

/** Binds the field under a label, and tabs into it. */
async function tabInto(kind: FieldKind, inputs: Record<string, unknown> = { options: OPTIONS }): Promise<BoundField> {
  const bound = await bindField(kind, 'signal', {
    inputs,
    decorated: true,
    decoration: '<div formidableFieldLabel>Colour</div>'
  });

  await userEvent.tab();

  return bound;
}

const combobox = () => page.getByRole('combobox', { name: 'Colour' });

/** The value of `attribute` on every option of `role` on show, in order. */
function states(role: 'option' | 'radio' | 'checkbox', attribute: string): (string | null)[] {
  return page
    .getByRole(role)
    .elements()
    .map((option) => option.getAttribute(attribute));
}

function padding(element: Element): string[] {
  const style = getComputedStyle(element);

  return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
}

describe('panel and option field ARIA', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  for (const kind of ['dropdown', 'autocomplete'] as const) {
    describe(`${kind} as a combobox`, () => {
      it('controls a listbox', async () => {
        await tabInto(kind);

        await expect.element(combobox()).toHaveFocus();
        expect(referenced(combobox().element(), 'aria-controls')[0]?.getAttribute('role')).toBe('listbox');
      });

      it('reports whether its panel is open', async () => {
        await tabInto(kind);

        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');

        await userEvent.keyboard('{ArrowDown}');

        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
      });

      it('gives every option its role, unselected, and marks a disabled one', async () => {
        await tabInto(kind);
        await userEvent.keyboard('{ArrowDown}');

        await expect.element(page.getByRole('option', { name: 'Green' })).toHaveAttribute('aria-disabled', 'true');
        expect(states('option', 'aria-selected')).toEqual(['false', 'false', 'false']);
        expect(states('option', 'aria-disabled')).toEqual([null, null, 'true']);
      });

      // The active descendant and the highlight are read off the same state, so they can never name two options.
      it('names the highlighted option, and only once one is highlighted', async () => {
        await tabInto(kind);

        await userEvent.keyboard('{ArrowDown}'); // opens the panel, highlights nothing
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');

        expect(combobox().element().getAttribute('aria-activedescendant')).toBeNull();

        await userEvent.keyboard('{ArrowDown}');

        const red = page.getByRole('option', { name: 'Red' }).element();

        await expect.poll(() => referenced(combobox().element(), 'aria-activedescendant')[0]).toBe(red);
        expect(red.querySelector('.is-highlighted')).not.toBeNull();
      });

      it('reports the option it selects', async () => {
        await tabInto(kind);

        await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
        await userEvent.keyboard('{ArrowDown}');

        await expect.element(page.getByRole('option', { selected: true })).toHaveTextContent('Red');
        expect(states('option', 'aria-selected')).toEqual(['true', 'false', 'false']);
      });
    });
  }

  describe('autocomplete', () => {
    it('says its list is what completes the typing', async () => {
      await tabInto('autocomplete');

      await expect.element(combobox()).toHaveAttribute('aria-autocomplete', 'list');
    });

    // The empty state once was an option component, which announced itself as something to pick.
    it('offers no option at all when there is nothing to offer', async () => {
      await tabInto('autocomplete', { options: [] });

      await userEvent.keyboard('{ArrowDown}');

      await expect.element(page.getByRole('listbox')).toHaveTextContent('No options available.');
      expect(page.getByRole('option').elements()).toEqual([]);
    });

    // Losing the option wrapper lost the row's padding with it, which left the text on the panel edge.
    it('insets its empty text exactly as an option row is inset', async () => {
      const field = await tabInto('autocomplete');
      const row = page.getByRole('option', { name: 'Red', includeHidden: true }).element().firstElementChild!;
      const inset = padding(row);

      await field.set('options', []);

      expect(padding(field.element.querySelector('.no-option')!)).toEqual(inset);
    });
  });

  describe('date field as a combobox over a dialog', () => {
    it('points at a dialog rather than at a listbox', async () => {
      await tabInto('date', {});

      await expect.element(combobox()).toHaveAttribute('aria-haspopup', 'dialog');
      expect(referenced(combobox().element(), 'aria-controls')[0]?.getAttribute('role')).toBe('dialog');
    });

    it('reports whether its panel is open', async () => {
      await tabInto('date', {});

      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');

      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
    });

    // Pikaday owns the cells, so there is no option of ours to name, even as the arrows move the calendar.
    it('names no active descendant', async () => {
      await tabInto('date', {});

      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}{ArrowDown}');
      await expect.element(combobox()).not.toHaveValue('');

      expect(combobox().element().getAttribute('aria-activedescendant')).toBeNull();
    });
  });

  for (const { kind, group, role } of [
    { kind: 'radio-group', group: 'radiogroup', role: 'radio' },
    { kind: 'checkbox-group', group: 'group', role: 'checkbox' }
  ] as const) {
    describe(kind, () => {
      // `aria-selected` belongs to a listbox; a radio and a checkbox report `aria-checked`.
      it('reports its options checked rather than selected', async () => {
        await tabInto(kind);

        await expect.element(page.getByRole(group, { name: 'Colour' })).toHaveFocus();
        expect(states(role, 'aria-checked')).toEqual(['false', 'false', 'false']);
        expect(states(role, 'aria-selected')).toEqual([null, null, null]);
      });

      // A group has no open state, so it highlights its first option straight away: the arrows need somewhere
      // to start from. The panels are the ones that begin with nothing highlighted.
      it('names an active option from the start, and moves it with the arrows', async () => {
        await tabInto(kind);
        const field = page.getByRole(group, { name: 'Colour' }).element();

        await expect
          .poll(() => referenced(field, 'aria-activedescendant')[0])
          .toBe(page.getByRole(role, { name: 'Red' }).element());

        await userEvent.keyboard('{ArrowDown}');

        const blue = page.getByRole(role, { name: 'Blue' }).element();

        await expect.poll(() => referenced(field, 'aria-activedescendant')[0]).toBe(blue);
        expect(blue.querySelector('.is-highlighted')).not.toBeNull();
      });
    });
  }

  it('checks only the radio it picks', async () => {
    await tabInto('radio-group');

    await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');

    await expect.poll(() => states('radio', 'aria-checked')).toEqual(['false', 'true', 'false']);
  });

  it('checks every checkbox it picks', async () => {
    await tabInto('checkbox-group');

    await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');

    await expect.poll(() => states('checkbox', 'aria-checked')).toEqual(['true', 'true', 'false']);
  });

  it('leaves the native select alone', async () => {
    await tabInto('select');

    await expect.element(combobox()).toHaveFocus();
    expect(combobox().element().getAttribute('role')).toBeNull();
    expect(combobox().element().getAttribute('aria-expanded')).toBeNull();
  });
});
