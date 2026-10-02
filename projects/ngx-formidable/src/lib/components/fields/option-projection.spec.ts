import { NgTemplateOutlet } from '@angular/common';
import { Component, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldOption } from '../field-option/field-option';
import { AutocompleteField } from './autocomplete-field/autocomplete-field';
import { CheckboxGroupField } from './checkbox-group-field/checkbox-group-field';
import { RadioGroupField } from './radio-group-field/radio-group-field';
import { SelectField } from './select-field/select-field';

/**
 * Options projected into a field, per **Options** in `user/fields.md`: they may sit anywhere inside it,
 * including in a `@for`, an `@if`, an `<ng-template>` or a wrapping element, and the field follows each one as
 * it changes in place. A projected option owns its content, which is also the label it is filtered by.
 *
 * Also covers `defaultOption`, which is pinned ahead of the sorted list rather than sorted into it, and which
 * an autocomplete's filter leaves alone.
 *
 * The options are read by their role, and picked with a trusted click or real typing.
 */

@Component({
  imports: [FormsModule, NgTemplateOutlet, RadioGroupField, FieldOption],
  template: `
    <formidable-radio-group-field
      name="wrapped"
      [(ngModel)]="model"
      [defaultOption]="defaultOption()"
      [defaultOptionMode]="defaultOptionMode()"
      [sortFn]="sortFn()">
      <formidable-field-option value="direct" />

      @if (showConditional()) {
        <formidable-field-option value="conditional" />
      }

      @for (value of loopedValues(); track value) {
        <formidable-field-option [value]="value" />
      }

      <ng-container [ngTemplateOutlet]="templated" />
      <ng-template #templated>
        <formidable-field-option value="templated" />
      </ng-template>

      <div class="option-group">
        <formidable-field-option value="nested" />
      </div>
    </formidable-radio-group-field>
  `
})
class WrappedOptionsHost {
  readonly model = signal<string | null>(null);
  readonly showConditional = signal(true);
  readonly loopedValues = signal(['looped-a', 'looped-b']);
  readonly defaultOption = signal<FormidableOption | undefined>(undefined);
  readonly defaultOptionMode = signal<'always' | 'fallback'>('always');
  readonly sortFn = signal<((a: FormidableOption, b: FormidableOption) => number) | undefined>(undefined);
}

@Component({
  imports: [FormsModule, CheckboxGroupField, FieldOption],
  template: `
    <formidable-checkbox-group-field
      name="looped"
      ngModel
      [noOptionsText]="noOptionsText">
      @for (value of loopedValues(); track value) {
        <formidable-field-option [value]="value" />
      }
    </formidable-checkbox-group-field>
  `
})
class LoopedCheckboxHost {
  readonly loopedValues = signal(['a', 'b']);
  noOptionsText = 'Nothing here.';
}

@Component({
  imports: [FormsModule, AutocompleteField],
  template: `
    <formidable-autocomplete-field
      name="filtered"
      [(ngModel)]="model"
      [options]="options()"
      [defaultOption]="defaultOption"
      [defaultOptionMode]="defaultOptionMode()" />
  `
})
class FilteredAutocompleteHost {
  readonly model = signal<string | null>(null);
  readonly options = signal<FormidableOption[]>([{ value: 'cat', label: 'Cat' }]);
  defaultOption: FormidableOption = { value: 'add-new', label: 'Add a new one…' };
  readonly defaultOptionMode = signal<'always' | 'fallback'>('fallback');
}

@Component({
  imports: [FormsModule, RadioGroupField, FieldOption],
  template: `
    <formidable-radio-group-field
      name="projected"
      [(ngModel)]="model">
      <formidable-field-option value="a">Apple</formidable-field-option>
      <formidable-field-option
        value="b"
        label="Bound Banana" />
    </formidable-radio-group-field>
  `
})
class ProjectedContentHost {
  readonly model = signal<string | null>(null);
}

// One direct and one looped option, because the looped one is bound later than the field's effect first runs.
@Component({
  imports: [FormsModule, RadioGroupField, FieldOption],
  template: `
    <formidable-radio-group-field
      name="changing"
      ngModel>
      <formidable-field-option
        value="direct"
        [label]="directLabel()"
        [disabled]="disabledValue() === 'direct'" />
      @for (value of loopedValues(); track value) {
        <formidable-field-option
          [value]="value"
          [disabled]="disabledValue() === value" />
      }
    </formidable-radio-group-field>
  `
})
class ChangingOptionHost {
  readonly directLabel = signal('Direct');
  readonly disabledValue = signal('');
  readonly loopedValues = signal(['looped']);
}

// The select field watches its options with an effect of its own, not the one on `BaseOptionField`.
@Component({
  imports: [FormsModule, SelectField, FieldOption],
  template: `
    <formidable-select-field
      name="changing-select"
      ngModel>
      @for (value of loopedValues; track value) {
        <formidable-field-option
          [value]="value"
          [disabled]="disabledValue() === value" />
      }
    </formidable-select-field>
  `
})
class ChangingSelectOptionHost {
  readonly disabledValue = signal('');
  loopedValues = ['a', 'b'];
}

// An autocomplete, because its filter is what reads the label off the option: a group only displays it, and a
// displayed label comes from the projected template rather than from the option.
@Component({
  imports: [AutocompleteField, FieldOption],
  template: `
    <formidable-autocomplete-field name="projected-filter">
      <formidable-field-option value="a">Apple</formidable-field-option>
      <formidable-field-option value="b">Banana</formidable-field-option>
    </formidable-autocomplete-field>
  `
})
class ProjectedFilterHost {}

/** The names of the options of `role` on show, in order. */
function names(role: 'radio' | 'checkbox' | 'option', filter: { disabled?: boolean } = {}): string[] {
  return page
    .getByRole(role, filter)
    .elements()
    .map((option) => option.textContent!.trim());
}

/** Renders `host` and lets its options be collected. */
async function render<T>(host: Type<T>): Promise<ComponentFixture<T>> {
  configureFormidableTestBed({ imports: [host] });

  const fixture = TestBed.createComponent(host);
  await settle(fixture);

  return fixture;
}

/** Replaces the autocomplete's text, as a user does, and lets its filter through. */
async function filterBy(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  await userEvent.fill(page.getByRole('combobox'), text);
  await settle(fixture, 300); // clears the 200ms filter debounce
}

describe('option projection', () => {
  beforeEach(() => (document.activeElement as HTMLElement | null)?.blur());

  describe('content query', () => {
    let fixture: ComponentFixture<WrappedOptionsHost>;

    beforeEach(async () => (fixture = await render(WrappedOptionsHost)));

    it('collects options from every template construct, not just direct children', () => {
      expect(names('radio')).toEqual(['direct', 'conditional', 'looped-a', 'looped-b', 'templated', 'nested']);
    });

    it('follows options appearing and disappearing inside embedded views', async () => {
      fixture.componentInstance.showConditional.set(false);
      fixture.componentInstance.loopedValues.set(['looped-a']);
      await settle(fixture);

      expect(names('radio')).toEqual(['direct', 'looped-a', 'templated', 'nested']);
    });
  });

  /**
   * An option is folded out of its inputs and its projected content into one plain `FormidableOption`. The
   * label falls back to the projected text, and clicking the rendered option commits that plain option to the
   * field that owns it.
   */
  describe('the option a component hands over', () => {
    it('renders the projected content, and the bound label where there is no content', async () => {
      await render(ProjectedContentHost);

      expect(names('radio')).toEqual(['Apple', 'Bound Banana']);
    });

    it('commits to the owning field when the rendered option is clicked', async () => {
      const fixture = await render(ProjectedContentHost);

      await userEvent.click(page.getByRole('radio', { name: 'Apple' }));

      await expect.poll(() => fixture.componentInstance.model()).toBe('a');
    });

    // The default `match` reads the option's own label, which for a projected option is the text taken off its
    // content. Lose that and every content-only option stops matching its own name.
    it('filters on the label taken from the projected content', async () => {
      const fixture = await render(ProjectedFilterHost);

      await filterBy(fixture, 'app');

      expect(names('option')).toEqual(['Apple']);
    });
  });

  // A projected option whose inputs change in place stays the same query entry, so the field must follow the
  // option itself, not only the query.
  describe('an option changing in place', () => {
    let fixture: ComponentFixture<ChangingOptionHost>;

    beforeEach(async () => (fixture = await render(ChangingOptionHost)));

    it('follows a changed disabled flag, on a direct and on a looped option', async () => {
      fixture.componentInstance.disabledValue.set('looped');
      await settle(fixture);
      expect(names('radio', { disabled: true })).toEqual(['looped']);

      fixture.componentInstance.disabledValue.set('direct');
      await settle(fixture);
      expect(names('radio', { disabled: true })).toEqual(['Direct']);
    });

    it('follows a changed label', async () => {
      fixture.componentInstance.directLabel.set('Renamed');
      await settle(fixture);

      expect(names('radio')).toEqual(['Renamed', 'looped']);
    });

    it('collects an option added to the loop later', async () => {
      fixture.componentInstance.loopedValues.set(['looped', 'added']);
      await settle(fixture);

      expect(names('radio')).toEqual(['Direct', 'looped', 'added']);
    });
  });

  describe('a select option changing in place', () => {
    it('follows a changed disabled flag', async () => {
      const fixture = await render(ChangingSelectOptionHost);

      fixture.componentInstance.disabledValue.set('b');
      await settle(fixture);

      // The no-selection option, which carries no value, is disabled too.
      const select = page.getByRole('combobox').element() as HTMLSelectElement;
      const disabled = Array.from(select.options).filter((option) => option.disabled && option.value);

      expect(disabled.map((option) => option.value)).toEqual(['b']);
    });
  });

  describe('defaultOption', () => {
    let fixture: ComponentFixture<WrappedOptionsHost>;

    beforeEach(async () => (fixture = await render(WrappedOptionsHost)));

    it('is pinned first, ahead of the sortFn', async () => {
      fixture.componentInstance.defaultOption.set({ value: 'zzz-default' });
      fixture.componentInstance.sortFn.set((a, b) => a.value.localeCompare(b.value));
      await settle(fixture);

      expect(names('radio')[0]).toBe('zzz-default');
    });

    it('is picked like any option, and becomes the model value', async () => {
      fixture.componentInstance.defaultOption.set({ value: 'chosen-default' });
      await settle(fixture);

      await userEvent.click(page.getByRole('radio', { name: 'chosen-default' }));

      await expect.poll(() => fixture.componentInstance.model()).toBe('chosen-default');
    });

    it('stays out of the list in the fallback mode while other options exist', async () => {
      fixture.componentInstance.defaultOption.set({ value: 'only-when-empty' });
      fixture.componentInstance.defaultOptionMode.set('fallback');
      await settle(fixture);

      expect(names('radio')).not.toContain('only-when-empty');
    });
  });

  // The autocomplete pins its default after filtering, so it has its own path worth covering.
  describe('defaultOption on the autocomplete', () => {
    let fixture: ComponentFixture<FilteredAutocompleteHost>;

    beforeEach(async () => (fixture = await render(FilteredAutocompleteHost)));

    it('shows a fallback default only once the filter matches nothing', async () => {
      await filterBy(fixture, 'cat');
      expect(names('option')).toEqual(['Cat']);

      await filterBy(fixture, 'zzz');
      expect(names('option')).toEqual(['Add a new one…']);
    });

    it('keeps an always default visible through a non-matching filter', async () => {
      fixture.componentInstance.defaultOptionMode.set('always');
      await settle(fixture);

      await filterBy(fixture, 'zzz');

      expect(names('option')).toEqual(['Add a new one…']);
    });

    it('does not deselect a picked fallback default when the option list changes', async () => {
      await filterBy(fixture, 'zzz');
      await userEvent.click(page.getByRole('option', { name: 'Add a new one…' }));
      await expect.poll(() => fixture.componentInstance.model()).toBe('add-new');

      // An options change takes the selection back off any value it cannot find an option for.
      fixture.componentInstance.options.set([{ value: 'dog', label: 'Dog' }]);
      await settle(fixture, 300);

      expect(fixture.componentInstance.model()).toBe('add-new');
    });

    it('displays an externally written default value', async () => {
      fixture.componentInstance.model.set('add-new');
      await settle(fixture);

      await expect.element(page.getByRole('combobox')).toHaveValue('Add a new one…');
    });
  });

  describe('empty group', () => {
    let fixture: ComponentFixture<LoopedCheckboxHost>;

    beforeEach(async () => (fixture = await render(LoopedCheckboxHost)));

    it('collects @for options in a checkbox group', () => {
      expect(names('checkbox')).toEqual(['a', 'b']);
    });

    it('renders the empty state as plain text rather than as an option', async () => {
      fixture.componentInstance.loopedValues.set([]);
      await settle(fixture);

      // Hidden too, which takes in the native checkboxes behind the options.
      expect(page.getByRole('checkbox', { includeHidden: true }).elements()).toEqual([]);
      await expect.element(page.getByRole('group').getByText('Nothing here.')).toBeVisible();
    });
  });
});
