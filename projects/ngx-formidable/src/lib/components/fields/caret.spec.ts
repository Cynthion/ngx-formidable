import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField } from '../../testing/bind-field';
import { clickAt, Editor } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * The caret belongs to the user. A write from the form puts it at the end, because the text it just
 * replaced is not what the user was editing — but a write of the text the field already shows replaces
 * nothing. Two writes do exactly that: the field's own, coming back from the model on every keystroke, and
 * a consumer's that echoes the model back in another form, such as a `valueChanges` subscription patching
 * in a phone number's digits without the spaces its mask draws. Moving the caret there drags it out from
 * under a click or a selection the user has just made.
 *
 * Written through a `FormControl`; the caret is placed with trusted clicks and keys.
 */

/** A field under the label `Notes` with the model holding `value`, and its editor. */
async function showing(
  kind: 'input' | 'textarea',
  value: string,
  inputs: Record<string, unknown> = {}
): Promise<BoundField & { editor: Editor }> {
  const field = await bindField(kind, 'reactive', {
    value,
    inputs,
    decorated: true,
    decoration: '<div formidableFieldLabel>Notes</div>'
  });

  return { ...field, editor: page.getByRole('textbox', { name: 'Notes' }).element() as Editor };
}

const selection = (editor: Editor) => [editor.selectionStart, editor.selectionEnd];

describe('caret', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  for (const kind of ['input', 'textarea'] as const) {
    it(`keeps the caret where typing left it, as each keystroke comes back from the model (${kind})`, async () => {
      const { editor, value } = await showing(kind, 'ABCDEFGH');

      await clickAt(editor, 4);
      await userEvent.keyboard('XY');

      await expect.poll(value).toBe('ABCDXYEFGH');
      expect(editor.value).toBe('ABCDXYEFGH');
      expect(selection(editor)).toEqual([6, 6]);
    });
  }

  describe('a consumer writing back the digits of a masked number', () => {
    async function typed(): Promise<BoundField & { editor: Editor }> {
      const field = await showing('input', '', { mask: '000 000 00 00' });

      await userEvent.tab();
      await userEvent.keyboard('0791234567');
      await expect.poll(field.value).toBe('079 123 45 67');

      return field;
    }

    it('leaves a caret put', async () => {
      const { editor, write } = await typed();
      await clickAt(editor, 4);
      await expect.poll(() => selection(editor)).toEqual([4, 4]);

      await write('0791234567');

      expect(editor.value).toBe('079 123 45 67');
      expect(selection(editor)).toEqual([4, 4]);
    });

    it('leaves a selection alone too', async () => {
      const { editor, write } = await typed();
      await clickAt(editor, 4);
      await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}');
      await expect.poll(() => selection(editor)).toEqual([4, 7]);

      await write('0791234567');

      expect(selection(editor)).toEqual([4, 7]);
    });
  });

  it('still moves the caret to the end when the write changes the text', async () => {
    const { editor, write } = await showing('input', 'ABCDEFGH');
    await clickAt(editor, 3);
    await expect.poll(() => selection(editor)).toEqual([3, 3]);

    await write('IJKLMNOPQRST');

    expect(selection(editor)).toEqual([12, 12]);
  });
});
