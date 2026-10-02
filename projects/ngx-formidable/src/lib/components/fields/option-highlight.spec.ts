import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { referenced } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Where the keyboard highlight goes in a field that walks an option list, per **Keyboard** in
 * `user/fields.md`: the arrows step through the options a user can pick, skipping disabled and readonly ones
 * and wrapping at both ends; `Enter` picks the highlighted option, and a group's `Space` does too. When the
 * list changes, the highlight stays on the option it was on, unless the selection claims it.
 *
 * Every spec reaches the field the way a keyboard user does: by its label and role, with real keys.
 */

const RED: FormidableOption = { value: 'red', label: 'Red' };
const BLUE: FormidableOption = { value: 'blue', label: 'Blue', disabled: true };
const GREEN: FormidableOption = { value: 'green', label: 'Green' };
const GREY: FormidableOption = { value: 'grey', label: 'Grey', readonly: true };
const TEAL: FormidableOption = { value: 'teal', label: 'Teal' };

// The last option can be picked, so a walk up that starts one short of it shows.
const OPTIONS = [RED, BLUE, GREEN, GREY, TEAL];

/** The label of the option the focused field highlights, or `null` for none. */
function highlighted(): string | null {
  return referenced(document.activeElement!, 'aria-activedescendant')[0]?.textContent?.trim() ?? null;
}

/** Binds the field under a label, and tabs into it. */
async function tabInto(kind: FieldKind, role: 'radiogroup' | 'group' | 'combobox'): Promise<BoundField> {
  const bound = await bindField(kind, 'signal', {
    inputs: { options: OPTIONS },
    decorated: true,
    decoration: '<div formidableFieldLabel>Colour</div>'
  });

  await userEvent.tab();
  await expect.element(page.getByRole(role, { name: 'Colour' })).toHaveFocus();

  return bound;
}

describe('option field highlight', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  for (const { kind, role } of [
    { kind: 'radio-group', role: 'radiogroup' },
    { kind: 'checkbox-group', role: 'group' }
  ] as const) {
    describe(kind, () => {
      it('highlights the first option it can pick as focus enters', async () => {
        await tabInto(kind, role);

        await expect.poll(highlighted).toBe('Red');
      });

      it('walks down the options it can pick, and wraps', async () => {
        await tabInto(kind, role);

        for (const label of ['Green', 'Teal', 'Red']) {
          await userEvent.keyboard('{ArrowDown}');
          await expect.poll(highlighted).toBe(label);
        }
      });

      it('walks up the same options, and wraps', async () => {
        await tabInto(kind, role);

        for (const label of ['Teal', 'Green', 'Red']) {
          await userEvent.keyboard('{ArrowUp}');
          await expect.poll(highlighted).toBe(label);
        }
      });

      it('keeps the highlight on its option when the list is reordered', async () => {
        const field = await tabInto(kind, role);

        await userEvent.keyboard('{ArrowDown}');
        await expect.poll(highlighted).toBe('Green');

        await field.set('options', [GREEN, RED, BLUE, GREY, TEAL]);

        expect(highlighted()).toBe('Green');
      });

      it('moves the highlight to an option it can pick when its own option is gone', async () => {
        const field = await tabInto(kind, role);

        await userEvent.keyboard('{ArrowDown}');
        await expect.poll(highlighted).toBe('Green');

        await field.set('options', [RED, BLUE]);

        expect(highlighted()).toBe('Red');
      });
    });
  }

  describe('radio-group', () => {
    it('picks the highlighted option on Enter and on Space', async () => {
      const field = await tabInto('radio-group', 'radiogroup');

      await userEvent.keyboard('{Enter}');
      await expect.poll(field.value).toBe('red');

      await userEvent.keyboard('{ArrowDown} ');
      await expect.poll(field.value).toBe('green');
    });

    it('hands the highlight to the selection when the list changes', async () => {
      const field = await tabInto('radio-group', 'radiogroup');

      await userEvent.keyboard('{Enter}{ArrowDown}');
      await expect.poll(highlighted).toBe('Green');

      await field.set('options', [...OPTIONS]);

      expect(highlighted()).toBe('Red');
    });
  });

  describe('checkbox-group', () => {
    it('toggles the highlighted option on Enter and on Space', async () => {
      const field = await tabInto('checkbox-group', 'group');

      await userEvent.keyboard('{Enter}');
      await expect.poll(field.value).toEqual(['red']);

      await userEvent.keyboard('{ArrowDown} ');
      await expect.poll(field.value).toEqual(['red', 'green']);

      await userEvent.keyboard('{Enter}');
      await expect.poll(field.value).toEqual(['red']);
    });

    // A checked checkbox is one of several, not the selection, so it claims nothing.
    it('keeps the highlight where it was when a checked option moves', async () => {
      const field = await tabInto('checkbox-group', 'group');

      await userEvent.keyboard('{Enter}{ArrowDown}');
      await expect.poll(highlighted).toBe('Green');

      await field.set('options', [GREEN, RED, BLUE, GREY, TEAL]);

      expect(highlighted()).toBe('Green');
    });
  });

  for (const kind of ['dropdown', 'autocomplete'] as const) {
    describe(kind, () => {
      /** Tabs into the field and opens its panel. */
      async function openPanel(): Promise<BoundField> {
        const field = await tabInto(kind, 'combobox');

        await userEvent.keyboard('{ArrowDown}');
        await expect.element(page.getByRole('combobox', { name: 'Colour' })).toHaveAttribute('aria-expanded', 'true');

        return field;
      }

      it('highlights nothing until an arrow moves', async () => {
        await openPanel();

        expect(highlighted()).toBeNull();
      });

      it('walks down from the first option it can pick, and wraps', async () => {
        await openPanel();

        for (const label of ['Red', 'Green', 'Teal', 'Red']) {
          await userEvent.keyboard('{ArrowDown}');
          await expect.poll(highlighted).toBe(label);
        }
      });

      it('walks up from the last option it can pick, and wraps', async () => {
        await openPanel();

        for (const label of ['Teal', 'Green', 'Red', 'Teal']) {
          await userEvent.keyboard('{ArrowUp}');
          await expect.poll(highlighted).toBe(label);
        }
      });

      it('picks the highlighted option on Enter, and closes', async () => {
        const field = await openPanel();

        await userEvent.keyboard('{ArrowUp}{Enter}');

        await expect.poll(field.value).toBe('teal');
        await expect.element(page.getByRole('combobox', { name: 'Colour' })).toHaveAttribute('aria-expanded', 'false');
      });
    });
  }
});
