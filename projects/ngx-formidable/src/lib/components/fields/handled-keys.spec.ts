import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { keptKeys } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * A field's keys, per **Keyboard** in `user/fields.md`: a key the field acts on is kept from the browser, and
 * any other keeps its native effect, so an `Enter` still submits the form, an `Escape` still closes the dialog
 * and a `Tab` still moves on. A panel field owns `Escape`, `Enter` and the arrows only while its panel is open;
 * closed, it takes only the `ArrowDown` that opens it. A group picks its highlighted option on `Enter` and on
 * `Space`.
 *
 * Every key is pressed for real, and whether the field kept it is read on the window, where a form or a dialog
 * around the field would read it.
 */

const options: FormidableOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

const combobox = () => page.getByRole('combobox', { name: 'Choice' });
const next = () => page.getByRole('button', { name: 'Next' });

describe('handled keys', () => {
  let kept: (key: string) => boolean | undefined;

  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
    kept = keptKeys();
  });

  /** Binds the field under a label, with a button after it, and tabs into it. */
  async function tabInto(kind: FieldKind, inputs: Record<string, unknown> = { options }): Promise<BoundField> {
    const bound = await bindField(kind, 'signal', {
      inputs,
      decorated: true,
      decoration: '<div formidableFieldLabel>Choice</div>',
      after: '<button type="button">Next</button>'
    });

    await userEvent.tab();

    return bound;
  }

  /** Presses `key` for real, and reports whether the field kept it from the browser. */
  async function keeps(key: string): Promise<boolean | undefined> {
    await userEvent.keyboard(key === ' ' ? ' ' : `{${key}}`);

    return kept(key);
  }

  for (const kind of ['dropdown', 'autocomplete'] as const) {
    describe(kind, () => {
      it('passes Enter, Escape and ArrowUp through while its panel is closed', async () => {
        const field = await tabInto(kind);

        expect(await keeps('Enter')).toBe(false);
        expect(await keeps('Escape')).toBe(false);
        expect(await keeps('ArrowUp')).toBe(false);
        await settle(field.fixture);
        expect(combobox().element()).toHaveAttribute('aria-expanded', 'false');
      });

      it('keeps the ArrowDown that opens its panel', async () => {
        await tabInto(kind);

        expect(await keeps('ArrowDown')).toBe(true);
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
      });

      it('keeps the arrows, Enter and Escape while its panel is open', async () => {
        const field = await tabInto(kind);
        await keeps('ArrowDown');

        expect(await keeps('ArrowDown')).toBe(true); // Alpha
        expect(await keeps('ArrowUp')).toBe(true); // wraps to Beta
        expect(await keeps('Enter')).toBe(true);
        await expect.poll(field.value).toBe('b');

        await keeps('ArrowDown');

        expect(await keeps('Escape')).toBe(true);
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
      });

      it('never keeps Tab, and closes its panel on it', async () => {
        await tabInto(kind);
        await keeps('ArrowDown');

        expect(await keeps('Tab')).toBe(false);
        await expect.element(next()).toHaveFocus();
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
      });
    });
  }

  for (const [kind, role, picked] of [
    ['radio-group', 'radiogroup', 'a'],
    ['checkbox-group', 'group', ['a']]
  ] as const) {
    describe(kind, () => {
      it('picks the highlighted option on Space, and keeps it', async () => {
        const field = await tabInto(kind);

        expect(await keeps(' ')).toBe(true);
        await expect.poll(field.value).toEqual(picked);
      });

      it('picks the highlighted option on Enter, and keeps it', async () => {
        const field = await tabInto(kind);

        expect(await keeps('Enter')).toBe(true);
        await expect.poll(field.value).toEqual(picked);
      });

      it('keeps the arrows it walks the options with', async () => {
        await tabInto(kind);

        expect(await keeps('ArrowDown')).toBe(true);
        expect(await keeps('ArrowUp')).toBe(true);
      });

      it('passes Enter and Space through with no option to pick', async () => {
        await tabInto(kind, { options: [] });
        await expect.element(page.getByRole(role, { name: 'Choice' })).toHaveFocus();

        expect(await keeps('Enter')).toBe(false);
        expect(await keeps(' ')).toBe(false);
      });
    });
  }

  describe('date', () => {
    it('passes Escape and Tab through while its panel is closed', async () => {
      await tabInto('date', {});

      expect(await keeps('Escape')).toBe(false);
      expect(await keeps('Tab')).toBe(false);
      await expect.element(next()).toHaveFocus();
    });
  });
});
