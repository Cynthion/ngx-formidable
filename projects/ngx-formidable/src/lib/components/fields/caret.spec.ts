import { bindField, BoundField } from '../../testing/bind-field';
import { Editor } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * The caret belongs to the user. A write from the form puts it at the end, because the text it just
 * replaced is not what the user was editing — but a write of the value the field already shows replaces
 * nothing, and a consumer that echoes its model back (a `valueChanges` subscription that patches, a
 * `[ngModel]` bound to a derived signal) does exactly that on every keystroke. Moving the caret there
 * drags it out from under a click or a selection the user has just made.
 *
 * Written through a `FormControl`, whose `setValue` reaches the field even with the value it already holds.
 */

/** A field the form has written `text` into after its first render, and its editor. */
async function showing(
  kind: 'input' | 'textarea',
  text: string,
  inputs: Record<string, unknown> = {}
): Promise<BoundField & { editor: Editor }> {
  const field = await bindField(kind, 'reactive', { inputs });

  await field.write(text);

  return { ...field, editor: field.element.querySelector<Editor>('input, textarea')! };
}

describe('caret', () => {
  beforeEach(() => configureFormidableTestBed());

  it('leaves a caret put when the form rewrites the value already shown', async () => {
    const { editor, write } = await showing('input', 'ABCDEFGH');
    editor.setSelectionRange(3, 3);

    await write('ABCDEFGH');

    expect(editor.selectionStart).toBe(3);
  });

  it('leaves a selection alone too', async () => {
    const { editor, write } = await showing('input', 'ABCDEFGH');
    editor.setSelectionRange(2, 5);

    await write('ABCDEFGH');

    expect([editor.selectionStart, editor.selectionEnd]).toEqual([2, 5]);
  });

  it('does the same in a masked field', async () => {
    const { editor, write } = await showing('input', '0791234567', { mask: '000 000 00 00' });
    editor.setSelectionRange(4, 4);

    await write('0791234567');

    expect(editor.selectionStart).toBe(4);
  });

  it('does the same in a textarea', async () => {
    const { editor, write } = await showing('textarea', 'ABCDEFGH');
    editor.setSelectionRange(3, 3);

    await write('ABCDEFGH');

    expect(editor.selectionStart).toBe(3);
  });

  it('still moves the caret to the end when the write changes the text', async () => {
    const { editor, write } = await showing('input', 'ABCDEFGH');
    editor.setSelectionRange(3, 3);

    await write('IJKLMNOPQRST');

    expect(editor.selectionStart).toBe(editor.value.length);
  });
});
