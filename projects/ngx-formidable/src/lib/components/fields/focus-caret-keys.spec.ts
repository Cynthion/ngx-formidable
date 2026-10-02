import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, BoundField } from '../../testing/bind-field';
import { clickAt, Editor } from '../../testing/dom';
import { BACKSPACE_UNREPORTED, configureFormidableTestBed, MASK_STATE_BEHIND, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { FieldLabel } from '../../directives/field-label';
import { AutocompleteField } from './autocomplete-field/autocomplete-field';

/**
 * What focus entry leaves for the keystroke that comes next, per **The Caret On Focus** and **The Caret In A
 * Masked Field** in `user/fields.md`: the first character replaces what keyboard focus selected or lands at
 * the caret a click placed, the first deletion takes the selection or the one character beside the caret,
 * and nothing the field did on the way in is still in flight to undo it — which is why the pointer
 * correction is made on the `click` that ends the press rather than on a timer after it.
 * `focus-caret.spec.ts` covers the entry itself.
 *
 * Every spec reaches the field by its label and role, with trusted clicks and keys.
 */

const SLOTS = { mask: '000 000 00 00', maskConfig: { showMaskTyped: true } };

/** Binds a field under the label `Field` with the model holding `value`, and its editor. */
async function render(
  kind: 'input' | 'textarea',
  value: string,
  inputs: Record<string, unknown> = {}
): Promise<BoundField & { editor: Editor }> {
  const field = await bindField(kind, 'signal', {
    value,
    inputs,
    decorated: true,
    decoration: '<div formidableFieldLabel>Field</div>'
  });

  return { ...field, editor: page.getByRole('textbox', { name: 'Field' }).element() as Editor };
}

const selection = (editor: Editor) => [editor.selectionStart, editor.selectionEnd];

describe('caret from the first keystroke', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  describe('the first character typed', () => {
    it('replaces what keyboard focus selected, unmasked', async () => {
      const { editor, value } = await render('input', 'ABCDEFGH');

      await userEvent.tab();
      await userEvent.keyboard('X');

      await expect.element(editor).toHaveValue('X');
      expect(value()).toBe('X');
    });

    // Each row: what the mask holds, and what one digit typed after keyboard focus leaves.
    for (const [held, digit, text, why] of [
      ['0791234567', '4', '4__ ___ __ __', 'replaces what keyboard focus selected, masked'],
      ['079123', '4', '4__ ___ __ __', 'replaces only the filled part of a half-filled mask'],
      ['', '7', '7__ ___ __ __', 'starts at the front of an empty mask']
    ] as const) {
      it(why, async () => {
        const { editor } = await render('input', held, SLOTS);

        await userEvent.tab();
        await userEvent.keyboard(digit);

        await expect.element(editor).toHaveValue(text);
      });
    }

    it('lands at the caret a click placed, unmasked', async () => {
      const { editor } = await render('input', 'ABCDEFGH');

      await clickAt(editor, 4);
      await userEvent.keyboard('X');

      await expect.element(editor).toHaveValue('ABCDXEFGH');
    });

    it('lands at the end when the click aimed past the value', async () => {
      const { editor } = await render('input', '079123', SLOTS);

      await clickAt(editor, 12);
      await userEvent.keyboard('5');

      await expect.element(editor).toHaveValue('079 123 5_ __');
    });
  });

  describe('the first deletion', () => {
    for (const key of ['Backspace', 'Delete']) {
      it(`${key} wipes what keyboard focus selected`, async () => {
        const { editor, value } = await render('input', 'ABCDEFGH');

        await userEvent.tab();
        await userEvent.keyboard(`{${key}}`);

        await expect.element(editor).toHaveValue('');
        expect(value()).toBe('');
      });
    }

    it('Delete empties a masked field keyboard focus selected', async () => {
      const { editor, value } = await render('input', '0791234567', SLOTS);

      await userEvent.tab();
      await userEvent.keyboard('{Delete}');

      await expect.element(editor).toHaveValue('___ ___ __ __');
      expect(value()).toBe('');
    });

    it('Backspace does too', async ({ skip }) => {
      skip(BACKSPACE_UNREPORTED);

      const { editor, value } = await render('input', '0791234567', SLOTS);

      await userEvent.tab();
      await userEvent.keyboard('{Backspace}');

      await expect.element(editor).toHaveValue('___ ___ __ __');
      expect(value()).toBe('');
    });

    it('Backspace takes the character before a clicked caret', async () => {
      const { editor } = await render('input', 'ABCDEFGH');

      await clickAt(editor, 4);
      await userEvent.keyboard('{Backspace}');

      await expect.element(editor).toHaveValue('ABCEFGH');
      expect(selection(editor)).toEqual([3, 3]);
    });

    it('Delete takes the one after it', async () => {
      const { editor } = await render('input', 'ABCDEFGH');

      await clickAt(editor, 4);
      await userEvent.keyboard('{Delete}');

      await expect.element(editor).toHaveValue('ABCDFGH');
      expect(selection(editor)).toEqual([4, 4]);
    });

    it('Delete at the end is a boundary no-op, not a swallowed key', async () => {
      const { fixture, editor } = await render('input', 'ABCDEFGH');

      await clickAt(editor, 8);
      await userEvent.keyboard('{Delete}');
      await settle(fixture);
      expect(editor.value).toBe('ABCDEFGH');

      await userEvent.keyboard('{ArrowLeft}{Delete}');

      await expect.element(editor).toHaveValue('ABCDEFG');
    });

    it('Backspace at the front is a no-op', async () => {
      const { fixture, editor } = await render('input', 'ABCDEFGH');

      await clickAt(editor, 0);
      await userEvent.keyboard('{Backspace}');
      await settle(fixture);

      expect(editor.value).toBe('ABCDEFGH');
    });
  });

  // The platform's chord: `Cmd` on macOS, `Ctrl` elsewhere.
  describe('select all', () => {
    it('selects everything on the first press', async () => {
      const { editor } = await render('input', 'ABCDEFGH');

      await clickAt(editor, 4);
      await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}');

      await expect.poll(() => selection(editor)).toEqual([0, 8]);
    });

    it('then typing replaces the lot', async () => {
      const { editor } = await render('input', 'ABCDEFGH');

      await clickAt(editor, 4);
      await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}X');

      await expect.element(editor).toHaveValue('X');
    });

    it('covers what was typed into a mask, and never its slots', async () => {
      const { editor } = await render('input', '', SLOTS);

      await userEvent.tab();
      await userEvent.keyboard('079123{ControlOrMeta>}a{/ControlOrMeta}');

      // ngx-mask's select all takes in the separator it drew after the last group typed, so what is asserted
      // is the text it covers: everything typed, and none of the slots.
      await expect.poll(() => editor.value.slice(0, editor.selectionEnd!).trim()).toBe('079 123');
      expect(editor.selectionStart).toBe(0);
    });

    it('covers a value the form wrote into a mask', async ({ skip }) => {
      skip(MASK_STATE_BEHIND);

      const { editor } = await render('input', '0791234567', SLOTS);

      await clickAt(editor, 2);
      await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}');

      await expect.poll(() => selection(editor)).toEqual([0, 13]);
    });
  });

  describe('arrow keys', () => {
    it('ArrowLeft collapses a keyboard selection on the first press', async () => {
      const { editor } = await render('input', 'ABCDEFGH');

      await userEvent.tab();
      await expect.poll(() => selection(editor)).toEqual([0, 8]);
      await userEvent.keyboard('{ArrowLeft}');

      await expect.poll(() => selection(editor)).toEqual([0, 0]);
    });

    it('ArrowRight works on the first press too', async () => {
      const { editor } = await render('input', 'ABCDEFGH');

      await userEvent.tab();
      await userEvent.keyboard('{ArrowRight}');

      await expect.poll(() => selection(editor)).toEqual([8, 8]);
    });

    it('a full mask does not lock the caret at the end', async () => {
      const { editor } = await render('input', '0791234567', SLOTS);

      await clickAt(editor, 13);
      await userEvent.keyboard('{ArrowLeft}');

      await expect.poll(() => selection(editor)).toEqual([12, 12]);
    });
  });

  // What a click leaves behind must be done by the time it ends, so these settle and look once.
  describe('nothing is left in flight', () => {
    it('an edit right after a click stays as it was made', async () => {
      const { fixture, editor } = await render('input', '079123', SLOTS);

      await clickAt(editor, 1);
      await userEvent.keyboard('5');
      await settle(fixture);

      expect(editor.value).toBe('057 912 3_ __');
      expect(selection(editor)).toEqual([2, 2]);
    });

    it('a caret moved right after a click stays where it was moved', async () => {
      const { fixture, editor } = await render('input', '0791234567', SLOTS);

      await clickAt(editor, 6);
      await userEvent.keyboard('{ArrowLeft}');
      await settle(fixture);

      expect(selection(editor)).toEqual([5, 5]);
    });
  });

  // `focus-caret.spec.ts` pins that keyboard focus leaves a textarea's caret alone.
  it('a textarea takes one character on the first Backspace, not the paragraph', async () => {
    const { editor } = await render('textarea', 'ABCDEFGH');

    await userEvent.tab();
    await userEvent.keyboard('{Backspace}');

    await expect.element(editor).toHaveValue('ABCDEFG');
  });
});

const ADDRESSES: FormidableOption[] = [
  { value: 'ch', label: 'Langstrasse 84' },
  { value: 'de', label: 'Wiesenstrasse 5' }
];

/** An autocomplete whose options follow its filter, the way a consumer supplying them does. */
@Component({
  imports: [FormField, FieldDecorator, FieldLabel, AutocompleteField],
  template: `
    <formidable-field-decorator>
      <formidable-autocomplete-field
        [formField]="form.address"
        [options]="visible()"
        (filterChange)="filter($event)" />
      <div formidableFieldLabel>Address</div>
    </formidable-field-decorator>
  `
})
class FilteringHost {
  readonly model = signal<{ address: string | null }>({ address: 'ch' });
  readonly form = form(this.model);
  readonly visible = signal(ADDRESSES);
  /** Off for the one spec that supplies its options by hand, to model a list that arrives late. */
  follows = true;

  filter(text: string): void {
    if (!this.follows) return;

    this.visible.set(ADDRESSES.filter((o) => o.label!.toLowerCase().includes(text.toLowerCase())));
  }
}

/**
 * The autocomplete re-applies a written value when its options change, so a value whose option had not
 * arrived yet can still be placed. It used to do so even once placed — and a consumer filtering on
 * `filterChange` refreshes the options on every keystroke, so the first two deletions were overwritten as
 * they were made.
 */
describe('the autocomplete editor', () => {
  let fixture: ComponentFixture<FilteringHost>;
  const editor = () => page.getByRole('combobox', { name: 'Address' });

  beforeEach(async () => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();

    fixture = TestBed.createComponent(FilteringHost);
    await settle(fixture);
  });

  it('clears on the first Backspace after keyboard focus selected its label', async () => {
    await expect.element(editor()).toHaveValue('Langstrasse 84');

    await userEvent.tab();
    await userEvent.keyboard('{Backspace}');

    await expect.element(editor()).toHaveValue('');
  });

  it('keeps it cleared once the filter has settled', async () => {
    await userEvent.tab();
    await userEvent.keyboard('{Backspace}');
    await settle(fixture, 250); // past the filter debounce

    expect(editor().element()).toHaveValue('');
  });

  it('deletes one character at a time from the end', async () => {
    await clickAt(editor().element() as Editor, 14);

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor()).toHaveValue('Langstrasse 8');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor()).toHaveValue('Langstrasse ');
  });

  // The re-apply still does its job: a value written before its option exists is placed when it arrives.
  it('still places a value whose option arrives late', async () => {
    fixture.destroy();
    fixture = TestBed.createComponent(FilteringHost);
    fixture.componentInstance.follows = false;
    fixture.componentInstance.visible.set([]);
    fixture.componentInstance.model.set({ address: 'de' });
    await settle(fixture);

    expect(editor().element()).toHaveValue('');

    fixture.componentInstance.visible.set([ADDRESSES[1]!]);

    await expect.element(editor()).toHaveValue('Wiesenstrasse 5');
  });
});
