import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { getNextAvailableOptionIndex } from '../../../helpers/option.helpers';
import { scrollHighlightedOptionIntoView } from '../../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_FIELD_OPTION,
  FORMIDABLE_OPTION_FIELD,
  IFormidableCheckboxGroupField,
  IFormidableFieldOption,
  NO_OPTIONS_TEXT
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A configurable group of selectable checkbox options.
 * Supports:
 * - `name`, `readonly`, `disabled`
 * - `[options]`: IFormidableFieldOption[]
 * - `<formidable-field-option>` children
 * - `[noOptionText]`, `[sortFn]`
 *
 * @example
 * ```html
 * <formidable-checkbox-group-field name="allergies" ngModel [options]="allergyOptions">
 *   <!-- Optional inline options -->
 *   <formidable-field-option [value]="'nuts'" [label]="'Nuts'"></formidable-field-option>
 * </formidable-checkbox-group-field>
 * ```
 */
@Component({
  selector: 'formidable-checkbox-group-field',
  templateUrl: './checkbox-group-field.component.html',
  styleUrls: ['./checkbox-group-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FieldOptionComponent],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxGroupFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: CheckboxGroupFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: CheckboxGroupFieldComponent
    }
  ]
})
export class CheckboxGroupFieldComponent
  extends BaseFieldDirective<string[]>
  implements IFormidableCheckboxGroupField, OnInit, OnChanges, AfterContentInit, OnDestroy
{
  @ViewChild('checkboxGroupRef', { static: true }) checkboxGroupRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('optionRef') optionRefs?: QueryList<FieldOptionComponent>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter'];

  private _writtenValues: string[] = [];
  private _highlightedValue: string | null = null;

  private readonly cdRef = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    // react to changes of @Input properties
    if (changes['options'] || changes['sortFn']) {
      queueMicrotask(() => this.onOptionsChanged());
    }
  }

  ngAfterContentInit(): void {
    // The projected options (option.template) might not be available immediately after content initialization,
    // so we use queueMicrotask to ensure they are processed after the current change detection cycle.
    queueMicrotask(() => this.onOptionsChanged());

    // react to the changes of projected options
    this.optionComponents?.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => queueMicrotask(() => this.onOptionsChanged()));
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  private handleKeydown(event: KeyboardEvent): void {
    const options = this.options$.value;
    const count = options.length;

    switch (event.key) {
      case 'ArrowDown':
        if (count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex$.value, options, 'down'));
        }
        break;
      case 'ArrowUp':
        if (count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex$.value, options, 'up'));
        }
        break;
      case 'Enter': {
        const idx = this.highlightedOptionIndex$.value;
        const option = this.options$.value[idx];
        if (option) this.selectOption(option);
        break;
      }
    }
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string[]): void {
    this._writtenValues = Array.isArray(value) ? value : [];
    this.isFieldFilled = this._writtenValues.length > 0;
    this.cdRef.markForCheck();
  }

  // #endregion

  // #region IFormidableField

  get value(): string[] {
    return this._writtenValues;
  }

  override get isLabelFloating(): boolean {
    return false;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.checkboxGroupRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'group';

  // #endregion

  // #region IFormidableCheckboxGroupField

  // empty

  // #endregion

  // #region IFormidableOptionField

  @Input() options?: IFormidableFieldOption[] = [];
  @Input() noOptionsText: string = NO_OPTIONS_TEXT;
  @Input() sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number;

  @ContentChildren(FORMIDABLE_FIELD_OPTION)
  optionComponents?: QueryList<IFormidableFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormidableFieldOption[]>([]);
  protected readonly highlightedOptionIndex$ = new BehaviorSubject<number>(-1);

  public selectOption(option: IFormidableFieldOption): void {
    if (option.disabled) return;

    const curr = this._writtenValues;
    const exists = curr.includes(option.value);

    const next = exists ? curr.filter((v) => v !== option.value) : [...curr, option.value];

    // commit selection
    this._writtenValues = next;

    // emit value change
    this.valueChangeSubject$.next(next);
    this.valueChanged.emit(next);
    this.isFieldFilled = next.length > 0;
    this.onChange(next); // notify ControlValueAccessor of the change
    this.onTouched();

    this.cdRef.markForCheck();
  }

  private onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateOptions(allOptions);
    this.reconcileSelectionAgainstOptions(allOptions);
    this.reconcileHighlightAfterOptionsChanged(); // (block 4)

    this.cdRef.markForCheck();
  }

  private computeAllOptions(): IFormidableFieldOption[] {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    let combined = [...inlineOptions, ...projectedOptions];

    if (this.sortFn) {
      combined = [...combined].sort(this.sortFn);
    }

    return combined;
  }

  private updateOptions(allOptions: IFormidableFieldOption[]): void {
    this.options$.next(allOptions);

    // keep current value in sync with newly combined options
    this.writeValue(this._writtenValues);
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableFieldOption[]): void {
    if (!this._writtenValues.length) return;

    const allowed = new Set(allOptions.map((o) => o.value));
    const filtered = this._writtenValues.filter((v) => allowed.has(v));

    if (filtered.length === this._writtenValues.length) return; // no change

    // commit
    this._writtenValues = filtered;

    // emit like other fields when selection becomes invalid
    this.valueChangeSubject$.next(filtered);
    this.valueChanged.emit(filtered);
    this.isFieldFilled = filtered.length > 0;
    this.onChange(filtered);
    this.onTouched();

    this.cdRef.markForCheck();
  }

  // #endregion

  protected isChecked(value: string): boolean {
    return this._writtenValues.includes(value);
  }

  private reconcileHighlightAfterOptionsChanged(): void {
    const options = this.options$.value;
    const count = options.length;

    // empty list
    if (count === 0) {
      this.setHighlightedIndex(-1);
      return;
    }

    // try keep previous highlighted value
    if (this._highlightedValue) {
      const keepIndex = options.findIndex((o) => o.value === this._highlightedValue);
      if (keepIndex >= 0) {
        this.setHighlightedIndex(keepIndex);
        return;
      }
    }

    // clamp previous index into new bounds
    const prevHighlightIndex = this.highlightedOptionIndex$.value;

    let nextIndex = prevHighlightIndex;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= count) nextIndex = count - 1;

    // skip disabled
    if (options[nextIndex]?.disabled) {
      const fixed = getNextAvailableOptionIndex(nextIndex, options, 'down');
      nextIndex = fixed >= 0 ? fixed : getNextAvailableOptionIndex(nextIndex, options, 'up');
    }

    this.setHighlightedIndex(nextIndex >= 0 ? nextIndex : -1);
  }

  private setHighlightedIndex(index: number): void {
    this.highlightedOptionIndex$.next(index);

    const opt = index >= 0 ? this.options$.value[index] : undefined;
    this._highlightedValue = opt?.value ?? null;

    setTimeout(() => scrollHighlightedOptionIntoView(index, this.optionRefs));
  }
}
