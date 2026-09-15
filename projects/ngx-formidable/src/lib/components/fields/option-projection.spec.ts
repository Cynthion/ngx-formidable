import { NgTemplateOutlet } from '@angular/common';
import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IFormidableOption } from '../../models/formidable.model';
import { FieldOptionComponent } from '../field-option/field-option.component';
import { AutocompleteFieldComponent } from './autocomplete-field/autocomplete-field.component';
import { CheckboxGroupFieldComponent } from './checkbox-group-field/checkbox-group-field.component';
import { RadioGroupFieldComponent } from './radio-group-field/radio-group-field.component';

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
  imports: [FormsModule, NgTemplateOutlet, RadioGroupFieldComponent, FieldOptionComponent],
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

      <ng-container *ngTemplateOutlet="templated"></ng-container>
      <ng-template #templated>
        <formidable-field-option value="templated" />
      </ng-template>

      <div class="option-group">
        <formidable-field-option value="nested" />
      </div>
    </formidable-radio-group-field>
  `
})
class WrappedOptionsHostComponent {
  @ViewChild(RadioGroupFieldComponent, { static: true }) field!: RadioGroupFieldComponent;

  showConditional = true;
  loopedValues = ['looped-a', 'looped-b'];
  defaultOption?: IFormidableOption;
  defaultOptionMode: 'always' | 'fallback' = 'always';
  sortFn?: (a: IFormidableOption, b: IFormidableOption) => number;
}

@Component({
  imports: [FormsModule, CheckboxGroupFieldComponent, FieldOptionComponent],
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
class LoopedCheckboxHostComponent {
  @ViewChild(CheckboxGroupFieldComponent, { static: true }) field!: CheckboxGroupFieldComponent;

  loopedValues: string[] = ['a', 'b'];
  noOptionsText = 'Nothing here.';
}

// deliberately without ngModel: NgModel writes its own (empty) model back on every change detection,
// which would clear the selection this suite is about
@Component({
  imports: [AutocompleteFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-autocomplete-field
      name="filtered"
      [options]="options"
      [defaultOption]="defaultOption"
      [defaultOptionMode]="defaultOptionMode" />
  `
})
class FilteredAutocompleteHostComponent {
  @ViewChild(AutocompleteFieldComponent, { static: true }) field!: AutocompleteFieldComponent;

  options: IFormidableOption[] = [{ value: 'cat', label: 'Cat' }];
  defaultOption: IFormidableOption = { value: 'add-new', label: 'Add a new one…' };
  defaultOptionMode: 'always' | 'fallback' = 'fallback';
}

@Component({
  imports: [FormsModule, RadioGroupFieldComponent, FieldOptionComponent],
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
class ProjectedContentHostComponent {
  @ViewChild(RadioGroupFieldComponent, { static: true }) field!: RadioGroupFieldComponent;
}

// An autocomplete, because its filter is what reads the label off the option — a group only displays it,
// and a displayed label comes from the projected template rather than from the option.
@Component({
  imports: [AutocompleteFieldComponent, FieldOptionComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-autocomplete-field name="projected-filter">
      <formidable-field-option value="a">Apple</formidable-field-option>
      <formidable-field-option value="b">Banana</formidable-field-option>
    </formidable-autocomplete-field>
  `
})
class ProjectedFilterHostComponent {}

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
    let fixture: ComponentFixture<WrappedOptionsHostComponent>;
    let host: WrappedOptionsHostComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [WrappedOptionsHostComponent] }).compileComponents();

      fixture = TestBed.createComponent(WrappedOptionsHostComponent);
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
   * The option a field reads off a projected component is `FieldOptionComponent.option` — one plain
   * `IFormidableOption` folded out of its signal inputs and its projected content. These two claims are the
   * whole boundary: the label falls back to the projected text, and the default `select` the computed
   * resolves is what commits when the rendered option is clicked.
   */
  describe('the option a component hands over', () => {
    let fixture: ComponentFixture<ProjectedContentHostComponent>;
    let host: ProjectedContentHostComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [ProjectedContentHostComponent] }).compileComponents();

      fixture = TestBed.createComponent(ProjectedContentHostComponent);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('renders the projected content, and the bound label where there is no content', () => {
      expect(renderedOptionValues(fixture)).toEqual(['Apple', 'Bound Banana']);
    });

    it('commits through the select the option resolves for itself', async () => {
      const option = fixture.nativeElement.querySelectorAll('formidable-field-option')[0] as HTMLElement;

      // The `(click)` sits on the option's inner div, which is what the field renders.
      option.querySelector('div')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);

      expect(host.field.value).toBe('a');
    });

    // The default `match` reads the option's own label, which for a projected option is the text taken
    // off its content. Lose that and every content-only option stops matching its own name.
    it('filters on the label taken from the projected content', fakeAsync(() => {
      const filterFixture = TestBed.createComponent(ProjectedFilterHostComponent);
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

  describe('defaultOption', () => {
    let fixture: ComponentFixture<WrappedOptionsHostComponent>;
    let host: WrappedOptionsHostComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [WrappedOptionsHostComponent] }).compileComponents();

      fixture = TestBed.createComponent(WrappedOptionsHostComponent);
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

      host.field.selectOption(host.defaultOption);
      await settle(fixture);

      expect(host.field.value).toBe('chosen-default');
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
    let fixture: ComponentFixture<FilteredAutocompleteHostComponent>;
    let host: FilteredAutocompleteHostComponent;

    const type = (text: string) => {
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      input.dispatchEvent(new Event('focus'));
      input.value = text;
      input.dispatchEvent(new Event('input'));
      tick(300); // clears the 200ms filter debounce
      fixture.detectChanges();
    };

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [FilteredAutocompleteHostComponent] }).compileComponents();

      fixture = TestBed.createComponent(FilteredAutocompleteHostComponent);
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
      host.field.selectOption(host.defaultOption);

      // an options change runs the reconcile pass, which drops any selection it cannot find
      host.options = [{ value: 'dog', label: 'Dog' }];
      fixture.detectChanges();
      tick(300);
      fixture.detectChanges();

      expect(host.field.value).toBe('add-new');

      discardPeriodicTasks();
    }));

    it('displays an externally written default value', fakeAsync(() => {
      host.field.writeValue('add-new');
      tick();
      fixture.detectChanges();

      expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).value).toBe('Add a new one…');

      discardPeriodicTasks();
    }));
  });

  describe('empty group', () => {
    let fixture: ComponentFixture<LoopedCheckboxHostComponent>;
    let host: LoopedCheckboxHostComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [LoopedCheckboxHostComponent] }).compileComponents();

      fixture = TestBed.createComponent(LoopedCheckboxHostComponent);
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
