import { Component, Type, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormidableOption } from '../../models/formidable.model';
import { press, referenced } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { AutocompleteField } from './autocomplete-field/autocomplete-field';
import { CheckboxGroupField } from './checkbox-group-field/checkbox-group-field';
import { DateField } from './date-field/date-field';
import { DropdownField } from './dropdown-field/dropdown-field';
import { RadioGroupField } from './radio-group-field/radio-group-field';
import { SelectField } from './select-field/select-field';

/**
 * Contract of the ARIA wiring a field owns inside its own box — the mirror of the decorator's.
 *
 * The decorator mints the ids for what it renders around the field (`-label`, `-hint`, `-errors`); the
 * field mints the ids for what lives inside it, `{fieldId}-panel` and `{fieldId}-option-{index}`, from the
 * same `fieldId`. Nothing else in the library points at those elements, so nothing else needs to know them —
 * which is why every assertion here resolves an idref instead of comparing id strings.
 *
 * `aria-activedescendant` is bound off the very stream that drives the `is-highlighted` class, so the two
 * can never name different options. That is asserted here rather than assumed.
 *
 * An option takes its role from the parent field's `optionRole`, never from its own `layout`: `layout` is a
 * look a consumer may set freely, while the role has to follow the container that owns the option. The role
 * is also what decides between `aria-selected` (a listbox) and `aria-checked` (the two groups).
 *
 * `date-field` deliberately departs from the other two panels: a Pikaday calendar is not a list and its
 * cells are third-party markup with no ids of ours, so it is a `dialog` and names no active descendant.
 */

const options: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green', disabled: true }
];

@Component({
  imports: [FormsModule, DropdownField, AutocompleteField],
  template: `
    <formidable-dropdown-field
      name="dropdown"
      [options]="options" />
    <formidable-autocomplete-field
      name="autocomplete"
      [options]="autocompleteOptions()" />
  `
})
class PanelHost {
  options = options;
  readonly autocompleteOptions = signal<FormidableOption[]>(options);
}

@Component({
  imports: [FormsModule, DateField],
  template: `<formidable-date-field name="date" />`
})
class DateHost {
  readonly date = viewChild.required(DateField);
}

@Component({
  imports: [FormsModule, RadioGroupField, CheckboxGroupField],
  template: `
    <formidable-radio-group-field
      name="colour"
      [options]="options" />
    <formidable-checkbox-group-field
      name="colours"
      [options]="options" />
  `
})
class GroupHost {
  options = options;
}

/** The native control, which the platform already speaks for — a guard against the pattern spreading. */
@Component({
  imports: [FormsModule, SelectField],
  template: `
    <formidable-select-field
      name="select"
      [options]="options" />
  `
})
class SelectHost {
  options = options;
}

function padding(element: HTMLElement): string[] {
  const style = getComputedStyle(element);

  return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
}

describe('panel and option field ARIA', () => {
  let fixture: ComponentFixture<unknown>;
  let root: HTMLElement;

  beforeEach(() => configureFormidableTestBed());

  afterEach(() => fixture?.destroy());

  /** Options are collected in a microtask, so the first render has to settle before they are there. */
  async function build<T>(host: Type<T>): Promise<T> {
    fixture = TestBed.createComponent(host);
    await settle(fixture);

    root = fixture.nativeElement as HTMLElement;

    return fixture.componentInstance as T;
  }

  /** Keydown is bound on `fieldRef` and gated on the field being focused, so both steps are real here. */
  async function keydown(field: HTMLElement, key: string): Promise<void> {
    press(field, key);
    await settle(fixture);
  }

  function element(selector: string): HTMLElement {
    return root.querySelector(selector) as HTMLElement;
  }

  function elements(selector: string): HTMLElement[] {
    return Array.from(root.querySelectorAll(selector));
  }

  describe('dropdown as a combobox', () => {
    let input: HTMLElement;
    let field: HTMLElement;

    async function open(): Promise<void> {
      await build(PanelHost);

      input = element('formidable-dropdown-field input');
      field = element('formidable-dropdown-field .field');

      input.focus();
      await settle(fixture);
    }

    function optionElements(): HTMLElement[] {
      return elements('formidable-dropdown-field [role="option"]');
    }

    it('is a combobox that controls a listbox', async () => {
      await open();

      expect(input.getAttribute('role')).toBe('combobox');
      expect(referenced(input, 'aria-controls')[0]?.getAttribute('role')).toBe('listbox');
    });

    it('reports whether its panel is open', async () => {
      await open();

      expect(input.getAttribute('aria-expanded')).toBe('false');

      await keydown(field, 'ArrowDown');

      expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    it('gives every option a role and an unselected state', async () => {
      await open();

      expect(optionElements().length).toBe(3);
      expect(optionElements().map((option) => option.getAttribute('aria-selected'))).toEqual([
        'false',
        'false',
        'false'
      ]);
    });

    it('marks a disabled option as such', async () => {
      await open();

      expect(optionElements()[2]?.getAttribute('aria-disabled')).toBe('true');
      expect(optionElements()[0]?.getAttribute('aria-disabled')).toBeNull();
    });

    // The load-bearing one: the active descendant and the highlight are read off the same stream.
    it('names the highlighted option, and only once one is highlighted', async () => {
      await open();

      await keydown(field, 'ArrowDown'); // opens the panel, highlights nothing

      expect(input.getAttribute('aria-activedescendant')).toBeNull();

      await keydown(field, 'ArrowDown'); // highlights the first option

      const [active] = referenced(input, 'aria-activedescendant');

      expect(active).toBe(optionElements()[0]!);
      expect(active?.querySelector('.is-highlighted')).not.toBeNull();
    });

    it('reports the option it selects', async () => {
      await open();

      await keydown(field, 'ArrowDown');
      await keydown(field, 'ArrowDown');
      await keydown(field, 'Enter');

      expect(optionElements().map((option) => option.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
        'false'
      ]);
    });
  });

  describe('autocomplete as a combobox', () => {
    it('says its list is what completes the typing', async () => {
      await build(PanelHost);

      const input = element('formidable-autocomplete-field input');

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(referenced(input, 'aria-controls')[0]?.getAttribute('role')).toBe('listbox');
    });

    // The empty state used to be an option component, which announced itself as something to pick.
    it('offers no option at all when there is nothing to offer', async () => {
      const host = await build(PanelHost);

      expect(elements('formidable-autocomplete-field [role="option"]').length).toBe(3);

      host.autocompleteOptions.set([]);
      await settle(fixture);

      const listbox = referenced(element('formidable-autocomplete-field input'), 'aria-controls')[0]!;

      expect(listbox.querySelectorAll('[role="option"]').length).toBe(0);
      expect(listbox.querySelector('.no-option')?.textContent?.trim()).toBe('No options available.');
    });

    // Losing the option wrapper lost the row's padding with it, which left the text on the panel edge.
    it('insets its empty text exactly as an option row is inset', async () => {
      const host = await build(PanelHost);
      const optionRow = element('formidable-dropdown-field .field-option-inline');

      host.autocompleteOptions.set([]);
      await settle(fixture);

      expect(padding(element('formidable-autocomplete-field .no-option'))).toEqual(padding(optionRow));
    });
  });

  describe('date field as a combobox over a dialog', () => {
    it('points at a dialog rather than at a listbox', async () => {
      await build(DateHost);

      const input = element('formidable-date-field input');

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-haspopup')).toBe('dialog');
      expect(referenced(input, 'aria-controls')[0]?.getAttribute('role')).toBe('dialog');
    });

    it('reports whether its panel is open', async () => {
      const host = await build(DateHost);
      const input = element('formidable-date-field input');

      expect(input.getAttribute('aria-expanded')).toBe('false');

      host.date().togglePanel(true);
      await settle(fixture);

      expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    // Pikaday owns the cells, so there is no option of ours to name.
    it('names no active descendant', async () => {
      await build(DateHost);

      expect(element('formidable-date-field input').getAttribute('aria-activedescendant')).toBeNull();
    });
  });

  describe('the group fields', () => {
    it('gives a radio group radios and a checkbox group checkboxes', async () => {
      await build(GroupHost);

      expect(elements('[role="radio"]').length).toBe(3);
      expect(elements('[role="checkbox"]').length).toBe(3);
      expect(elements('[role="radio"]').map((option) => option.getAttribute('aria-checked'))).toEqual([
        'false',
        'false',
        'false'
      ]);
    });

    // `aria-selected` belongs to a listbox; a radio and a checkbox report `aria-checked`.
    it('reports option state as checked rather than selected', async () => {
      await build(GroupHost);

      expect(elements('[role="radio"]')[0]?.getAttribute('aria-selected')).toBeNull();
      expect(elements('[role="checkbox"]')[0]?.getAttribute('aria-selected')).toBeNull();
    });

    // A group has no open state, so it highlights its first option straight away — the arrows need
    // somewhere to start from. The panels are the ones that begin with nothing highlighted.
    it('names an active radio from the start, and moves it with the arrows', async () => {
      await build(GroupHost);

      const radiogroup = element('[role="radiogroup"]');
      radiogroup.focus();
      await settle(fixture);

      expect(referenced(radiogroup, 'aria-activedescendant')[0]).toBe(elements('[role="radio"]')[0]!);

      await keydown(radiogroup, 'ArrowDown');

      const [active] = referenced(radiogroup, 'aria-activedescendant');

      expect(active).toBe(elements('[role="radio"]')[1]!);
      expect(active?.querySelector('.is-highlighted')).not.toBeNull();
    });

    it('checks the radio it selects, and only that one', async () => {
      await build(GroupHost);

      const radiogroup = element('[role="radiogroup"]');
      radiogroup.focus();
      await settle(fixture);

      await keydown(radiogroup, 'Enter');

      expect(elements('[role="radio"]').map((option) => option.getAttribute('aria-checked'))).toEqual([
        'true',
        'false',
        'false'
      ]);
    });

    it('lets a checkbox group check more than one', async () => {
      await build(GroupHost);

      const checkboxgroup = element('[role="group"]');
      checkboxgroup.focus();
      await settle(fixture);

      for (let i = 0; i < 2; i++) {
        await keydown(checkboxgroup, 'ArrowDown');
        await keydown(checkboxgroup, 'Enter');
      }

      expect(elements('[role="checkbox"]').map((option) => option.getAttribute('aria-checked'))).toEqual([
        'true',
        'true',
        'false'
      ]);
    });
  });

  it('leaves the native select alone', async () => {
    await build(SelectHost);

    const select = element('select');

    expect(select.getAttribute('role')).toBeNull();
    expect(select.getAttribute('aria-expanded')).toBeNull();
  });
});
