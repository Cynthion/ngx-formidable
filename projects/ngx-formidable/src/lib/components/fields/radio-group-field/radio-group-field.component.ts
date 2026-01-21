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
  IFormidableFieldOption,
  IFormidableRadioGroupField,
  NO_OPTIONS_TEXT
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A configurable group of selectable radio options.
 * Supports:
 * - `name`, `readonly`, `disabled`
 * - `[options]`: IFormidableFieldOption[]
 * - `<formidable-field-option>` children
 * - `[noOptionText]`, `[sortFn]`
 *
 * @example
 * ```html
 * <formidable-radio-group-field name="allergies" ngModel [options]="allergyOptions">
 *   <!-- Optional inline options -->
 *   <formidable-field-option [value]="'nuts'" [label]="'Nuts'"></formidable-field-option>
 * </formidable-radio-group-field>
 * ```
 */
@Component({
  selector: 'formidable-radio-group-field',
  templateUrl: './radio-group-field.component.html',
  styleUrls: ['./radio-group-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FieldOptionComponent],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: RadioGroupFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: RadioGroupFieldComponent
    }
  ]
})
export class RadioGroupFieldComponent
  extends BaseFieldDirective<string | null>
  implements IFormidableRadioGroupField, OnInit, OnChanges, AfterContentInit, OnDestroy
{
  @ViewChild('radioGroupRef', { static: true }) radioGroupRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('optionRef') optionRefs?: QueryList<FieldOptionComponent>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter'];

  private _writtenValue: string | null = null;
  private _highlightedValue: string | null = null;

  private readonly cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

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

  protected doWriteValue(value: string | null): void {
    this._writtenValue = value ?? null;

    const found = this.computeAllOptions().find((opt) => opt.value === value);
    this.selectedOption = found ? { ...found } : undefined;

    this.isFieldFilled = !!this.selectedOption?.value;
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectedOption?.value || null;
  }

  override get isLabelFloating(): boolean {
    return false;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.radioGroupRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'group';

  // #endregion

  // #region IFormidableRadioGroupField

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

  private selectedOption?: IFormidableFieldOption = undefined;

  public selectOption(option: IFormidableFieldOption): void {
    if (option.disabled) return;

    const newOption: IFormidableFieldOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    // commit selection
    this.selectedOption = newOption;
    this._writtenValue = newOption.value;

    // emit value change
    const newValue = this.selectedOption.value;
    this.valueChangeSubject$.next(newValue);
    this.valueChanged.emit(newValue);
    this.isFieldFilled = newValue.length > 0;
    this.onChange(newValue); // notify ControlValueAccessor of the change
    this.onTouched();

    // immediately highlight the selected option
    this.highlightSelectedOption();

    this.cdRef.markForCheck();
  }

  private deselectOption(): void {
    // only do work if there actually was a selection
    if (!this.selectedOption) return;

    this.setHighlightedIndex(-1);
    this.selectedOption = undefined;

    this._writtenValue = null;
    this.isFieldFilled = false;

    this.valueChangeSubject$.next(null);
    this.valueChanged.emit(null);
    this.onChange(null);
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
    this.writeValue(this._writtenValue);
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableFieldOption[]): void {
    if (!this.selectedOption) return;

    const stillExists = allOptions.some((o) => o.value === this.selectedOption!.value);
    if (!stillExists) {
      this.deselectOption();
    }
  }

  // #endregion

  private highlightSelectedOption(): void {
    const selectedIndex = this.options$.value.findIndex((opt) => opt.value === this.selectedOption?.value);

    this.setHighlightedIndex(selectedIndex);
  }

  private reconcileHighlightAfterOptionsChanged(): void {
    const options = this.options$.value;
    const count = options.length;

    // empty list
    if (count === 0) {
      this.setHighlightedIndex(-1);
      return;
    }

    // selection wins
    if (this.selectedOption) {
      const selectedIndex = options.findIndex((o) => o.value === this.selectedOption!.value);
      if (selectedIndex >= 0) {
        this.setHighlightedIndex(selectedIndex);
        return;
      }
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
