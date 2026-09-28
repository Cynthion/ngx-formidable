import { FormidableEmptyHint } from '../../models/formidable.model';
import { bindField, BoundField } from '../../testing/bind-field';
import { press, type } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of the masked date/time fields: caret, value rendering and calendar options.
 *
 * These fields render their empty state themselves (the `emptyHint`), which historically desynced
 * ngxMask's caret math. The keystrokes below therefore go through the real DOM and must never
 * pre-position the caret — doing so is what hid the "second character lands before the first" bug.
 *
 * Value rendering covers what the input must show for a value it did not receive by typing: a value
 * the form writes, and a `unicodeTokenFormat` change after init. Calendar options cover the Pikaday
 * passthrough inputs, which only reach the rendered calendar if the picker is rebuilt — its `config()`
 * merges options without redrawing.
 */

type MaskedField = BoundField & { input: HTMLInputElement };

/** Wipes the field the way a select-all + Delete does. */
function clearText(input: HTMLInputElement): void {
  input.setSelectionRange(0, input.value.length);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));

  if (document.execCommand('delete')) return;

  input.value = '';
  input.setSelectionRange(0, 0);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
}

/** Result of one keystroke: what the field shows and where the caret sits. */
function state(input: HTMLInputElement): string {
  return `${input.value}|${input.selectionStart}`;
}

/** The range a step leaves selected. */
function selection(input: HTMLInputElement): [number | null, number | null] {
  return [input.selectionStart, input.selectionEnd];
}

/** Binds one field through the forms API. `inputs` are the ones a case sets or changes later. */
async function setup(
  kind: 'date' | 'time',
  unicodeTokenFormat: string,
  emptyHint: FormidableEmptyHint,
  inputs: Record<string, unknown> = {}
): Promise<MaskedField> {
  const field = await bindField(kind, 'reactive', { inputs: { unicodeTokenFormat, emptyHint, ...inputs } });

  return { ...field, input: field.element.querySelector('input') as HTMLInputElement };
}

describe('masked date/time field', () => {
  beforeEach(() => configureFormidableTestBed());

  describe('date field, emptyHint "format"', () => {
    it('shows the format hint at rest and ngxMask slots while focused', async () => {
      const { input } = await setup('date', 'dd . MM . yyyy', 'format');

      expect(input.value).toBe('dd . MM . yyyy');

      input.focus();

      expect(input.value).toBe('__ . __ . ____');
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(0);
    });

    it('fills left-to-right from a caret at 0, the second digit after the first', async () => {
      const { input } = await setup('date', 'dd . MM . yyyy', 'format');

      input.focus();
      expect(input.selectionStart).toBe(0); // no pre-positioning

      type(input, '1');
      expect(state(input)).toBe('1_ . __ . ____|1');

      type(input, '2');
      expect(state(input)).toBe('12 . __ . ____|2');
    });

    it('jumps separators and commits the parsed date on blur', async () => {
      const { fixture, input, value, dirty } = await setup('date', 'dd . MM . yyyy', 'format');

      input.focus();
      type(input, '12052024');

      expect(input.value).toBe('12 . 05 . 2024');
      expect(input.selectionStart).toBe(14);

      input.blur();
      await settle(fixture);

      expect(value()).toEqual(new Date(2024, 4, 12));
      expect(dirty()).toBe(true);
      expect(input.value).toBe('12 . 05 . 2024');
    });

    it('restores the hint on blur when the value is incomplete', async () => {
      const { fixture, input, value } = await setup('date', 'dd . MM . yyyy', 'format');

      input.focus();
      type(input, '1');
      input.blur();
      await settle(fixture);

      expect(input.value).toBe('dd . MM . yyyy');
      expect(value()).toBeNull();
    });

    it('keeps the hint out of a focused input when cleared while focused', async () => {
      const { input, write } = await setup('date', 'dd . MM . yyyy', 'format');

      input.focus();
      await write(null);

      expect(input.value).toBe('__ . __ . ____');

      type(input, '12');

      expect(state(input)).toBe('12 . __ . ____|2');
    });

    // Where focus leaves the caret is `focus-caret.spec.ts`; what matters here is that it leaves the
    // value alone, and that a selection the user makes afterwards is still theirs to type over.
    it('does not rewrite a filled field when focus lands on it', async () => {
      const { fixture, input } = await setup('date', 'dd . MM . yyyy', 'format');

      input.focus();
      type(input, '12052024');
      input.blur();
      await settle(fixture);

      input.focus();

      expect(input.value).toBe('12 . 05 . 2024');

      // a click-drag selects the second month digit; typing replaces just that digit
      input.setSelectionRange(6, 7);
      type(input, '9');

      expect(input.value).toBe('12 . 09 . 2024');
    });
  });

  describe('date field, emptyHint "underscores"', () => {
    it('shows ngxMask slots at rest and types identically', async () => {
      const { input } = await setup('date', 'dd . MM . yyyy', 'underscores');

      expect(input.value).toBe('__ . __ . ____');

      input.focus();

      expect(input.value).toBe('__ . __ . ____');
      expect(input.selectionStart).toBe(0);

      type(input, '1');
      expect(state(input)).toBe('1_ . __ . ____|1');

      type(input, '2');
      expect(state(input)).toBe('12 . __ . ____|2');
    });
  });

  describe('time field', () => {
    it('fills left-to-right from a caret at 0 with the format hint', async () => {
      const { input } = await setup('time', 'HH : mm', 'format');

      expect(input.value).toBe('HH : mm');

      input.focus();

      expect(input.value).toBe('__ : __');
      expect(input.selectionStart).toBe(0);

      type(input, '1');
      expect(state(input)).toBe('1_ : __|1');

      type(input, '4');
      expect(state(input)).toBe('14 : __|2');
    });

    it('commits the parsed time on blur and restores the hint when incomplete', async () => {
      const { fixture, input, value, dirty } = await setup('time', 'HH : mm', 'underscores');

      input.focus();
      type(input, '1430');

      expect(input.value).toBe('14 : 30');

      input.blur();
      await settle(fixture);

      expect(dirty()).toBe(true);
      expect((value() as Date | null)?.getHours()).toBe(14);
      expect((value() as Date | null)?.getMinutes()).toBe(30);

      input.focus();
      input.setSelectionRange(0, input.value.length);
      type(input, '9');
      input.blur();
      await settle(fixture);

      expect(input.value).toBe('__ : __');
      expect(value()).toBeNull();
    });
  });

  describe('value rendering', () => {
    it('shows a time written programmatically', async () => {
      const { input, write } = await setup('time', 'HH : mm', 'underscores');

      await write(new Date(2024, 0, 1, 9, 5));

      expect(input.value).toBe('09 : 05');
    });

    it('re-renders the time in the new format when it changes after init', async () => {
      const { input, write, set } = await setup('time', 'HH : mm', 'underscores');

      await write(new Date(2024, 0, 1, 9, 5));
      await set('unicodeTokenFormat', 'HH.mm');

      expect(input.value).toBe('09.05');
    });

    it('re-renders the date in the new format when it changes after init', async () => {
      const { input, write, set } = await setup('date', 'dd . MM . yyyy', 'format');

      await write(new Date(2024, 4, 12));

      expect(input.value).toBe('12 . 05 . 2024');

      await set('unicodeTokenFormat', 'yyyy-MM-dd');

      expect(input.value).toBe('2024-05-12');
    });

    it('blur-commits again after a panel interaction skipped one', async () => {
      const { fixture, element, input, value } = await setup('date', 'dd . MM . yyyy', 'format');
      const panel = element.querySelector('.panel') as HTMLElement;

      input.focus();

      // handing focus to the panel (a nested select, say) must skip exactly one blur-commit
      panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      input.blur();
      await settle(fixture);

      // an incomplete value is only cleared by the blur-commit — Pikaday's own change
      // listener ignores unparseable text — so the hint proves the commit ran
      input.focus();
      type(input, '1');
      input.blur();
      await settle(fixture);

      expect(input.value).toBe('dd . MM . yyyy');
      expect(value()).toBeNull();
    });
  });

  describe('clearing the text', () => {
    it('commits null as soon as a date is wiped, without waiting for the blur', async () => {
      const { fixture, input, value, dirty, write } = await setup('date', 'dd . MM . yyyy', 'format');

      await write(new Date(2024, 4, 12));

      input.focus();
      clearText(input);
      await settle(fixture);

      expect(value()).toBeNull();
      expect(dirty()).toBe(true);
    });

    it('steps from the default date once the text is wiped, not from the date that was there', async () => {
      const { fixture, input, write } = await setup('date', 'dd . MM . yyyy', 'format', {
        defaultDate: new Date(2020, 0, 15)
      });

      await write(new Date(2024, 4, 12));

      input.focus();
      clearText(input);
      await settle(fixture);

      input.setSelectionRange(0, 0); // day
      press(input, 'ArrowUp');
      await settle(fixture);

      expect(input.value).toBe('16 . 01 . 2020');
    });

    it('commits null as soon as a time is wiped', async () => {
      const { fixture, input, value, dirty, write } = await setup('time', 'HH : mm', 'underscores');

      await write(new Date(2024, 0, 1, 14, 30));

      input.focus();
      clearText(input);
      await settle(fixture);

      expect(value()).toBeNull();
      expect(dirty()).toBe(true);
    });

    it('steps from midnight once the time is wiped', async () => {
      const { fixture, input, write } = await setup('time', 'HH : mm', 'underscores');

      await write(new Date(2024, 0, 1, 14, 30));

      input.focus();
      clearText(input);
      await settle(fixture);

      input.setSelectionRange(0, 0); // hour
      press(input, 'ArrowUp');
      await settle(fixture);

      expect(input.value).toBe('01 : 00');
    });
  });

  describe('readonly', () => {
    // A readonly input blocks typing, not pointer focus — `tabindex="-1"` only keeps it out of the tab order.
    for (const { kind, format, hint } of [
      { kind: 'date', format: 'dd . MM . yyyy', hint: 'dd . MM . yyyy' },
      { kind: 'time', format: 'HH : mm', hint: 'HH : mm' }
    ] as const) {
      it(`keeps the ${kind} hint in place when the field is clicked into and out of`, async () => {
        const { fixture, input, dirty } = await setup(kind, format, 'format', { readonly: true });

        input.focus();

        expect(input.value).toBe(hint);

        input.blur();
        await settle(fixture);

        expect(input.value).toBe(hint);
        expect(dirty()).toBe(false);
      });
    }
  });

  describe('arrow keys', () => {
    /** May 2024, focused, with the caret parked where the test wants it. */
    async function focusedAt(caret: number, inputs: Record<string, unknown> = {}): Promise<MaskedField> {
      const field = await setup('date', 'dd . MM . yyyy', 'format', inputs);

      await field.write(new Date(2024, 4, 12));

      field.input.focus();
      field.input.setSelectionRange(caret, caret);

      return field;
    }

    it('steps the segment under the caret and leaves it selected', async () => {
      const { fixture, input } = await focusedAt(10); // year

      press(input, 'ArrowUp');
      await settle(fixture);

      expect(input.value).toBe('12 . 05 . 2025');
      expect(selection(input)).toEqual([10, 14]);

      // the selection keeps the caret in the year, so repeated arrows stay there
      press(input, 'ArrowDown');
      await settle(fixture);
      press(input, 'ArrowDown');
      await settle(fixture);

      expect(input.value).toBe('12 . 05 . 2023');
    });

    it('steps only the unit under the caret', async () => {
      const { fixture, input } = await focusedAt(0); // day

      press(input, 'ArrowUp');
      await settle(fixture);
      expect(input.value).toBe('13 . 05 . 2024');

      input.setSelectionRange(5, 5); // month
      press(input, 'ArrowUp');
      await settle(fixture);
      expect(input.value).toBe('13 . 06 . 2024');
      expect(selection(input)).toEqual([5, 7]);
    });

    it('does not open the panel on a plain ArrowDown', async () => {
      const { fixture, input } = await focusedAt(0);

      press(input, 'ArrowDown');
      await settle(fixture);

      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(input.value).toBe('11 . 05 . 2024');
    });

    it('opens and closes the panel on Alt+Arrow', async () => {
      const { fixture, input } = await focusedAt(0);

      press(input, 'ArrowDown', { altKey: true });
      await settle(fixture);
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(input.value).toBe('12 . 05 . 2024'); // an Alt+Arrow never touches the value

      press(input, 'ArrowUp', { altKey: true });
      await settle(fixture);
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('still moves the calendar by a week while the panel is open, committing only on Enter', async () => {
      const { fixture, input, value } = await focusedAt(0);

      press(input, 'ArrowDown', { altKey: true });
      await settle(fixture);

      press(input, 'ArrowDown');
      await settle(fixture);

      expect(input.value).toBe('19 . 05 . 2024');
      expect(value()).toEqual(new Date(2024, 4, 12)); // navigation is not a commit

      press(input, 'Enter');
      await settle(fixture);

      expect(value()).toEqual(new Date(2024, 4, 19));
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('seeds an empty date field before stepping it', async () => {
      const { fixture, input, value } = await setup('date', 'dd . MM . yyyy', 'format');

      input.focus();
      input.setSelectionRange(10, 10); // year
      press(input, 'ArrowUp');
      await settle(fixture);

      expect((value() as Date | null)?.getFullYear()).toBe(new Date().getFullYear() + 1);
    });

    it('refuses a step that would leave minDate/maxDate', async () => {
      const { fixture, input } = await focusedAt(0, { maxDate: new Date(2024, 4, 13) }); // day

      press(input, 'ArrowUp');
      await settle(fixture);
      expect(input.value).toBe('13 . 05 . 2024'); // on the boundary, still allowed

      press(input, 'ArrowUp');
      await settle(fixture);
      expect(input.value).toBe('13 . 05 . 2024'); // past it, refused
    });

    it('steps the hour and the minute of a time field', async () => {
      const { fixture, input, write } = await setup('time', 'HH : mm', 'underscores');

      await write(new Date(2024, 0, 1, 14, 30));

      input.focus();
      input.setSelectionRange(0, 0); // hour
      press(input, 'ArrowUp');
      await settle(fixture);

      expect(input.value).toBe('15 : 30');
      expect(selection(input)).toEqual([0, 2]);

      input.setSelectionRange(5, 5); // minute
      press(input, 'ArrowDown');
      await settle(fixture);

      expect(input.value).toBe('15 : 29');
      expect(selection(input)).toEqual([5, 7]);
    });

    it('carries a minute step over midnight', async () => {
      const { fixture, input, write } = await setup('time', 'HH : mm', 'underscores');

      await write(new Date(2024, 0, 1, 23, 59));

      input.focus();
      input.setSelectionRange(5, 5);
      press(input, 'ArrowUp');
      await settle(fixture);

      expect(input.value).toBe('00 : 00');
    });

    it('seeds an empty time field with midnight before stepping it', async () => {
      const { fixture, input } = await setup('time', 'HH : mm', 'underscores');

      input.focus();
      press(input, 'ArrowUp'); // caret sits at 0, the hour
      await settle(fixture);

      expect(input.value).toBe('01 : 00');
    });
  });

  describe('calendar options', () => {
    /** May 2024 on screen, so the assertions below have a known month to look at. */
    async function setupCalendar(): Promise<MaskedField & { picker: HTMLElement }> {
      const field = await setup('date', 'dd . MM . yyyy', 'format', {
        yearSuffix: undefined,
        numberOfMonths: undefined,
        minDate: undefined
      });

      await field.write(new Date(2024, 4, 12));

      return { ...field, picker: field.element.querySelector('.picker-wrapper') as HTMLElement };
    }

    it('re-renders a plain option change', async () => {
      const { picker, set } = await setupCalendar();

      await set('yearSuffix', ' n. Chr.');

      expect(picker.querySelector('.pika-title')?.textContent).toContain('2024 n. Chr.');
    });

    it('rebuilds the month views when numberOfMonths changes', async () => {
      const { picker, set } = await setupCalendar();

      expect(picker.querySelectorAll('.pika-lendar').length).toBe(1);

      await set('numberOfMonths', 2);

      expect(picker.querySelectorAll('.pika-lendar').length).toBe(2);
    });

    it('applies and clears a minDate, days and year dropdown alike', async () => {
      const { picker, set } = await setupCalendar();

      // the default yearRange of 2 around the shown year, 2024
      const years = () => picker.querySelectorAll('select.pika-select-year option').length;

      expect(picker.querySelectorAll('td.is-disabled').length).toBe(0);
      expect(years()).toBe(5);

      await set('minDate', new Date(2024, 4, 20));

      expect(picker.querySelectorAll('td.is-disabled').length).toBeGreaterThan(0);
      expect(years()).toBe(3); // 2024 is now the earliest selectable year

      await set('minDate', undefined);

      expect(picker.querySelectorAll('td.is-disabled').length).toBe(0);
      expect(years()).toBe(5);
    });
  });
});
