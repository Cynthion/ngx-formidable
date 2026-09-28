import { FormidableOption } from '../../models/formidable.model';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { press } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of a field's keys: a key the field acts on is `preventDefault`ed, and any other keeps its native
 * effect — an `Enter` still submits the form, an `Escape` still closes the dialog, a `Tab` still moves on.
 * A panel field owns `Escape`, `Enter` and the arrows only while its panel is open; closed, it takes only the
 * `ArrowDown` that opens it. A group picks its highlighted option on `Enter` and on `Space`.
 */

const options: FormidableOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

/** Focuses what takes the keys, as a user tabbing in does. */
async function focused(bound: BoundField, selector: string): Promise<HTMLElement> {
  const target = bound.element.querySelector<HTMLElement>(selector)!;

  target.focus();
  await settle(bound.fixture);

  return target;
}

/** Presses `key`, lets the field act on it, and reports whether the field kept it from the browser. */
async function kept(bound: BoundField, target: HTMLElement, key: string): Promise<boolean> {
  const event = press(target, key);
  await settle(bound.fixture);

  return event.defaultPrevented;
}

describe('handled keys', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const kind of ['dropdown', 'autocomplete'] as FieldKind[]) {
    describe(kind, () => {
      let bound: BoundField;
      let input: HTMLElement;

      const isOpen = () => input.getAttribute('aria-expanded') === 'true';

      beforeEach(async () => {
        bound = await bindField(kind, 'signal', { inputs: { options } });
        input = await focused(bound, 'input');
      });

      it('passes Enter, Escape and ArrowUp through while its panel is closed', async () => {
        expect(await kept(bound, input, 'Enter')).toBe(false);
        expect(await kept(bound, input, 'Escape')).toBe(false);
        expect(await kept(bound, input, 'ArrowUp')).toBe(false);
        expect(isOpen()).toBe(false);
      });

      it('keeps the ArrowDown that opens its panel', async () => {
        expect(await kept(bound, input, 'ArrowDown')).toBe(true);
        expect(isOpen()).toBe(true);
      });

      it('keeps the arrows, Enter and Escape while its panel is open', async () => {
        await kept(bound, input, 'ArrowDown');

        expect(await kept(bound, input, 'ArrowDown')).toBe(true); // 'Alpha'
        expect(await kept(bound, input, 'ArrowUp')).toBe(true); // wraps to 'Beta'
        expect(await kept(bound, input, 'Enter')).toBe(true);
        expect(bound.value()).toBe('b');

        await kept(bound, input, 'ArrowDown');

        expect(await kept(bound, input, 'Escape')).toBe(true);
        expect(isOpen()).toBe(false);
      });

      it('never keeps Tab, and closes its panel on it', async () => {
        await kept(bound, input, 'ArrowDown');

        expect(await kept(bound, input, 'Tab')).toBe(false);
        expect(isOpen()).toBe(false);
      });
    });
  }

  for (const [kind, role, picked] of [
    ['radio-group', 'radiogroup', 'a'],
    ['checkbox-group', 'group', ['a']]
  ] as [FieldKind, string, unknown][]) {
    describe(kind, () => {
      it('picks the highlighted option on Space, and keeps it', async () => {
        const bound = await bindField(kind, 'signal', { inputs: { options } });
        const group = await focused(bound, `[role="${role}"]`);

        expect(await kept(bound, group, ' ')).toBe(true);
        expect(bound.value()).toEqual(picked);
      });

      it('picks the highlighted option on Enter, and keeps it', async () => {
        const bound = await bindField(kind, 'signal', { inputs: { options } });
        const group = await focused(bound, `[role="${role}"]`);

        expect(await kept(bound, group, 'Enter')).toBe(true);
        expect(bound.value()).toEqual(picked);
      });

      it('keeps the arrows it walks the options with', async () => {
        const bound = await bindField(kind, 'signal', { inputs: { options } });
        const group = await focused(bound, `[role="${role}"]`);

        expect(await kept(bound, group, 'ArrowDown')).toBe(true);
        expect(await kept(bound, group, 'ArrowUp')).toBe(true);
      });

      it('passes Enter and Space through with no option to pick', async () => {
        const bound = await bindField(kind, 'signal', { inputs: { options: [] } });
        const group = await focused(bound, `[role="${role}"]`);

        expect(await kept(bound, group, 'Enter')).toBe(false);
        expect(await kept(bound, group, ' ')).toBe(false);
      });
    });
  }

  describe('date', () => {
    it('passes Escape and Tab through while its panel is closed', async () => {
      const bound = await bindField('date', 'signal');
      const input = await focused(bound, 'input');

      expect(await kept(bound, input, 'Escape')).toBe(false);
      expect(await kept(bound, input, 'Tab')).toBe(false);
    });
  });
});
