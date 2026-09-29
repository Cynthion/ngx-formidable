import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FieldDefaultOptionMode, FormidableActionOption, FormidableOption } from '../../models/formidable.model';
import { fill, press } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { AutocompleteField } from './autocomplete-field/autocomplete-field';
import { DropdownField } from './dropdown-field/dropdown-field';

/**
 * Contract of the `actionOption` the two panel fields take: an entry that runs an action instead of becoming
 * a value — "Add A New Address…" at the end of a list.
 *
 * It renders as an option and the keyboard walks it as one, because that is what `aria-activedescendant`
 * requires and what every highlight helper — all of them indices into `activeOptions` — already does. What
 * separates it from an option is the value paths, and those are the claims here: picking it commits nothing,
 * a model written to its value finds no option, the autocomplete never auto-selects it off an exact label,
 * and the dropdown's type-ahead walks past it.
 *
 * It also never stands in for a result. The empty state is a status — "nothing matched" — and the action is
 * a control; a panel showing the action still says the list is empty, which is why `noOptionsText` hangs off
 * the selectable options rather than off `@empty`.
 */

const OPTIONS: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

@Component({
  imports: [FormsModule, DropdownField, AutocompleteField],
  template: `
    <form>
      <formidable-dropdown-field
        name="branch"
        [(ngModel)]="branch"
        [options]="options()"
        [actionOption]="actionOption"
        [actionOptionMode]="mode()" />
      <formidable-autocomplete-field
        name="address"
        [(ngModel)]="address"
        [options]="options()"
        [actionOption]="actionOption"
        [actionOptionMode]="mode()" />
    </form>
  `
})
class TestHost {
  readonly dropdown = viewChild.required(DropdownField);

  readonly options = signal<FormidableOption[]>([...OPTIONS]);
  readonly mode = signal<FieldDefaultOptionMode>('always');
  readonly branch = signal<string | null>(null);
  readonly address = signal<string | null>(null);

  runs = 0;
  readonly actionOption: FormidableActionOption = {
    value: '__add__',
    label: 'Add A New One…',
    action: () => this.runs++
  };
}

describe('action option', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(() => {
    configureFormidableTestBed({ imports: [TestHost] });

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  function fieldElement(selector: 'dropdown' | 'autocomplete'): HTMLElement {
    return fixture.nativeElement.querySelector(`formidable-${selector}-field`) as HTMLElement;
  }

  function optionLabels(selector: 'dropdown' | 'autocomplete'): string[] {
    return Array.from(fieldElement(selector).querySelectorAll('formidable-field-option')).map((el) =>
      (el as HTMLElement).textContent!.trim()
    );
  }

  function emptyStateText(selector: 'dropdown' | 'autocomplete'): string | null {
    return fieldElement(selector).querySelector('.no-option')?.textContent?.trim() ?? null;
  }

  /** The option the field marks as holding its value. */
  function selectedOption(selector: 'dropdown' | 'autocomplete'): Element | null {
    return fieldElement(selector).querySelector('formidable-field-option[aria-selected="true"]');
  }

  function isPanelOpen(selector: 'dropdown' | 'autocomplete'): boolean {
    return fieldElement(selector).querySelector('.panel')!.classList.contains('open');
  }

  function clickOption(selector: 'dropdown' | 'autocomplete', label: string): void {
    const option = Array.from(fieldElement(selector).querySelectorAll('formidable-field-option')).find(
      (el) => (el as HTMLElement).textContent!.trim() === label
    ) as HTMLElement;

    option.querySelector('div')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  /** Types into the autocomplete's own input and lets its debounce through. */
  async function search(text: string): Promise<void> {
    const input = fieldElement('autocomplete').querySelector('input') as HTMLInputElement;

    input.focus();
    fill(input, text);

    await settle(fixture, 200);
  }

  describe('dropdown', () => {
    it('renders last, after the options', async () => {
      await settle(fixture);
      host.dropdown().togglePanel(true);
      await settle(fixture);

      expect(optionLabels('dropdown')).toEqual(['Red', 'Blue', 'Add A New One…']);
    });

    it('stays out of the list in the fallback mode while options exist', async () => {
      host.mode.set('fallback');
      await settle(fixture);
      host.dropdown().togglePanel(true);
      await settle(fixture);

      expect(optionLabels('dropdown')).toEqual(['Red', 'Blue']);
    });

    it('renders beside the empty-state text, not instead of it', async () => {
      host.mode.set('fallback');
      host.options.set([]);
      await settle(fixture);
      host.dropdown().togglePanel(true);
      await settle(fixture);

      expect(optionLabels('dropdown')).toEqual(['Add A New One…']);
      expect(emptyStateText('dropdown')).toBe('No options available.');
    });

    it('runs its action on a click, commits nothing and closes the panel', async () => {
      await settle(fixture);
      host.dropdown().togglePanel(true);
      await settle(fixture);

      clickOption('dropdown', 'Add A New One…');
      await settle(fixture);

      expect(host.runs).toBe(1);
      expect(host.branch()).toBeNull();
      expect(selectedOption('dropdown')).toBeNull();
      expect(isPanelOpen('dropdown')).toBe(false);
    });

    it('is reached by the keyboard and runs its action on Enter', async () => {
      await settle(fixture);
      const input = fieldElement('dropdown').querySelector('input') as HTMLInputElement;
      input.focus();
      await settle(fixture);

      // Keydowns are listened for on the field wrapper, and only while the field is focused.
      press(input, 'ArrowDown'); // opens the panel
      press(input, 'ArrowDown'); // Red
      press(input, 'ArrowDown'); // Blue
      press(input, 'ArrowDown'); // Add A New One…
      await settle(fixture);

      expect(fieldElement('dropdown').querySelector('.is-highlighted')!.textContent!.trim()).toBe('Add A New One…');

      press(input, 'Enter');
      await settle(fixture);

      expect(host.runs).toBe(1);
      expect(host.branch()).toBeNull();
    });

    it('is skipped by the type-ahead', async () => {
      await settle(fixture);
      const input = fieldElement('dropdown').querySelector('input') as HTMLInputElement;
      input.focus();
      await settle(fixture);

      // "a" starts no option's label but does start the action entry's.
      press(input, 'a');
      await settle(fixture, 200);

      expect(fieldElement('dropdown').querySelector('.is-highlighted')).toBeNull();
    });

    it('is not selected by a model written to its value', async () => {
      host.branch.set('__add__');
      await settle(fixture);

      expect(selectedOption('dropdown')).toBeNull();
      expect((fieldElement('dropdown').querySelector('input') as HTMLInputElement).value).toBe('');
    });
  });

  describe('autocomplete', () => {
    it('survives a filter that matches nothing, beside the empty-state text', async () => {
      await settle(fixture);
      await search('zzz');

      expect(optionLabels('autocomplete')).toEqual(['Add A New One…']);
      expect(emptyStateText('autocomplete')).toBe('No options available.');
    });

    it('runs its action on a click, commits nothing and closes the panel', async () => {
      await settle(fixture);
      await search('zzz');

      clickOption('autocomplete', 'Add A New One…');
      await settle(fixture);

      expect(host.runs).toBe(1);
      expect(host.address()).toBeNull();
      expect(selectedOption('autocomplete')).toBeNull();
      expect(isPanelOpen('autocomplete')).toBe(false);
    });

    it('leaves the typed filter alone, so the action can read it', async () => {
      await settle(fixture);
      await search('Wiesenstrasse 5');

      clickOption('autocomplete', 'Add A New One…');
      await settle(fixture);

      expect((fieldElement('autocomplete').querySelector('input') as HTMLInputElement).value).toBe('Wiesenstrasse 5');
    });

    it('is not auto-selected by typing its label exactly', async () => {
      await settle(fixture);
      await search('Add A New One…');

      expect(host.runs).toBe(0);
      expect(host.address()).toBeNull();
      expect(selectedOption('autocomplete')).toBeNull();
    });
  });
});
