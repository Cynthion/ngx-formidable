import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { FORMIDABLE_CLEAR_LABEL } from '../../models/formidable.model';
import { provideNgxFormidable } from '../../provide-ngx-formidable';
import { bindField, BindFieldOptions, BoundField, FieldKind, FORMS_APIS, FormsApi } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldLabel } from '../../directives/field-label';
import { AutocompleteField } from '../fields/autocomplete-field/autocomplete-field';
import { FieldDecorator } from './field-decorator';

/**
 * Per **Clear Button** in `user/decoration.md`: a `clearable` field shows a button in its suffix while it holds
 * something to clear and the user can edit it. A click empties the field as the user's edit and hands focus
 * back to it. The button is hidden at rest and shows on hover or while focus is inside the decorator, without
 * moving the value. It takes its name from the label.
 *
 * The button is hidden from the accessibility tree at rest, so whether it exists is read by its class.
 */

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

type Role = 'textbox' | 'combobox';

const field = (role: Role) => page.getByRole(role, { name: 'Answer' });
const display = (role: Role) => (field(role).element() as HTMLInputElement).value;
const clearButton = () => document.querySelector<HTMLButtonElement>('formidable-field-decorator .clear-button');
const named = (name = 'Clear Answer') => page.getByRole('button', { name });
const next = () => page.getByRole('button', { name: 'Next' });
const messages = () =>
  page
    .getByRole('listitem')
    .elements()
    .map((message) => message.textContent!.trim());

/** Moves the pointer off every field, so a hover left over from an earlier spec cannot show a button. */
const pointerAway = () =>
  userEvent.hover(page.elementLocator(document.documentElement), { position: { x: 1, y: innerHeight - 1 } });

/** Clears with the pointer: over the field, which shows the button, then on it. */
async function clickClear(name?: string): Promise<void> {
  await userEvent.hover(document.querySelector('formidable-field-decorator')!);
  await userEvent.click(named(name));
}

/** Binds a decorated, `clearable` field labelled `Answer`, with a `Next` button after it. */
function bind(kind: FieldKind, api: FormsApi = 'signal', { inputs, ...options }: BindFieldOptions = {}) {
  return bindField(kind, api, {
    decorated: true,
    decoration: '<div formidableFieldLabel>Answer</div>',
    after: '<button type="button">Next</button>',
    ...options,
    inputs: { clearable: true, ...inputs }
  });
}

interface ClearCase {
  kind: FieldKind;
  role: Role;
  inputs?: Record<string, unknown>;
  value: unknown;
  empty: unknown;
}

const cases: ClearCase[] = [
  { kind: 'input', role: 'textbox', value: 'Cynthion', empty: '' },
  { kind: 'textarea', role: 'textbox', value: 'notes', empty: '' },
  { kind: 'select', role: 'combobox', inputs: { options }, value: 'b', empty: null },
  { kind: 'dropdown', role: 'combobox', inputs: { options }, value: 'b', empty: null },
  { kind: 'autocomplete', role: 'combobox', inputs: { options }, value: 'b', empty: null },
  { kind: 'date', role: 'combobox', value: new Date(2020, 0, 2), empty: null },
  { kind: 'time', role: 'textbox', value: new Date(1970, 0, 1, 13, 45), empty: null }
];

/** An autocomplete reporting its filter, with a bare `clearable` attribute. */
@Component({
  imports: [FieldDecorator, FieldLabel, AutocompleteField],
  template: `
    <formidable-field-decorator>
      <formidable-autocomplete-field
        clearable
        [options]="options"
        (filterChange)="filters.push($event)" />
      <div formidableFieldLabel>Answer</div>
    </formidable-field-decorator>
  `
})
class FilterHost {
  readonly options = options;
  readonly filters: string[] = [];
}

describe('clear button', () => {
  beforeEach(async () => {
    configureFormidableTestBed();
    await pointerAway();
  });

  for (const api of FORMS_APIS) {
    for (const { kind, role, inputs, value, empty } of cases) {
      it(`empties a held value as the user’s edit and hands focus back: ${kind}, bound ${api}`, async () => {
        const bound = await bind(kind, api, { inputs, value });

        await clickClear();

        await expect.poll(bound.value).toEqual(empty);
        await expect.element(field(role)).toHaveFocus();
        expect(display(role)).not.toMatch(/[A-Za-z0-9]/);
        expect(bound.dirty()).toBe(true);
        expect(bound.touched()).toBe(false);
        expect(clearButton()).toBeNull();
      });
    }
  }

  describe('with the model null already', () => {
    it('drops the autocomplete’s typed text and reports the emptied filter, dirtying nothing', async () => {
      const bound = await bind('autocomplete', 'signal', { inputs: { options } });

      await userEvent.type(field('combobox'), 'Al');
      await clickClear();

      await expect.poll(() => display('combobox')).toBe('');
      await expect.element(field('combobox')).toHaveFocus();
      expect(bound.value()).toBeNull();
      expect(bound.dirty()).toBe(false);
      expect(clearButton()).toBeNull();
    });

    it('reports the emptied filter through filterChange, behind a bare clearable attribute', async () => {
      const fixture = TestBed.createComponent(FilterHost);
      await settle(fixture);

      await userEvent.type(field('combobox'), 'Al');
      await clickClear();

      await expect.poll(() => fixture.componentInstance.filters.at(-1)).toBe('');
    });

    for (const [kind, role, typed] of [
      ['date', 'combobox', '2024'],
      ['time', 'textbox', '08']
    ] as const) {
      it(`drops the ${kind}’s uncommitted text, dirtying nothing`, async () => {
        const bound = await bind(kind);

        await userEvent.tab();
        await userEvent.keyboard(typed);
        await clickClear();

        await expect.poll(() => display(role)).not.toMatch(/\d/);
        await expect.element(field(role)).toHaveFocus();
        expect(bound.value()).toBeNull();
        expect(bound.dirty()).toBe(false);
        expect(clearButton()).toBeNull();
      });
    }

    it('drops a date’s unparseable text with its parse error', async () => {
      await bind('date');

      await userEvent.tab();
      await userEvent.keyboard('20241345');
      await userEvent.click(next());
      await expect.poll(messages).toEqual(['parse']);

      await clickClear();

      await expect.poll(messages).toEqual([]);
      expect(display('combobox')).not.toMatch(/\d/);
    });
  });

  describe('when it shows', () => {
    it('shows none unless asked', async () => {
      await bindField('input', 'signal', {
        value: 'Cynthion',
        decorated: true,
        decoration: '<div formidableFieldLabel>Answer</div>'
      });

      await userEvent.click(field('textbox'));

      expect(clearButton()).toBeNull();
    });

    it('shows none on an empty field', async () => {
      await bind('input');

      await userEvent.click(field('textbox'));

      expect(clearButton()).toBeNull();
    });

    for (const flag of ['readonly', 'disabled'] as const) {
      it(`shows none on a ${flag} field`, async () => {
        await bind('input', 'signal', { value: 'Cynthion', state: { [flag]: true } });

        await userEvent.hover(document.querySelector('formidable-field-decorator')!);

        expect(clearButton()).toBeNull();
      });
    }

    for (const [kind, value, inputs] of [
      ['toggle', true, {}],
      ['slider', 40, {}],
      ['radio-group', 'a', { options }],
      ['checkbox-group', ['a'], { options }]
    ] as const) {
      it(`shows none on the ${kind}, which has nothing to empty to`, async () => {
        await bind(kind, 'signal', { value, inputs });

        await userEvent.hover(document.querySelector('formidable-field-decorator')!);

        expect(clearButton()).toBeNull();
      });
    }

    it('shows for a date’s unparseable text once committed', async () => {
      await bind('date');

      await userEvent.tab();
      await userEvent.keyboard('20241345');
      await userEvent.click(next());

      await expect.poll(clearButton).not.toBeNull();
    });
  });

  describe('visibility', () => {
    const visibility = () => getComputedStyle(clearButton()!).visibility;

    it('is hidden at rest', async () => {
      await bind('input', 'signal', { value: 'Cynthion' });

      expect(visibility()).toBe('hidden');
    });

    it('shows while the field has focus', async () => {
      await bind('input', 'signal', { value: 'Cynthion' });

      await userEvent.tab();

      expect(visibility()).toBe('visible');
    });

    it('shows while the pointer is over the field', async () => {
      await bind('input', 'signal', { value: 'Cynthion' });

      await userEvent.hover(field('textbox'));

      expect(visibility()).toBe('visible');
    });

    it('is skipped by Shift + Tab at rest, so focus goes back to the field', async () => {
      await bind('input', 'signal', { value: 'Cynthion' });

      await userEvent.click(next());
      await userEvent.tab({ shift: true });

      await expect.element(field('textbox')).toHaveFocus();
    });
  });

  describe('pointer', () => {
    it('keeps focus in the field through the click, so a focused field is not left', async () => {
      const bound = await bind('input', 'signal', { value: 'Cynthion' });

      await userEvent.tab();
      await clickClear();

      await expect.poll(bound.value).toBe('');
      expect(bound.touched()).toBe(false);
      expect(bound.events()).not.toContain('touch');
    });
  });

  describe('keyboard', () => {
    it('is reached by Tab, clears on Enter and hands focus back to the field', async () => {
      const bound = await bind('input', 'signal', { value: 'Cynthion' });

      await userEvent.tab();
      await userEvent.tab();
      await expect.element(named()).toHaveFocus();

      await userEvent.keyboard('{Enter}');

      await expect.poll(bound.value).toBe('');
      await expect.element(field('textbox')).toHaveFocus();
    });

    it('submits no form, by click or by Enter', async () => {
      const bound = await bind('input', 'template-driven', { value: 'Cynthion' });
      const submits: Event[] = [];
      document.querySelector('form')!.addEventListener('submit', (event) => {
        event.preventDefault();
        submits.push(event);
      });

      await clickClear();
      await expect.poll(bound.value).toBe('');
      await userEvent.type(field('textbox'), 'x');
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
      await expect.poll(bound.value).toBe('');

      expect(submits).toEqual([]);
    });
  });

  describe('layout', () => {
    /** Where the value ends: the editor's right edge, short of its padding and border. */
    const valueEnd = (editor: Element) => {
      const style = getComputedStyle(editor);

      return editor.getBoundingClientRect().right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth);
    };

    it('keeps the value where it is as the button shows', async () => {
      await bind('input', 'signal', { value: 'Cynthion' });
      const atRest = valueEnd(field('textbox').element());

      await userEvent.tab();

      expect(valueEnd(field('textbox').element())).toBe(atRest);
    });

    it('never puts the value under the button', async () => {
      await bind('input', 'signal', { value: 'Cynthion' });

      expect(valueEnd(field('textbox').element())).toBeLessThanOrEqual(clearButton()!.getBoundingClientRect().left);
    });

    it('leaves a panel toggle in place, the button between it and the value', async () => {
      const bound = await bind('dropdown', 'signal', { inputs: { options } });
      const toggle = () => bound.element.querySelector('.dropdown-toggle')!.getBoundingClientRect();
      const empty = toggle();

      await bound.write('b');

      expect(toggle()).toEqual(empty);
      expect(clearButton()!.getBoundingClientRect().right).toBeLessThanOrEqual(empty.left);
      expect(valueEnd(field('combobox').element())).toBeLessThanOrEqual(clearButton()!.getBoundingClientRect().left);
    });

    // Beside a second field whose projected suffix takes the same app default: both follow their value.
    it('follows the app-wide suffixAlign with no projected suffix to state one', async () => {
      TestBed.configureTestingModule({ providers: provideNgxFormidable({ defaults: { suffixAlign: 'value' } }) });
      await bind('input', 'signal', {
        value: 'Cynthion',
        decoration: '<div formidableFieldLabel position="inside">Answer</div>',
        after:
          '<formidable-field-decorator><formidable-input-field value="x" />' +
          '<div formidableFieldLabel position="inside">Other</div><div formidableFieldSuffix>kg</div>' +
          '</formidable-field-decorator>'
      });
      const offset = (element: Element, editor: Element) => {
        const { top, height } = element.getBoundingClientRect();
        const box = editor.getBoundingClientRect();

        return top + height / 2 - (box.top + box.height / 2);
      };
      const suffix = offset(page.getByText('kg').element(), page.getByRole('textbox', { name: 'Other' }).element());

      expect(suffix).toBeGreaterThan(1);
      expect(Math.abs(offset(clearButton()!, field('textbox').element()) - suffix)).toBeLessThan(1);
    });

    it('sits after a projected suffix, the value clear of both', async () => {
      await bind('input', 'signal', {
        value: 'Cynthion',
        decoration: '<div formidableFieldLabel>Answer</div><span formidableFieldSuffix>kg</span>'
      });
      const suffix = page.getByText('kg').element().getBoundingClientRect();
      const button = clearButton()!.getBoundingClientRect();

      expect(suffix.right).toBeLessThanOrEqual(button.left);
      expect(valueEnd(field('textbox').element())).toBeLessThanOrEqual(suffix.left);
    });
  });

  describe('the autocomplete', () => {
    it('drops the label of a pick made with nothing typed', async () => {
      const bound = await bind('autocomplete', 'signal', { inputs: { options } });

      await userEvent.tab();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.click(page.getByRole('option', { name: 'Alpha' }));
      await expect.poll(bound.value).toBe('a');
      await clickClear();

      await expect.poll(bound.value).toBeNull();
      await expect.poll(() => display('combobox')).toBe('');
    });

    it('widens the list again after a pick from a narrowed one', async () => {
      await bind('autocomplete', 'signal', { inputs: { options } });

      await userEvent.type(field('combobox'), 'Al');
      await userEvent.click(page.getByRole('option', { name: 'Alpha' }));
      await clickClear();
      await expect.poll(() => display('combobox')).toBe('');

      await userEvent.keyboard('{ArrowDown}');

      await expect.poll(() => page.getByRole('option').elements().length).toBe(2);
    });
  });

  describe('an open panel', () => {
    it('closes as the click lands outside the field', async () => {
      const bound = await bind('dropdown', 'signal', { inputs: { options }, value: 'b' });

      await userEvent.click(field('combobox'), { force: true });
      await expect.element(field('combobox')).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(named());

      await expect.element(field('combobox')).toHaveAttribute('aria-expanded', 'false');
      expect(bound.value()).toBeNull();
    });
  });

  describe('name', () => {
    const nameOf = () => clearButton()!.getAttribute('aria-label');

    it('names the label', async () => {
      await bind('input', 'signal', { value: 'Cynthion' });

      expect(nameOf()).toBe('Clear Answer');
    });

    it('collapses a label written across several lines', async () => {
      await bind('input', 'signal', {
        value: 'Cynthion',
        decoration: '<div formidableFieldLabel ngPreserveWhitespaces>\n  Last\n  Name\n</div>'
      });

      expect(nameOf()).toBe('Clear Last Name');
    });

    it('names the placeholder where there is no label', async () => {
      await bind('input', 'signal', { value: 'Cynthion', decoration: '', inputs: { placeholder: 'Search' } });

      expect(nameOf()).toBe('Clear Search');
    });

    it('is plain Clear with neither', async () => {
      await bind('input', 'signal', { value: 'Cynthion', decoration: '' });

      expect(nameOf()).toBe('Clear');
    });

    it('takes the provided wording', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: FORMIDABLE_CLEAR_LABEL, useValue: (label: string) => `${label} leeren` }]
      });
      await bind('input', 'signal', { value: 'Cynthion' });

      expect(nameOf()).toBe('Answer leeren');
    });
  });

  // A clear is an edit only where the model moves, and `revealOn` decides from there.
  describe('a required field', () => {
    const required = (kind: FieldKind, options: BindFieldOptions = {}): Promise<BoundField> =>
      bind(kind, 'signal', { ...options, state: { required: true } });

    it('reveals on leaving after a pointer clear, which touches nothing', async () => {
      const bound = await required('input', { value: 'Cynthion' });

      await clickClear();
      await expect.poll(bound.value).toBe('');
      await settle(bound.fixture);
      expect(messages()).toEqual([]);

      await userEvent.tab();

      await expect.poll(messages).toEqual(['required']);
    });

    it('reveals at once after a keyboard clear, since Tab left the field', async () => {
      await required('input', { value: 'Cynthion' });

      await userEvent.tab();
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');

      await expect.poll(messages).toEqual(['required']);
    });

    it('reveals at once under dirty, where the model moves', async () => {
      await required('input', { value: 'Cynthion', inputs: { revealOn: 'dirty' } });

      await clickClear();

      await expect.poll(messages).toEqual(['required']);
    });

    it('reveals nothing new under dirty, where the model was null already', async () => {
      const bound = await required('date', { inputs: { revealOn: 'dirty' } });

      await userEvent.tab();
      await userEvent.keyboard('2024');
      await clickClear();
      await expect.poll(() => display('combobox')).not.toMatch(/\d/);
      await settle(bound.fixture);

      expect(messages()).toEqual([]);
      expect(bound.dirty()).toBe(false);
    });
  });
});
