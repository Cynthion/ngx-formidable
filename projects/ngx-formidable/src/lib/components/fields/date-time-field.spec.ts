import { TestBed } from '@angular/core/testing';
import { format } from 'date-fns';
import fc from 'fast-check';
import { page, userEvent } from 'vitest/browser';
import { formatToTokenMask } from '../../helpers/format.helpers';
import { DEFAULT_PATTERNS } from '../../helpers/mask.helpers';
import { FormidableEmptyHint } from '../../models/formidable.model';
import { DATE_FORMATS, DATES, TIME_FORMATS } from '../../testing/arbitraries';
import { bindField, BindFieldOptions, BoundField, FORMS_APIS, FormsApi } from '../../testing/bind-field';
import { clickAt } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of the masked date/time fields, per **Dates And Times** and **Stepping A Date Or Time Segment** in
 * `user/fields.md`: caret, value rendering and calendar options.
 *
 * These fields render their empty state themselves (the `emptyHint`), which historically desynced
 * ngxMask's caret math. The keystrokes below therefore start from wherever focus entry leaves the caret and
 * never from one placed by hand — placing it is what hid the "second character lands before the first" bug.
 *
 * Value rendering covers what the input must show for a value it did not receive by typing: a value
 * the form writes, and a `unicodeTokenFormat` change after init. Calendar options cover the Pikaday
 * passthrough inputs, which only reach the rendered calendar if the picker is rebuilt — its `config()`
 * merges options without redrawing.
 *
 * Every spec reaches the field by its label and role, with trusted keys and clicks.
 */

type MaskedField = BoundField & { input: HTMLInputElement };

/** Result of one keystroke: what the field shows and where the caret sits. */
function state(input: HTMLInputElement): string {
  return `${input.value}|${input.selectionStart}`;
}

/** The range a step leaves selected. */
function selection(input: HTMLInputElement): [number | null, number | null] {
  return [input.selectionStart, input.selectionEnd];
}

/**
 * Binds one field through a forms API, `[formControl]` unless `bind` names another, under the label `When`
 * and with a button after it for focus to leave to by `Tab` and come back from. `inputs` are the ones a case
 * sets or changes later.
 */
async function setup(
  kind: 'date' | 'time',
  unicodeTokenFormat: string,
  emptyHint: FormidableEmptyHint,
  inputs: Record<string, unknown> = {},
  bind: Omit<BindFieldOptions, 'inputs'> & { api?: FormsApi } = {}
): Promise<MaskedField> {
  const { api = 'reactive', ...options } = bind;
  const field = await bindField(kind, api, {
    decorated: true,
    decoration: '<div formidableFieldLabel>When</div>',
    after: '<button type="button">Next</button>',
    ...options,
    inputs: { unicodeTokenFormat, emptyHint, ...inputs }
  });
  const input = page.getByRole(kind === 'date' ? 'combobox' : 'textbox', { name: 'When' }).element();

  return { ...field, input: input as HTMLInputElement };
}

/** The messages a decorated field renders. */
function messages(field: MaskedField): string[] {
  const root = field.fixture.nativeElement as HTMLElement;

  return Array.from(root.querySelectorAll('formidable-field-errors .error'), (error) => error.textContent!.trim());
}

describe('masked date/time field', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  describe('date field, emptyHint "format"', () => {
    it('shows the format hint at rest and ngxMask slots while focused', async () => {
      const { input } = await setup('date', 'dd . MM . yyyy', 'format');

      expect(input.value).toBe('dd . MM . yyyy');

      await userEvent.tab();

      await expect.element(input).toHaveValue('__ . __ . ____');
      expect(selection(input)).toEqual([0, 0]);
    });

    it('fills left-to-right from where focus leaves the caret, the second digit after the first', async () => {
      const { input } = await setup('date', 'dd . MM . yyyy', 'format');

      await userEvent.tab();
      await userEvent.keyboard('1');
      await expect.poll(() => state(input)).toBe('1_ . __ . ____|1');

      await userEvent.keyboard('2');
      await expect.poll(() => state(input)).toBe('12 . __ . ____|2');
    });

    it('jumps separators and commits the parsed date as focus leaves', async () => {
      const { input, value, dirty } = await setup('date', 'dd . MM . yyyy', 'format');

      await userEvent.tab();
      await userEvent.keyboard('12052024');

      await expect.poll(() => state(input)).toBe('12 . 05 . 2024|14');

      await userEvent.tab();

      await expect.poll(value).toEqual(new Date(2024, 4, 12));
      expect(dirty()).toBe(true);
      expect(input.value).toBe('12 . 05 . 2024');
    });

    it('keeps an incomplete date as focus leaves, uncommitted', async () => {
      const { fixture, input, value } = await setup('date', 'dd . MM . yyyy', 'format');

      await userEvent.tab();
      await userEvent.keyboard('1');
      await userEvent.tab();
      await settle(fixture);

      expect(input.value).toBe('1_ . __ . ____');
      expect(value()).toBeNull();
    });

    it('keeps the hint out of a focused field the form empties', async () => {
      const { input, write } = await setup('date', 'dd . MM . yyyy', 'format', {}, { value: new Date(2024, 4, 12) });

      await userEvent.tab();
      await write(null);

      expect(input.value).toBe('__ . __ . ____');

      await userEvent.keyboard('12');

      await expect.poll(() => state(input)).toBe('12 . __ . ____|2');
    });

    // Where focus leaves the caret is `focus-caret.spec.ts`; what matters here is that it leaves the
    // value alone, and that a selection the user makes afterwards is still theirs to type over.
    it('does not rewrite a filled field when focus lands on it', async () => {
      const { input, value } = await setup('date', 'dd . MM . yyyy', 'format');

      await userEvent.tab();
      await userEvent.keyboard('12052024');
      await userEvent.tab();
      await expect.poll(value).toEqual(new Date(2024, 4, 12));

      await clickAt(input, 6);

      await expect.element(input).toHaveFocus();
      expect(input.value).toBe('12 . 05 . 2024');

      // the click and a Shift+ArrowRight select the second month digit; typing replaces just that digit
      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
      await expect.poll(() => selection(input)).toEqual([6, 7]);
      await userEvent.keyboard('9');

      await expect.element(input).toHaveValue('12 . 09 . 2024');
    });
  });

  describe('date field, emptyHint "underscores"', () => {
    it('shows ngxMask slots at rest and types identically', async () => {
      const { input } = await setup('date', 'dd . MM . yyyy', 'underscores');

      expect(input.value).toBe('__ . __ . ____');

      await userEvent.tab();

      await expect.element(input).toHaveFocus();
      expect(state(input)).toBe('__ . __ . ____|0');

      await userEvent.keyboard('1');
      await expect.poll(() => state(input)).toBe('1_ . __ . ____|1');

      await userEvent.keyboard('2');
      await expect.poll(() => state(input)).toBe('12 . __ . ____|2');
    });
  });

  describe('time field', () => {
    it('fills left-to-right from where focus leaves the caret, with the format hint', async () => {
      const { input } = await setup('time', 'HH : mm', 'format');

      expect(input.value).toBe('HH : mm');

      await userEvent.tab();

      await expect.element(input).toHaveValue('__ : __');
      expect(input.selectionStart).toBe(0);

      await userEvent.keyboard('1');
      await expect.poll(() => state(input)).toBe('1_ : __|1');

      await userEvent.keyboard('4');
      await expect.poll(() => state(input)).toBe('14 : __|2');
    });

    it('commits the parsed time as focus leaves and keeps it over an incomplete one', async () => {
      const { fixture, input, value, dirty } = await setup('time', 'HH : mm', 'underscores');

      await userEvent.tab();
      await userEvent.keyboard('1430');

      await expect.element(input).toHaveValue('14 : 30');

      await userEvent.tab();

      await expect.poll(value).toEqual(new Date(1970, 0, 1, 14, 30));
      expect(dirty()).toBe(true);

      // back by keyboard, which selects the time, and over it
      await userEvent.tab({ shift: true });
      await expect.poll(() => selection(input)).toEqual([0, 7]);
      await userEvent.keyboard('9');
      await userEvent.tab();
      await settle(fixture);

      expect(input.value).toBe('9_ : __');
      expect(value()).toEqual(new Date(1970, 0, 1, 14, 30));
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
  });

  describe('unsupported unicodeTokenFormat', () => {
    for (const { kind, value, format, unsupported, fallback } of [
      {
        kind: 'date',
        value: new Date(2024, 4, 12),
        format: 'dd . MM . yyyy',
        unsupported: 'dd . MM . qqqq',
        fallback: '2024-05-12'
      },
      { kind: 'time', value: new Date(1970, 0, 1, 9, 5), format: 'HH : mm', unsupported: 'HH : qq', fallback: '09.05' }
    ] as const) {
      it(`warns and falls back to the default ${kind} format when it is set after init`, async () => {
        const warn = vi.spyOn(console, 'warn').mockReturnValue(undefined);
        const { input, set } = await setup(kind, format, 'underscores', {}, { value });

        await set('unicodeTokenFormat', unsupported);

        expect(input.value).toBe(fallback);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining(`"${unsupported}"`));
      });
    }
  });

  describe('unparseable text', () => {
    const cases = [
      {
        kind: 'date',
        format: 'dd . MM . yyyy',
        held: new Date(2024, 4, 12),
        partial: '1_ . __ . ____',
        complete: '13052024',
        parsed: new Date(2024, 4, 13)
      },
      {
        kind: 'time',
        format: 'HH : mm',
        held: new Date(1970, 0, 1, 9, 5),
        partial: '1_ : __',
        complete: '1430',
        parsed: new Date(1970, 0, 1, 14, 30)
      }
    ] as const;

    /**
     * Enters the field by keyboard, which selects what it holds, types over that and tabs out, which is when
     * typing commits. `from` is the side focus comes in from: before the field, or the button after it.
     */
    async function typeOver(field: MaskedField, keys: string, from: 'before' | 'after'): Promise<void> {
      await userEvent.tab({ shift: from === 'after' });
      await userEvent.keyboard(keys);
      await userEvent.tab();
      await settle(field.fixture);
    }

    for (const api of FORMS_APIS) {
      for (const { kind, format, held, partial, complete, parsed } of cases) {
        describe(`${kind} field bound ${api}`, () => {
          function bindHeld(): Promise<MaskedField> {
            return setup(kind, format, 'underscores', {}, { api, value: held });
          }

          it('reports a parse error, keeps the text and leaves the model alone', async () => {
            const field = await bindHeld();

            await typeOver(field, '1', 'before');

            expect(field.input.value).toBe(partial);
            expect(field.value()).toEqual(held);
            expect(field.dirty()).toBe(false);
            expect(messages(field)).toEqual(['parse']);
            expect(field.input.getAttribute('aria-invalid')).toBe('true');
          });

          it('drops the parse error once the text parses', async () => {
            const field = await bindHeld();

            await typeOver(field, '1', 'before');
            await typeOver(field, complete, 'after');

            expect(field.value()).toEqual(parsed);
            expect(messages(field)).toEqual([]);
            expect(field.input.getAttribute('aria-invalid')).toBeNull();
          });

          it('commits emptied text as null, with no parse error', async () => {
            const field = await bindHeld();

            await typeOver(field, '1', 'before');
            await typeOver(field, '{Backspace}', 'after');

            expect(field.value()).toBeNull();
            expect(messages(field)).toEqual([]);
          });
        });
      }
    }
  });

  describe('clearing the text', () => {
    it('commits null as soon as Delete wipes a date, without waiting for the blur', async () => {
      const { input, value, dirty } = await setup(
        'date',
        'dd . MM . yyyy',
        'format',
        {},
        { value: new Date(2024, 4, 12) }
      );

      await userEvent.tab();
      await userEvent.keyboard('{Delete}');

      await expect.poll(value).toBeNull();
      expect(dirty()).toBe(true);
      expect(input).toHaveFocus();
    });

    it('and as soon as Backspace does', async () => {
      const { input, value, dirty } = await setup(
        'date',
        'dd . MM . yyyy',
        'format',
        {},
        { value: new Date(2024, 4, 12) }
      );

      await userEvent.tab();
      await userEvent.keyboard('{Backspace}');

      await expect.poll(value).toBeNull();
      expect(dirty()).toBe(true);
      expect(input).toHaveFocus();
    });

    it('steps from the default date once the text is wiped, not from the date that was there', async () => {
      const { input } = await setup(
        'date',
        'dd . MM . yyyy',
        'format',
        { defaultDate: new Date(2020, 0, 15) },
        { value: new Date(2024, 4, 12) }
      );

      // the wipe leaves the caret at the front, on the day
      await userEvent.tab();
      await userEvent.keyboard('{Delete}{ArrowUp}');

      await expect.element(input).toHaveValue('16 . 01 . 2020');
    });

    it('commits null as soon as a time is wiped', async () => {
      const { value, dirty } = await setup(
        'time',
        'HH : mm',
        'underscores',
        {},
        { value: new Date(2024, 0, 1, 14, 30) }
      );

      await userEvent.tab();
      await userEvent.keyboard('{Delete}');

      await expect.poll(value).toBeNull();
      expect(dirty()).toBe(true);
    });

    it('steps from midnight once the time is wiped', async () => {
      const { input } = await setup('time', 'HH : mm', 'underscores', {}, { value: new Date(2024, 0, 1, 14, 30) });

      // the wipe leaves the caret at the front, on the hour
      await userEvent.tab();
      await userEvent.keyboard('{Delete}{ArrowUp}');

      await expect.element(input).toHaveValue('01 : 00');
    });
  });

  describe('readonly', () => {
    // A readonly input blocks typing, not pointer focus — `tabindex="-1"` only keeps it out of the tab order.
    for (const { kind, format, hint } of [
      { kind: 'date', format: 'dd . MM . yyyy', hint: 'dd . MM . yyyy' },
      { kind: 'time', format: 'HH : mm', hint: 'HH : mm' }
    ] as const) {
      it(`keeps the ${kind} hint in place when the field is clicked into and out of`, async () => {
        const field = await setup(kind, format, 'format');
        await field.state({ readonly: true });

        await userEvent.click(field.input);
        await expect.element(field.input).toHaveFocus();

        expect(field.input.value).toBe(hint);

        await userEvent.tab();
        await settle(field.fixture);

        expect(field.input.value).toBe(hint);
        expect(field.dirty()).toBe(false);
      });
    }
  });

  describe('arrow keys', () => {
    /** May 2024, with the caret clicked where the test wants it. */
    async function focusedAt(caret: number, inputs: Record<string, unknown> = {}): Promise<MaskedField> {
      const field = await setup('date', 'dd . MM . yyyy', 'format', inputs, { value: new Date(2024, 4, 12) });

      await clickAt(field.input, caret);
      await expect.poll(() => selection(field.input)).toEqual([caret, caret]);

      return field;
    }

    it('steps the segment under the caret and leaves it selected', async () => {
      const { input } = await focusedAt(10); // year

      await userEvent.keyboard('{ArrowUp}');

      await expect.element(input).toHaveValue('12 . 05 . 2025');
      expect(selection(input)).toEqual([10, 14]);

      // the selection keeps the caret in the year, so repeated arrows stay there
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(input).toHaveValue('12 . 05 . 2024');
      await userEvent.keyboard('{ArrowDown}');

      await expect.element(input).toHaveValue('12 . 05 . 2023');
    });

    it('steps once per press however fast the presses come', async () => {
      const { input } = await focusedAt(10); // year

      await userEvent.keyboard('{ArrowDown}{ArrowDown}');

      await expect.element(input).toHaveValue('12 . 05 . 2022');
    });

    it('steps only the unit under the caret', async () => {
      const { input } = await focusedAt(0); // day

      await userEvent.keyboard('{ArrowUp}');
      await expect.element(input).toHaveValue('13 . 05 . 2024');

      await clickAt(input, 5); // month
      await userEvent.keyboard('{ArrowUp}');

      await expect.element(input).toHaveValue('13 . 06 . 2024');
      expect(selection(input)).toEqual([5, 7]);
    });

    it('does not open the panel on a plain ArrowDown', async () => {
      const { input } = await focusedAt(0);

      await userEvent.keyboard('{ArrowDown}');

      await expect.element(input).toHaveValue('11 . 05 . 2024');
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens and closes the panel on Alt+Arrow', async () => {
      const { input } = await focusedAt(0);

      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
      await expect.element(input).toHaveAttribute('aria-expanded', 'true');
      expect(input.value).toBe('12 . 05 . 2024'); // an Alt+Arrow never touches the value

      await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
      await expect.element(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('still moves the calendar by a week while the panel is open, committing only on Enter', async () => {
      const { input, value } = await focusedAt(0);

      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}{ArrowDown}');

      await expect.element(input).toHaveValue('19 . 05 . 2024');
      expect(value()).toEqual(new Date(2024, 4, 12)); // navigation is not a commit

      await userEvent.keyboard('{Enter}');

      await expect.poll(value).toEqual(new Date(2024, 4, 19));
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('refuses a step that would leave minDate/maxDate', async () => {
      const { fixture, input } = await focusedAt(0, { maxDate: new Date(2024, 4, 13) }); // day

      await userEvent.keyboard('{ArrowUp}');
      await expect.element(input).toHaveValue('13 . 05 . 2024'); // on the boundary, still allowed

      await userEvent.keyboard('{ArrowUp}');
      await settle(fixture);
      expect(input.value).toBe('13 . 05 . 2024'); // past it, refused
    });

    it('steps the hour and the minute of a time field', async () => {
      const { input } = await setup('time', 'HH : mm', 'underscores', {}, { value: new Date(2024, 0, 1, 14, 30) });

      await clickAt(input, 0); // hour
      await userEvent.keyboard('{ArrowUp}');

      await expect.element(input).toHaveValue('15 : 30');
      expect(selection(input)).toEqual([0, 2]);

      await clickAt(input, 5); // minute
      await userEvent.keyboard('{ArrowDown}');

      await expect.element(input).toHaveValue('15 : 29');
      expect(selection(input)).toEqual([5, 7]);
    });

    it('carries a minute step over midnight', async () => {
      const { input } = await setup('time', 'HH : mm', 'underscores', {}, { value: new Date(2024, 0, 1, 23, 59) });

      await clickAt(input, 5);
      await userEvent.keyboard('{ArrowUp}');

      await expect.element(input).toHaveValue('00 : 00');
    });

    it('seeds an empty time field with midnight before stepping it', async () => {
      const { input } = await setup('time', 'HH : mm', 'underscores');

      await userEvent.tab(); // the caret sits at 0, the hour
      await userEvent.keyboard('{ArrowUp}');

      await expect.element(input).toHaveValue('01 : 00');
    });

    describe('with today pinned', () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2024, 5, 15, 12));
      });

      afterEach(() => void vi.useRealTimers());

      it('seeds an empty date field with today before stepping it', async () => {
        const { input } = await setup('date', 'dd . MM . yyyy', 'format');

        await userEvent.tab(); // the caret sits at 0, the day
        await userEvent.keyboard('{ArrowUp}');

        await expect.element(input).toHaveValue('16 . 06 . 2024');
      });
    });
  });

  describe('typing a whole value', () => {
    it('reaches the model as it was typed, in any format the field accepts and in any case', async () => {
      const fields = fc.oneof(
        DATE_FORMATS.map((unicode) => ({ kind: 'date' as const, unicode })),
        TIME_FORMATS.map((unicode) => ({ kind: 'time' as const, unicode }))
      );

      await fc.assert(
        fc.asyncProperty(fields, DATES, fc.boolean(), async ({ kind, unicode }, date, lowerCase) => {
          TestBed.resetTestingModule();
          configureFormidableTestBed();
          const field = await setup(kind, unicode, 'underscores');
          const shown = format(date, unicode);
          const mask = formatToTokenMask(unicode);
          // What a user types into a mask: the characters of its slots, the mask drawing the literals between.
          const keys = [...shown].filter((_, index) => mask[index]! in DEFAULT_PATTERNS).join('');

          await userEvent.tab();
          await userEvent.keyboard(lowerCase ? keys.toLowerCase() : keys);
          await userEvent.tab();
          await settle(field.fixture);

          // The commit renders the format's own case.
          expect(field.input.value).toBe(shown);
          expect(format(field.value() as Date, unicode)).toBe(shown);
        }),
        { numRuns: 50 }
      );
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

    it('names its month and year selects, and names them again on every redraw', async () => {
      const { picker, set } = await setupCalendar();

      const names = () => Array.from(picker.querySelectorAll('select'), (select) => select.name);

      expect(names()).toEqual([expect.stringMatching(/-month$/), expect.stringMatching(/-year$/)]);

      await set('numberOfMonths', 2);

      expect(names()).toEqual([
        expect.stringMatching(/-month-0$/),
        expect.stringMatching(/-year-0$/),
        expect.stringMatching(/-month-1$/),
        expect.stringMatching(/-year-1$/)
      ]);
    });

    it('tears its calendar down with the field', async () => {
      const { fixture, picker } = await setupCalendar();
      const calendar = picker.querySelector('.pika-single')!;

      fixture.destroy();

      expect(calendar.parentNode).toBeNull();
    });
  });
});
