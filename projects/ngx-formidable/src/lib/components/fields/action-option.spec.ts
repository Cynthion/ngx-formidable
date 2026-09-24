import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FieldDefaultOptionMode, IFormidableActionOption, IFormidableOption } from '../../models/formidable.model';
import { AutocompleteFieldComponent } from './autocomplete-field/autocomplete-field.component';
import { DropdownFieldComponent } from './dropdown-field/dropdown-field.component';

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

const OPTIONS: IFormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

@Component({
  imports: [FormsModule, DropdownFieldComponent, AutocompleteFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-dropdown-field
        name="branch"
        [(ngModel)]="branch"
        [options]="options"
        [actionOption]="actionOption"
        [actionOptionMode]="mode" />
      <formidable-autocomplete-field
        name="address"
        [(ngModel)]="address"
        [options]="options"
        [actionOption]="actionOption"
        [actionOptionMode]="mode" />
    </form>
  `
})
class HostComponent {
  readonly dropdown = viewChild.required(DropdownFieldComponent);
  readonly autocomplete = viewChild.required(AutocompleteFieldComponent);

  options: IFormidableOption[] = [...OPTIONS];
  mode: FieldDefaultOptionMode = 'always';
  branch: string | null = null;
  address: string | null = null;

  runs = 0;
  readonly actionOption: IFormidableActionOption = {
    value: '__add__',
    label: 'Add A New One…',
    action: () => this.runs++
  };
}

describe('action option', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  /** Options are collected in a microtask, so one `detectChanges()` is not enough to see them rendered. */
  function settle(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

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

  function clickOption(selector: 'dropdown' | 'autocomplete', label: string): void {
    const option = Array.from(fieldElement(selector).querySelectorAll('formidable-field-option')).find(
      (el) => (el as HTMLElement).textContent!.trim() === label
    ) as HTMLElement;

    option.querySelector('div')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  /** Keydowns are listened for on the field wrapper, and only while the field is focused. */
  function press(selector: 'dropdown' | 'autocomplete', key: string): void {
    const input = fieldElement(selector).querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  /** Types into the autocomplete's own input and lets its debounce through. */
  function type(text: string): void {
    const input = fieldElement('autocomplete').querySelector('input') as HTMLInputElement;

    input.dispatchEvent(new Event('focus'));
    input.value = text;
    input.dispatchEvent(new Event('input'));

    tick(200);
    fixture.detectChanges();
  }

  describe('dropdown', () => {
    it('renders last, after the options', fakeAsync(() => {
      settle();
      host.dropdown().togglePanel(true);
      settle();

      expect(optionLabels('dropdown')).toEqual(['Red', 'Blue', 'Add A New One…']);
      flush();
    }));

    it('stays out of the list in the fallback mode while options exist', fakeAsync(() => {
      host.mode = 'fallback';
      settle();
      host.dropdown().togglePanel(true);
      settle();

      expect(optionLabels('dropdown')).toEqual(['Red', 'Blue']);
      flush();
    }));

    it('renders beside the empty-state text, not instead of it', fakeAsync(() => {
      host.mode = 'fallback';
      host.options = [];
      settle();
      host.dropdown().togglePanel(true);
      settle();

      expect(optionLabels('dropdown')).toEqual(['Add A New One…']);
      expect(emptyStateText('dropdown')).toBe('No options available.');
      flush();
    }));

    it('runs its action on a click, commits nothing and closes the panel', fakeAsync(() => {
      settle();
      host.dropdown().togglePanel(true);
      settle();

      clickOption('dropdown', 'Add A New One…');
      settle();

      expect(host.runs).toBe(1);
      expect(host.branch).toBeNull();
      expect(host.dropdown().value).toBeNull();
      expect(host.dropdown().isPanelOpen()).toBe(false);
      flush();
    }));

    it('is reached by the keyboard and runs its action on Enter', fakeAsync(() => {
      settle();
      const input = fieldElement('dropdown').querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('focus'));
      settle();

      press('dropdown', 'ArrowDown'); // opens the panel
      press('dropdown', 'ArrowDown'); // Red
      press('dropdown', 'ArrowDown'); // Blue
      press('dropdown', 'ArrowDown'); // Add A New One…

      expect(fieldElement('dropdown').querySelector('.is-highlighted')!.textContent!.trim()).toBe('Add A New One…');

      press('dropdown', 'Enter');
      settle();

      expect(host.runs).toBe(1);
      expect(host.branch).toBeNull();
      flush();
    }));

    it('is skipped by the type-ahead', fakeAsync(() => {
      settle();
      const input = fieldElement('dropdown').querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('focus'));
      settle();

      // "a" starts no option's label but does start the action entry's.
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      tick(200);
      fixture.detectChanges();

      expect(fieldElement('dropdown').querySelector('.is-highlighted')).toBeNull();
      flush();
    }));

    it('is not selected by a model written to its value', fakeAsync(() => {
      host.branch = '__add__';
      settle();

      expect(host.dropdown().value).toBeNull();
      expect((fieldElement('dropdown').querySelector('input') as HTMLInputElement).value).toBe('');
      flush();
    }));
  });

  describe('autocomplete', () => {
    it('survives a filter that matches nothing, beside the empty-state text', fakeAsync(() => {
      settle();
      type('zzz');

      expect(optionLabels('autocomplete')).toEqual(['Add A New One…']);
      expect(emptyStateText('autocomplete')).toBe('No options available.');
      flush();
    }));

    it('runs its action on a click, commits nothing and closes the panel', fakeAsync(() => {
      settle();
      type('zzz');

      clickOption('autocomplete', 'Add A New One…');
      settle();

      expect(host.runs).toBe(1);
      expect(host.address).toBeNull();
      expect(host.autocomplete().value).toBeNull();
      expect(host.autocomplete().isPanelOpen()).toBe(false);
      flush();
    }));

    it('leaves the typed filter alone, so the action can read it', fakeAsync(() => {
      settle();
      type('Wiesenstrasse 5');

      clickOption('autocomplete', 'Add A New One…');
      settle();

      expect((fieldElement('autocomplete').querySelector('input') as HTMLInputElement).value).toBe('Wiesenstrasse 5');
      flush();
    }));

    it('is not auto-selected by typing its label exactly', fakeAsync(() => {
      settle();
      type('Add A New One…');

      expect(host.runs).toBe(0);
      expect(host.address).toBeNull();
      expect(host.autocomplete().value).toBeNull();
      flush();
    }));
  });
});
