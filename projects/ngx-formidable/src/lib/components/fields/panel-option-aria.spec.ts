import { Component, Type, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { IFormidableOption } from '../../models/formidable.model';
import { AutocompleteFieldComponent } from './autocomplete-field/autocomplete-field.component';
import { CheckboxGroupFieldComponent } from './checkbox-group-field/checkbox-group-field.component';
import { DateFieldComponent } from './date-field/date-field.component';
import { DropdownFieldComponent } from './dropdown-field/dropdown-field.component';
import { RadioGroupFieldComponent } from './radio-group-field/radio-group-field.component';
import { SelectFieldComponent } from './select-field/select-field.component';

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

const options: IFormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green', disabled: true }
];

@Component({
  imports: [FormsModule, DropdownFieldComponent, AutocompleteFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-dropdown-field
      name="dropdown"
      [options]="options" />
    <formidable-autocomplete-field
      name="autocomplete"
      [options]="autocompleteOptions" />
  `
})
class PanelHostComponent {
  options = options;
  autocompleteOptions: IFormidableOption[] = options;
}

@Component({
  imports: [FormsModule, DateFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<formidable-date-field name="date" />`
})
class DateHostComponent {
  @ViewChild(DateFieldComponent, { static: true }) date!: DateFieldComponent;
}

@Component({
  imports: [FormsModule, RadioGroupFieldComponent, CheckboxGroupFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-radio-group-field
      name="colour"
      [options]="options" />
    <formidable-checkbox-group-field
      name="colours"
      [options]="options" />
  `
})
class GroupHostComponent {
  options = options;
}

/** The native control, which the platform already speaks for — a guard against the pattern spreading. */
@Component({
  imports: [FormsModule, SelectFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-select-field
      name="select"
      [options]="options" />
  `
})
class SelectHostComponent {
  options = options;
}

/** An attribute selector, not `#id`: the assertions are about the idref, never the id's spelling. */
function byId(root: HTMLElement, id: string | null): HTMLElement | null {
  return id ? root.querySelector(`[id="${id}"]`) : null;
}

/** What `aria-controls` / `aria-activedescendant` actually resolve to, rather than the id strings. */
function target(root: HTMLElement, control: HTMLElement, attribute: string): HTMLElement | null {
  return byId(root, control.getAttribute(attribute));
}

function padding(element: HTMLElement): string[] {
  const style = getComputedStyle(element);

  return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
}

describe('panel and option field ARIA', () => {
  let fixture: ComponentFixture<unknown>;
  let root: HTMLElement;

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNgxMask()] }));

  afterEach(() => fixture?.destroy());

  /** Options are collected in a microtask, so one `detectChanges()` is not enough to see them rendered. */
  function build<T>(host: Type<T>): T {
    fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    discardPeriodicTasks(); // ngxMask keeps an interval running for as long as a field is alive

    root = fixture.nativeElement as HTMLElement;

    return fixture.componentInstance as T;
  }

  /** Keydown is bound on `fieldRef` and gated on the field being focused, so both steps are real here. */
  function press(field: HTMLElement, key: string): void {
    field.dispatchEvent(new KeyboardEvent('keydown', { key }));
    flush();
    fixture.detectChanges();
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

    function open(): void {
      build(PanelHostComponent);

      input = element('formidable-dropdown-field input');
      field = element('formidable-dropdown-field .field');

      input.focus();
      fixture.detectChanges();
    }

    function optionElements(): HTMLElement[] {
      return elements('formidable-dropdown-field [role="option"]');
    }

    it('is a combobox that controls a listbox', fakeAsync(() => {
      open();

      expect(input.getAttribute('role')).toBe('combobox');
      expect(target(root, input, 'aria-controls')?.getAttribute('role')).toBe('listbox');
    }));

    it('reports whether its panel is open', fakeAsync(() => {
      open();

      expect(input.getAttribute('aria-expanded')).toBe('false');

      press(field, 'ArrowDown');

      expect(input.getAttribute('aria-expanded')).toBe('true');
    }));

    it('gives every option a role and an unselected state', fakeAsync(() => {
      open();

      expect(optionElements().length).toBe(3);
      expect(optionElements().map((option) => option.getAttribute('aria-selected'))).toEqual([
        'false',
        'false',
        'false'
      ]);
    }));

    it('marks a disabled option as such', fakeAsync(() => {
      open();

      expect(optionElements()[2]?.getAttribute('aria-disabled')).toBe('true');
      expect(optionElements()[0]?.getAttribute('aria-disabled')).toBeNull();
    }));

    // The load-bearing one: the active descendant and the highlight are read off the same stream.
    it('names the highlighted option, and only once one is highlighted', fakeAsync(() => {
      open();

      press(field, 'ArrowDown'); // opens the panel, highlights nothing

      expect(input.getAttribute('aria-activedescendant')).toBeNull();

      press(field, 'ArrowDown'); // highlights the first option

      const active = target(root, input, 'aria-activedescendant');

      expect(active).toBe(optionElements()[0]!);
      expect(active?.querySelector('.is-highlighted')).not.toBeNull();
    }));

    it('reports the option it selects', fakeAsync(() => {
      open();

      press(field, 'ArrowDown');
      press(field, 'ArrowDown');
      press(field, 'Enter');

      expect(optionElements().map((option) => option.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
        'false'
      ]);
    }));
  });

  describe('autocomplete as a combobox', () => {
    it('says its list is what completes the typing', fakeAsync(() => {
      build(PanelHostComponent);

      const input = element('formidable-autocomplete-field input');

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(target(root, input, 'aria-controls')?.getAttribute('role')).toBe('listbox');
    }));

    // The empty state used to be an option component, which announced itself as something to pick.
    it('offers no option at all when there is nothing to offer', fakeAsync(() => {
      const host = build(PanelHostComponent);

      expect(elements('formidable-autocomplete-field [role="option"]').length).toBe(3);

      host.autocompleteOptions = [];
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const listbox = target(root, element('formidable-autocomplete-field input'), 'aria-controls') as HTMLElement;

      expect(listbox.querySelectorAll('[role="option"]').length).toBe(0);
      expect(listbox.querySelector('.no-option')?.textContent?.trim()).toBe('No options available.');
    }));

    // Losing the option wrapper lost the row's padding with it, which left the text on the panel edge.
    it('insets its empty text exactly as an option row is inset', fakeAsync(() => {
      const host = build(PanelHostComponent);
      const optionRow = element('formidable-dropdown-field .field-option-inline');

      host.autocompleteOptions = [];
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(padding(element('formidable-autocomplete-field .no-option'))).toEqual(padding(optionRow));
    }));
  });

  describe('date field as a combobox over a dialog', () => {
    it('points at a dialog rather than at a listbox', fakeAsync(() => {
      build(DateHostComponent);

      const input = element('formidable-date-field input');

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-haspopup')).toBe('dialog');
      expect(target(root, input, 'aria-controls')?.getAttribute('role')).toBe('dialog');
    }));

    it('reports whether its panel is open', fakeAsync(() => {
      const host = build(DateHostComponent);
      const input = element('formidable-date-field input');

      expect(input.getAttribute('aria-expanded')).toBe('false');

      host.date.isPanelOpen = true;
      fixture.detectChanges();
      flush();
      discardPeriodicTasks();

      expect(input.getAttribute('aria-expanded')).toBe('true');
    }));

    // Pikaday owns the cells, so there is no option of ours to name.
    it('names no active descendant', fakeAsync(() => {
      build(DateHostComponent);

      expect(element('formidable-date-field input').getAttribute('aria-activedescendant')).toBeNull();
    }));
  });

  describe('the group fields', () => {
    it('gives a radio group radios and a checkbox group checkboxes', fakeAsync(() => {
      build(GroupHostComponent);

      expect(elements('[role="radio"]').length).toBe(3);
      expect(elements('[role="checkbox"]').length).toBe(3);
      expect(elements('[role="radio"]').map((option) => option.getAttribute('aria-checked'))).toEqual([
        'false',
        'false',
        'false'
      ]);
    }));

    // `aria-selected` belongs to a listbox; a radio and a checkbox report `aria-checked`.
    it('reports option state as checked rather than selected', fakeAsync(() => {
      build(GroupHostComponent);

      expect(elements('[role="radio"]')[0]?.getAttribute('aria-selected')).toBeNull();
      expect(elements('[role="checkbox"]')[0]?.getAttribute('aria-selected')).toBeNull();
    }));

    // A group has no open state, so it highlights its first option straight away — the arrows need
    // somewhere to start from. The panels are the ones that begin with nothing highlighted.
    it('names an active radio from the start, and moves it with the arrows', fakeAsync(() => {
      build(GroupHostComponent);

      const radiogroup = element('[role="radiogroup"]');
      radiogroup.focus();
      fixture.detectChanges();

      expect(target(root, radiogroup, 'aria-activedescendant')).toBe(elements('[role="radio"]')[0]!);

      press(radiogroup, 'ArrowDown');

      const active = target(root, radiogroup, 'aria-activedescendant');

      expect(active).toBe(elements('[role="radio"]')[1]!);
      expect(active?.querySelector('.is-highlighted')).not.toBeNull();
    }));

    it('checks the radio it selects, and only that one', fakeAsync(() => {
      build(GroupHostComponent);

      const radiogroup = element('[role="radiogroup"]');
      radiogroup.focus();
      fixture.detectChanges();

      press(radiogroup, 'Enter');

      expect(elements('[role="radio"]').map((option) => option.getAttribute('aria-checked'))).toEqual([
        'true',
        'false',
        'false'
      ]);
    }));

    it('lets a checkbox group check more than one', fakeAsync(() => {
      build(GroupHostComponent);

      const checkboxgroup = element('[role="group"]');
      checkboxgroup.focus();
      fixture.detectChanges();

      for (let i = 0; i < 2; i++) {
        press(checkboxgroup, 'ArrowDown');
        press(checkboxgroup, 'Enter');
      }

      expect(elements('[role="checkbox"]').map((option) => option.getAttribute('aria-checked'))).toEqual([
        'true',
        'true',
        'false'
      ]);
    }));
  });

  it('leaves the native select alone', fakeAsync(() => {
    build(SelectHostComponent);

    const select = element('select');

    expect(select.getAttribute('role')).toBeNull();
    expect(select.getAttribute('aria-expanded')).toBeNull();
  }));
});
