import { NgTemplateOutlet } from '@angular/common';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormidableOption } from '../../models/formidable.model';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldOption } from '../field-option/field-option';
import { AutocompleteField } from './autocomplete-field/autocomplete-field';
import { CheckboxGroupField } from './checkbox-group-field/checkbox-group-field';
import { RadioGroupField } from './radio-group-field/radio-group-field';
import { SelectField } from './select-field/select-field';

/**
 * Contract of the option content query: options declared inside a field are collected whatever wraps them.
 *
 * Ivy's shallow (`descendants: false`) query already reaches into embedded views, so `@for`, `*ngIf` and
 * `<ng-template>` were never the problem. What it does not reach is an option nested inside an *element*
 * — a `<div>` grouping options, or a wrapper component projecting them on. That is what the
 * `{ descendants: true }` on every `@ContentChildren(FORMIDABLE_OPTION)` adds; remove it and the
 * `nested` case below is the one that drops out.
 *
 * Also covers `defaultOption`, which is pinned ahead of the sorted list rather than sorted into it.
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
  readonly field = viewChild.required(RadioGroupField);

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
  readonly field = viewChild.required(AutocompleteField);

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

// An autocomplete, because its filter is what reads the label off the option — a group only displays it,
// and a displayed label comes from the projected template rather than from the option.
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

function renderedOptionValues(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('formidable-field-option')).map((el) =>
    (el as HTMLElement).textContent?.trim()
  ) as string[];
}

describe('option projection', () => {
  describe('content query', () => {
    let fixture: ComponentFixture<WrappedOptionsHost>;
    let host: WrappedOptionsHost;

    beforeEach(async () => {
      configureFormidableTestBed({ imports: [WrappedOptionsHost] });

      fixture = TestBed.createComponent(WrappedOptionsHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('collects options from every template construct, not just direct children', () => {
      expect(renderedOptionValues(fixture)).toEqual([
        'direct',
        'conditional',
        'looped-a',
        'looped-b',
        'templated',
        'nested'
      ]);
    });

    it('reacts to options appearing and disappearing inside embedded views', async () => {
      host.showConditional.set(false);
      host.loopedValues.set(['looped-a']);
      await settle(fixture);

      expect(renderedOptionValues(fixture)).toEqual(['direct', 'looped-a', 'templated', 'nested']);
    });
  });

  /**
   * The option a field reads off a projected component is `FieldOption.option` — one plain
   * `FormidableOption` folded out of its signal inputs and its projected content. These two claims are the
   * whole boundary: the label falls back to the projected text, and clicking the rendered option commits
   * that plain option to the field that owns it.
   */
  describe('the option a component hands over', () => {
    let fixture: ComponentFixture<ProjectedContentHost>;
    let host: ProjectedContentHost;

    beforeEach(async () => {
      configureFormidableTestBed({ imports: [ProjectedContentHost] });

      fixture = TestBed.createComponent(ProjectedContentHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('renders the projected content, and the bound label where there is no content', () => {
      expect(renderedOptionValues(fixture)).toEqual(['Apple', 'Bound Banana']);
    });

    it('commits to the owning field when the rendered option is clicked', async () => {
      const option = fixture.nativeElement.querySelectorAll('formidable-field-option')[0] as HTMLElement;

      // The `(click)` sits on the option's inner div, which is what the field renders.
      option.querySelector('div')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);

      expect(host.model()).toBe('a');
    });

    // The default `match` reads the option's own label, which for a projected option is the text taken
    // off its content. Lose that and every content-only option stops matching its own name.
    it('filters on the label taken from the projected content', async () => {
      const filterFixture = TestBed.createComponent(ProjectedFilterHost);
      await settle(filterFixture);

      const filterInput = filterFixture.nativeElement.querySelector('input') as HTMLInputElement;
      filterInput.dispatchEvent(new Event('focus'));
      fill(filterInput, 'app');
      await settle(filterFixture, 300); // clears the 200ms filter debounce

      expect(renderedOptionValues(filterFixture)).toEqual(['Apple']);

      filterFixture.destroy();
    });
  });

  // A projected option whose inputs change in place stays the same query entry, so the field must follow
  // the option itself, not only the query.
  describe('an option changing in place', () => {
    let fixture: ComponentFixture<ChangingOptionHost>;
    let host: ChangingOptionHost;

    const disabledValues = () =>
      Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"][disabled]')).map((el) =>
        (el as HTMLInputElement).nextElementSibling?.textContent?.trim()
      );

    beforeEach(async () => {
      configureFormidableTestBed({ imports: [ChangingOptionHost] });

      fixture = TestBed.createComponent(ChangingOptionHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('follows a changed disabled flag, on a direct and on a looped option', async () => {
      host.disabledValue.set('looped');
      await settle(fixture);
      expect(disabledValues()).toEqual(['looped']);

      host.disabledValue.set('direct');
      await settle(fixture);
      expect(disabledValues()).toEqual(['Direct']);
    });

    it('follows a changed label', async () => {
      host.directLabel.set('Renamed');
      await settle(fixture);

      expect(renderedOptionValues(fixture)).toEqual(['Renamed', 'looped']);
    });

    it('collects an option added to the loop later', async () => {
      host.loopedValues.set(['looped', 'added']);
      await settle(fixture);

      expect(renderedOptionValues(fixture)).toEqual(['Direct', 'looped', 'added']);
    });

    it('follows a changed disabled flag in a select field', async () => {
      const selectFixture = TestBed.createComponent(ChangingSelectOptionHost);
      await settle(selectFixture);

      selectFixture.componentInstance.disabledValue.set('b');
      await settle(selectFixture);

      // `:not([value=""])` leaves out the no-selection option, which is disabled too.
      const disabled = Array.from(selectFixture.nativeElement.querySelectorAll('option:disabled:not([value=""])')).map(
        (el) => (el as HTMLOptionElement).value
      );
      expect(disabled).toEqual(['b']);
    });
  });

  describe('defaultOption', () => {
    let fixture: ComponentFixture<WrappedOptionsHost>;
    let host: WrappedOptionsHost;

    beforeEach(() => {
      configureFormidableTestBed({ imports: [WrappedOptionsHost] });

      fixture = TestBed.createComponent(WrappedOptionsHost);
      host = fixture.componentInstance;
    });

    it('is pinned first, ahead of the sortFn', async () => {
      host.defaultOption.set({ value: 'zzz-default' });
      host.sortFn.set((a, b) => a.value.localeCompare(b.value));
      await settle(fixture);

      expect(renderedOptionValues(fixture)[0]).toBe('zzz-default');
    });

    it('is selectable and becomes the model value', async () => {
      host.defaultOption.set({ value: 'chosen-default' });
      await settle(fixture);

      host.field().selectOption(host.defaultOption()!);
      await settle(fixture);

      expect(host.model()).toBe('chosen-default');
    });

    it('stays out of the list in the fallback mode while other options exist', async () => {
      host.defaultOption.set({ value: 'only-when-empty' });
      host.defaultOptionMode.set('fallback');
      await settle(fixture);

      expect(renderedOptionValues(fixture)).not.toContain('only-when-empty');
    });
  });

  // the autocomplete pins its default after filtering, so it has its own path worth covering
  describe('defaultOption on the autocomplete', () => {
    let fixture: ComponentFixture<FilteredAutocompleteHost>;
    let host: FilteredAutocompleteHost;

    const filterBy = async (text: string) => {
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('focus'));
      fill(input, text);
      await settle(fixture, 300); // clears the 200ms filter debounce
    };

    beforeEach(async () => {
      configureFormidableTestBed({ imports: [FilteredAutocompleteHost] });

      fixture = TestBed.createComponent(FilteredAutocompleteHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('shows a fallback default only once the filter matches nothing', async () => {
      await filterBy('cat');
      expect(renderedOptionValues(fixture)).toEqual(['Cat']);

      await filterBy('zzz');
      expect(renderedOptionValues(fixture)).toEqual(['Add a new one…']);
    });

    it('keeps an always default visible through a non-matching filter', async () => {
      host.defaultOptionMode.set('always');
      await settle(fixture);

      await filterBy('zzz');

      expect(renderedOptionValues(fixture)).toEqual(['Add a new one…']);
    });

    it('does not deselect a chosen fallback default when the option list changes', async () => {
      await filterBy('zzz');
      host.field().selectOption(host.defaultOption);

      // an options change runs the reconcile pass, which drops any selection it cannot find
      host.options.set([{ value: 'dog', label: 'Dog' }]);
      await settle(fixture, 300);

      expect(host.model()).toBe('add-new');
    });

    it('displays an externally written default value', async () => {
      host.model.set('add-new');
      await settle(fixture);

      expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).value).toBe('Add a new one…');
    });
  });

  describe('empty group', () => {
    let fixture: ComponentFixture<LoopedCheckboxHost>;
    let host: LoopedCheckboxHost;

    beforeEach(async () => {
      configureFormidableTestBed({ imports: [LoopedCheckboxHost] });

      fixture = TestBed.createComponent(LoopedCheckboxHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('collects @for options in a checkbox group', () => {
      expect(renderedOptionValues(fixture)).toEqual(['a', 'b']);
    });

    it('renders the empty state as plain text rather than as an option', async () => {
      host.loopedValues.set([]);
      await settle(fixture);

      const field = fixture.nativeElement.querySelector('.field') as HTMLElement;

      expect(field.querySelectorAll('formidable-field-option').length).toBe(0);
      expect(field.querySelectorAll('input').length).toBe(0);
      expect(field.querySelector('.no-option')?.textContent?.trim()).toBe('Nothing here.');
    });
  });
});
