import { NgTemplateOutlet } from '@angular/common';
import { Component, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormidableOption } from '../../models/formidable.model';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-radio-group-field
      name="wrapped"
      ngModel
      [defaultOption]="defaultOption"
      [defaultOptionMode]="defaultOptionMode"
      [sortFn]="sortFn">
      <formidable-field-option value="direct" />

      @if (showConditional) {
        <formidable-field-option value="conditional" />
      }

      @for (value of loopedValues; track value) {
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

  showConditional = true;
  loopedValues = ['looped-a', 'looped-b'];
  defaultOption?: FormidableOption;
  defaultOptionMode: 'always' | 'fallback' = 'always';
  sortFn?: (a: FormidableOption, b: FormidableOption) => number;
}

@Component({
  imports: [FormsModule, CheckboxGroupField, FieldOption],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-checkbox-group-field
      name="looped"
      ngModel
      [noOptionsText]="noOptionsText">
      @for (value of loopedValues; track value) {
        <formidable-field-option [value]="value" />
      }
    </formidable-checkbox-group-field>
  `
})
class LoopedCheckboxHost {
  readonly field = viewChild.required(CheckboxGroupField);

  loopedValues: string[] = ['a', 'b'];
  noOptionsText = 'Nothing here.';
}

// deliberately without ngModel: NgModel writes its own (empty) model back on every change detection,
// which would clear the selection this suite is about
@Component({
  imports: [AutocompleteField],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-autocomplete-field
      name="filtered"
      [options]="options"
      [defaultOption]="defaultOption"
      [defaultOptionMode]="defaultOptionMode" />
  `
})
class FilteredAutocompleteHost {
  readonly field = viewChild.required(AutocompleteField);

  options: FormidableOption[] = [{ value: 'cat', label: 'Cat' }];
  defaultOption: FormidableOption = { value: 'add-new', label: 'Add a new one…' };
  defaultOptionMode: 'always' | 'fallback' = 'fallback';
}

@Component({
  imports: [FormsModule, RadioGroupField, FieldOption],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-radio-group-field
      name="projected"
      ngModel>
      <formidable-field-option value="a">Apple</formidable-field-option>
      <formidable-field-option
        value="b"
        label="Bound Banana" />
    </formidable-radio-group-field>
  `
})
class ProjectedContentHost {
  readonly field = viewChild.required(RadioGroupField);
}

// One direct and one looped option, because the looped one is bound later than the field's effect first runs.
@Component({
  imports: [FormsModule, RadioGroupField, FieldOption],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-radio-group-field
      name="changing"
      ngModel>
      <formidable-field-option
        value="direct"
        [label]="directLabel"
        [disabled]="disabledValue === 'direct'" />
      @for (value of loopedValues; track value) {
        <formidable-field-option
          [value]="value"
          [disabled]="disabledValue === value" />
      }
    </formidable-radio-group-field>
  `
})
class ChangingOptionHost {
  directLabel = 'Direct';
  disabledValue = '';
  loopedValues = ['looped'];
}

// The select field watches its options with an effect of its own, not the one on `BaseOptionField`.
@Component({
  imports: [FormsModule, SelectField, FieldOption],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-select-field
      name="changing-select"
      ngModel>
      @for (value of loopedValues; track value) {
        <formidable-field-option
          [value]="value"
          [disabled]="disabledValue === value" />
      }
    </formidable-select-field>
  `
})
class ChangingSelectOptionHost {
  disabledValue = '';
  loopedValues = ['a', 'b'];
}

// An autocomplete, because its filter is what reads the label off the option — a group only displays it,
// and a displayed label comes from the projected template rather than from the option.
@Component({
  imports: [AutocompleteField, FieldOption],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-autocomplete-field name="projected-filter">
      <formidable-field-option value="a">Apple</formidable-field-option>
      <formidable-field-option value="b">Banana</formidable-field-option>
    </formidable-autocomplete-field>
  `
})
class ProjectedFilterHost {}

// The options are collected in a microtask, so a plain detectChanges() is not enough to see them.
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

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
      await TestBed.configureTestingModule({ imports: [WrappedOptionsHost] }).compileComponents();

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
      host.showConditional = false;
      host.loopedValues = ['looped-a'];
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
      await TestBed.configureTestingModule({ imports: [ProjectedContentHost] }).compileComponents();

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

      expect(host.field().value).toBe('a');
    });

    // The default `match` reads the option's own label, which for a projected option is the text taken
    // off its content. Lose that and every content-only option stops matching its own name.
    it('filters on the label taken from the projected content', fakeAsync(() => {
      const filterFixture = TestBed.createComponent(ProjectedFilterHost);
      filterFixture.detectChanges();
      tick();
      filterFixture.detectChanges();

      const filterInput = filterFixture.nativeElement.querySelector('input') as HTMLInputElement;
      filterInput.dispatchEvent(new Event('focus'));
      filterInput.value = 'app';
      filterInput.dispatchEvent(new Event('input'));
      tick(300); // clears the 200ms filter debounce
      filterFixture.detectChanges();

      expect(renderedOptionValues(filterFixture)).toEqual(['Apple']);

      discardPeriodicTasks();
      filterFixture.destroy();
    }));
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
      await TestBed.configureTestingModule({ imports: [ChangingOptionHost] }).compileComponents();

      fixture = TestBed.createComponent(ChangingOptionHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('follows a changed disabled flag, on a direct and on a looped option', async () => {
      host.disabledValue = 'looped';
      await settle(fixture);
      expect(disabledValues()).toEqual(['looped']);

      host.disabledValue = 'direct';
      await settle(fixture);
      expect(disabledValues()).toEqual(['Direct']);
    });

    it('follows a changed label', async () => {
      host.directLabel = 'Renamed';
      await settle(fixture);

      expect(renderedOptionValues(fixture)).toEqual(['Renamed', 'looped']);
    });

    it('collects an option added to the loop later', async () => {
      host.loopedValues = ['looped', 'added'];
      await settle(fixture);

      expect(renderedOptionValues(fixture)).toEqual(['Direct', 'looped', 'added']);
    });

    it('follows a changed disabled flag in a select field', async () => {
      const selectFixture = TestBed.createComponent(ChangingSelectOptionHost);
      await settle(selectFixture);

      selectFixture.componentInstance.disabledValue = 'b';
      await settle(selectFixture);

      const disabled = Array.from(selectFixture.nativeElement.querySelectorAll('option:disabled')).map(
        (el) => (el as HTMLOptionElement).value
      );
      expect(disabled).toEqual(['b']);
    });
  });

  describe('defaultOption', () => {
    let fixture: ComponentFixture<WrappedOptionsHost>;
    let host: WrappedOptionsHost;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [WrappedOptionsHost] }).compileComponents();

      fixture = TestBed.createComponent(WrappedOptionsHost);
      host = fixture.componentInstance;
    });

    it('is pinned first, ahead of the sortFn', async () => {
      host.defaultOption = { value: 'zzz-default' };
      host.sortFn = (a, b) => a.value.localeCompare(b.value);
      await settle(fixture);

      expect(renderedOptionValues(fixture)[0]).toBe('zzz-default');
    });

    it('is selectable and becomes the field value', async () => {
      host.defaultOption = { value: 'chosen-default' };
      await settle(fixture);

      host.field().selectOption(host.defaultOption);
      await settle(fixture);

      expect(host.field().value).toBe('chosen-default');
    });

    it('stays out of the list in the fallback mode while other options exist', async () => {
      host.defaultOption = { value: 'only-when-empty' };
      host.defaultOptionMode = 'fallback';
      await settle(fixture);

      expect(renderedOptionValues(fixture)).not.toContain('only-when-empty');
    });
  });

  // the autocomplete pins its default after filtering, so it has its own path worth covering
  describe('defaultOption on the autocomplete', () => {
    let fixture: ComponentFixture<FilteredAutocompleteHost>;
    let host: FilteredAutocompleteHost;

    const type = (text: string) => {
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('focus'));
      input.value = text;
      input.dispatchEvent(new Event('input'));
      tick(300); // clears the 200ms filter debounce
      fixture.detectChanges();
    };

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [FilteredAutocompleteHost] }).compileComponents();

      fixture = TestBed.createComponent(FilteredAutocompleteHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('shows a fallback default only once the filter matches nothing', fakeAsync(() => {
      type('cat');
      expect(renderedOptionValues(fixture)).toEqual(['Cat']);

      type('zzz');
      expect(renderedOptionValues(fixture)).toEqual(['Add a new one…']);

      discardPeriodicTasks();
    }));

    it('keeps an always default visible through a non-matching filter', fakeAsync(() => {
      host.defaultOptionMode = 'always';
      fixture.detectChanges();
      tick();

      type('zzz');

      expect(renderedOptionValues(fixture)).toEqual(['Add a new one…']);

      discardPeriodicTasks();
    }));

    it('does not deselect a chosen fallback default when the option list changes', fakeAsync(() => {
      type('zzz');
      host.field().selectOption(host.defaultOption);

      // an options change runs the reconcile pass, which drops any selection it cannot find
      host.options = [{ value: 'dog', label: 'Dog' }];
      fixture.detectChanges();
      tick(300);
      fixture.detectChanges();

      expect(host.field().value).toBe('add-new');

      discardPeriodicTasks();
    }));

    it('displays an externally written default value', fakeAsync(() => {
      host.field().writeValue('add-new');
      tick();
      fixture.detectChanges();

      expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).value).toBe('Add a new one…');

      discardPeriodicTasks();
    }));
  });

  describe('empty group', () => {
    let fixture: ComponentFixture<LoopedCheckboxHost>;
    let host: LoopedCheckboxHost;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [LoopedCheckboxHost] }).compileComponents();

      fixture = TestBed.createComponent(LoopedCheckboxHost);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('collects @for options in a checkbox group', () => {
      expect(renderedOptionValues(fixture)).toEqual(['a', 'b']);
    });

    it('renders the empty state as plain text rather than as an option', async () => {
      host.loopedValues = [];
      await settle(fixture);

      const field = fixture.nativeElement.querySelector('.field') as HTMLElement;

      expect(field.querySelectorAll('formidable-field-option').length).toBe(0);
      expect(field.querySelectorAll('input').length).toBe(0);
      expect(field.querySelector('.no-option')?.textContent?.trim()).toBe('Nothing here.');
    });
  });
});
