import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { page, userEvent } from 'vitest/browser';
import { bindField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { clickAt } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * `placeHolderCharacter` is the character a mask draws for a position nobody has filled, and the library
 * reads a value back out of the rendered text by looking for it. ngx-mask lets it be set globally, which
 * would change what the fields read without their knowing, so every masked field binds it explicitly, per
 * **The Slot Character Is The Field's, Not The App's** in `user/fields.md`.
 *
 * Setting it per field still works, and moves the display and the caret rules together. Every spec reaches
 * the field by its label and role, with a trusted `Tab`, click or key.
 */

/** Binds a field under the label `Field`, with ngx-mask configured app-wide by `providers`, and its editor. */
async function render(
  kind: FieldKind,
  inputs: Record<string, unknown>,
  providers: Provider[] = [],
  value: unknown = null
): Promise<HTMLInputElement> {
  TestBed.resetTestingModule();
  configureFormidableTestBed({ providers });
  await bindField(kind, 'signal', {
    value,
    inputs,
    decorated: true,
    decoration: '<div formidableFieldLabel>Field</div>'
  });

  return page.getByRole(kind === 'date' ? 'combobox' : 'textbox', { name: 'Field' }).element() as HTMLInputElement;
}

/** A phone number half typed, under a mask that shows its empty slots with `placeHolderCharacter`. */
function phone(providers: Provider[], placeHolderCharacter?: string): Promise<HTMLInputElement> {
  const maskConfig = { showMaskTyped: true, ...(placeHolderCharacter ? { placeHolderCharacter } : {}) };

  return render('input', { mask: '000 000 00 00', maskConfig }, providers, '079123');
}

const selection = (editor: HTMLInputElement) => [editor.selectionStart, editor.selectionEnd];

describe('mask placeholder character', () => {
  beforeEach(() => (document.activeElement as HTMLElement | null)?.blur());

  describe('a global setting does not reach the fields', () => {
    for (const [label, providers] of [
      ['ngx-mask defaults', []],
      ['a global placeHolderCharacter', [provideNgxMask({ placeHolderCharacter: '*' })]]
    ] as const) {
      it(`renders its own slots with ${label}`, async () => {
        const editor = await phone([...providers]);

        expect(editor.value).toBe('079 123 __ __');
      });

      it(`still finds the end of the value with ${label}`, async () => {
        const editor = await phone([...providers]);

        await userEvent.tab();

        await expect.poll(() => selection(editor)).toEqual([0, 7]);
      });

      // The initial display comes from the mask pipe; this is ngx-mask's own directive re-rendering, which
      // is what the explicit binding protects.
      it(`keeps its own slots when the mask re-renders on typing, with ${label}`, async () => {
        const editor = await phone([...providers]);

        await clickAt(editor, 7);
        await userEvent.keyboard('4');

        await expect.element(editor).toHaveValue('079 123 4_ __');
      });

      it(`leaves a date field's empty display alone with ${label}`, async () => {
        const editor = await render('date', { unicodeTokenFormat: 'dd/MM/yyyy' }, [...providers]);

        expect(editor.value).toBe('__/__/____');

        await userEvent.tab();

        // An empty date reads as empty, so the caret collapses at the front rather than selecting slots.
        await expect.element(editor).toHaveFocus();
        expect(editor.value).toBe('__/__/____');
        expect(selection(editor)).toEqual([0, 0]);
      });
    }
  });

  describe('a per-field setting moves the display and the rules together', () => {
    it('renders the character the field asked for', async () => {
      const editor = await phone([], '*');

      expect(editor.value).toBe('079 123 ** **');
    });

    it('and reads the value back out against it', async () => {
      const editor = await phone([], '*');

      await userEvent.tab();

      await expect.poll(() => selection(editor)).toEqual([0, 7]);
    });

    it('and clamps a click to it', async () => {
      const editor = await phone([], '*');

      await clickAt(editor, 11);

      await expect.poll(() => selection(editor)).toEqual([7, 7]);
    });
  });

  // `_` is both the placeholder and a literal these masks draw, so the two cannot be told apart.
  for (const kind of ['input', 'textarea'] as const) {
    for (const api of FORMS_APIS) {
      it(`${kind} warns once when the mask could draw the placeholder as content, and again when it changes (${api})`, async () => {
        const warn = vi.spyOn(console, 'warn').mockReturnValue(undefined);
        const warnings = () =>
          vi.mocked(warn).mock.calls.filter(([text]) => String(text).includes('placeHolderCharacter'));

        TestBed.resetTestingModule();
        configureFormidableTestBed();
        const field = await bindField(kind, api, { inputs: { mask: '000_000' } });

        expect(warnings().length).toBe(1);

        await field.set('mask', '00_00');

        expect(warnings().length).toBe(2);
      });
    }
  }
});
