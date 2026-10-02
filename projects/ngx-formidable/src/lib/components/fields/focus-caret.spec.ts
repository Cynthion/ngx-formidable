import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { clickAt, Editor } from '../../testing/dom';
import { configureFormidableTestBed, MASK_STATE_BEHIND, settle } from '../../testing/test-bed';

/**
 * What a field does with the caret on the way in, per **The Caret On Focus** and **The Caret In A Masked
 * Field** in `user/fields.md`. The browser owns most of it — it places the caret from a click and selects
 * on `Tab` — so the library only has two jobs, both of them on a mask: keep a keyboard selection off the
 * empty slots, and keep a click from landing behind the value, which ngx-mask would otherwise decide for
 * itself.
 *
 * Every spec reaches the field by its label and role, with a trusted `Tab` or a trusted click.
 */

const MASK = '000 000 00 00';
const SLOTS = { mask: MASK, maskConfig: { showMaskTyped: true } };

const OPTIONS = [
  { value: 'ch', label: 'Switzerland' },
  { value: 'de', label: 'Germany' }
];

/** Every editor these specs enter, as a consumer configures it, and the role it is found by. */
const EDITORS = {
  text: { kind: 'input', role: 'textbox', inputs: {} },
  masked: { kind: 'input', role: 'textbox', inputs: { mask: MASK } },
  slots: { kind: 'input', role: 'textbox', inputs: SLOTS },
  notes: { kind: 'textarea', role: 'textbox', inputs: {} },
  maskedNotes: { kind: 'textarea', role: 'textbox', inputs: SLOTS },
  auto: { kind: 'autocomplete', role: 'combobox', inputs: { options: OPTIONS } },
  date: { kind: 'date', role: 'combobox', inputs: { unicodeTokenFormat: 'dd/MM/yyyy' } },
  time: { kind: 'time', role: 'textbox', inputs: { unicodeTokenFormat: 'HH.mm' } }
} satisfies Record<string, { kind: FieldKind; role: 'textbox' | 'combobox'; inputs: Record<string, unknown> }>;

type EditorName = keyof typeof EDITORS;

const PARTIAL = '079123';
const FULL = '0791234567';
const DATED = new Date(2024, 0, 15);
const TIMED = new Date(2024, 0, 15, 7, 45);

/**
 * Binds one editor under the label `Field` with the model holding `value`, and a button after it for focus to
 * leave to and come back from, and checks that it shows `text`.
 */
async function render(name: EditorName, value: unknown, text: string): Promise<BoundField & { editor: Editor }> {
  const { kind, role, inputs } = EDITORS[name];
  const field = await bindField(kind, 'signal', {
    value,
    inputs,
    decorated: true,
    decoration: '<div formidableFieldLabel>Field</div>',
    after: '<button type="button">Next</button>'
  });
  const editor = page.getByRole(role, { name: 'Field' }).element() as Editor;

  expect(editor.value).toBe(text);

  return { ...field, editor };
}

const selection = (editor: Editor) => [editor.selectionStart, editor.selectionEnd];

describe('caret on focus entry', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  describe('keyboard focus selects what the field holds', () => {
    // Each row: the editor, what the model holds, what it shows, and where the selection has to stop.
    const rows: Array<[EditorName, unknown, string, number, string]> = [
      ['slots', PARTIAL, '079 123 __ __', 7, 'stops at the last filled slot, not at the end of the empty ones'],
      ['slots', FULL, '079 123 45 67', 13, 'covers a full mask whole, trailing literals and all'],
      ['slots', '', '___ ___ __ __', 0, 'collapses at the front when the mask holds nothing'],
      ['masked', PARTIAL, '079 123', 7, 'covers a mask that renders no slots'],
      ['date', DATED, '15/01/2024', 10, 'covers a filled date'],
      ['date', null, '__/__/____', 0, 'and collapses at the front of an empty one'],
      ['time', TIMED, '07.45', 5, 'covers a filled time'],
      ['time', null, '__.__', 0, 'and collapses at the front of an empty one'],
      ['text', 'ABCDEFGH', 'ABCDEFGH', 8, 'covers an unmasked editor whole'],
      ['text', '', '', 0, 'and collapses at the front of an empty one'],
      ['auto', 'ch', 'Switzerland', 11, 'covers the label an autocomplete shows'],
      ['auto', null, '', 0, 'and collapses at the front when it shows none']
    ];

    for (const [name, value, text, end, why] of rows) {
      it(`${name}: ${why}`, async () => {
        const { editor } = await render(name, value, text);

        await userEvent.tab();

        await expect.poll(() => selection(editor)).toEqual([0, end]);
        expect(editor.value).toBe(text);
      });
    }

    // A textarea is the exception, and deliberately so: no browser selects one on `Tab`, and putting a
    // paragraph one keystroke from being wiped is not worth the consistency.
    for (const [name, value, text] of [
      ['notes', 'ABCDEFGH', 'ABCDEFGH'],
      ['maskedNotes', PARTIAL, '079 123 __ __']
    ] as const) {
      it(`${name} takes back the caret it had, and no selection`, async () => {
        const { fixture, editor } = await render(name, value, text);
        await clickAt(editor, 3);
        await userEvent.tab();

        await userEvent.tab({ shift: true });
        await expect.element(editor).toHaveFocus();
        await settle(fixture);

        expect(selection(editor)).toEqual([3, 3]);
      });
    }
  });

  describe('a click lands where it aimed, and never behind the value', () => {
    // Each row: the editor, what the model holds, what it shows, where its value ends, and where to click.
    const rows: Array<[EditorName, unknown, string, number, number[]]> = [
      ['slots', PARTIAL, '079 123 __ __', 7, [0, 4, 7, 9, 13]],
      ['slots', FULL, '079 123 45 67', 13, [0, 4, 7, 9, 13]],
      ['slots', '', '___ ___ __ __', 0, [0, 4, 7, 9, 13]],
      ['masked', PARTIAL, '079 123', 7, [0, 3, 7]],
      ['maskedNotes', PARTIAL, '079 123 __ __', 7, [0, 4, 13]],
      ['date', DATED, '15/01/2024', 10, [0, 5, 10]],
      ['date', null, '__/__/____', 0, [0, 5, 10]],
      ['time', TIMED, '07.45', 5, [0, 3, 5]],
      ['time', null, '__.__', 0, [0, 3, 5]],
      // Unmasked, the click is the browser's alone.
      ['text', 'ABCDEFGH', 'ABCDEFGH', 8, [0, 4, 8]],
      ['notes', 'ABCDEFGH', 'ABCDEFGH', 8, [4]],
      ['auto', 'ch', 'Switzerland', 11, [4]]
    ];

    for (const [name, value, text, end, clicks] of rows) {
      for (const caret of clicks) {
        it(`${name} click at ${caret} of "${text}" lands at ${Math.min(caret, end)}`, async () => {
          const { editor } = await render(name, value, text);

          await clickAt(editor, caret);

          await expect.poll(() => selection(editor)).toEqual([Math.min(caret, end), Math.min(caret, end)]);
          expect(editor.value).toBe(text);
        });
      }
    }

    it('holds a selection the pointer extends, clamped to the value', async () => {
      const { editor } = await render('slots', PARTIAL, '079 123 __ __');

      await clickAt(editor, 2);
      await clickAt(editor, 11, ['Shift']);

      await expect.poll(() => selection(editor)).toEqual([2, 7]);
    });
  });

  describe('the rules read the field again on every entry', () => {
    it('a click after keyboard focus places the caret rather than keeping the selection', async () => {
      const { editor } = await render('slots', '', '___ ___ __ __');
      await userEvent.tab();
      await userEvent.keyboard(FULL);
      await userEvent.tab();
      await userEvent.tab({ shift: true });
      await expect.poll(() => selection(editor)).toEqual([0, 13]);

      await clickAt(editor, 4);

      await expect.poll(() => selection(editor)).toEqual([4, 4]);
    });

    it('does the same in a value the form wrote', async ({ skip }) => {
      skip(MASK_STATE_BEHIND);

      const { editor } = await render('slots', FULL, '079 123 45 67');
      await userEvent.tab();
      await expect.poll(() => selection(editor)).toEqual([0, 13]);

      await clickAt(editor, 4);

      await expect.poll(() => selection(editor)).toEqual([4, 4]);
    });

    it('a second click moves the caret again', async () => {
      const { editor } = await render('slots', FULL, '079 123 45 67');

      await clickAt(editor, 11);
      await expect.poll(() => selection(editor)).toEqual([11, 11]);
      await clickAt(editor, 2);

      await expect.poll(() => selection(editor)).toEqual([2, 2]);
    });

    it('coming back reads the content the field holds by then', async () => {
      const { editor } = await render('slots', FULL, '079 123 45 67');

      await userEvent.tab();
      await expect.poll(() => selection(editor)).toEqual([0, 13]);

      // Wipe it, leave, and come back: the boundary follows the value.
      await userEvent.keyboard('{Delete}');
      await userEvent.tab();
      await userEvent.tab({ shift: true });
      await expect.poll(() => selection(editor)).toEqual([0, 0]);
      expect(editor.value).toBe('___ ___ __ __');

      // Half fill it, and again.
      await userEvent.keyboard('079');
      await userEvent.tab();
      await userEvent.tab({ shift: true });
      await expect.poll(() => selection(editor)).toEqual([0, 3]);
      expect(editor.value).toBe('079 ___ __ __');
    });
  });

  /**
   * Focus moving onto a date field's own calendar and back neither leaves nor enters the field, so the
   * half-typed text is still there to come back to. It used to be wiped, because focus handed the display
   * back to ngx-mask whatever the input was showing.
   */
  it('a half-typed date survives focus moving onto its own calendar and back', async () => {
    const { fixture, element, editor } = await render('date', null, '__/__/____');
    await userEvent.tab();
    await userEvent.keyboard('1501');
    await expect.element(editor).toHaveValue('15/01/____');

    await userEvent.click(element.querySelector('.toggle')!);
    const month = element.querySelector<HTMLSelectElement>('.pika-select-month')!;
    await userEvent.click(month);
    await expect.element(month).toHaveFocus();
    await userEvent.click(editor);
    await expect.element(editor).toHaveFocus();
    await settle(fixture);

    expect(editor.value).toBe('15/01/____');
  });
});
