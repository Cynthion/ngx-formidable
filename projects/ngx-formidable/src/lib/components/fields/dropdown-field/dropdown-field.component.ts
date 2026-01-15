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
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { isPrintableCharacter } from '../../../helpers/input.helpers';
import { getNextAvailableOptionIndex } from '../../../helpers/option.helpers';
import {
  scrollHighlightedOptionIntoView,
  scrollIntoView,
  updatePanelPosition
} from '../../../helpers/position.helpers';
import {
  EMPTY_FIELD_OPTION,
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_FIELD_OPTION,
  FORMIDABLE_OPTION_FIELD,
  FormidablePanelPosition,
  IFormidableDropdownField,
  IFormidableFieldOption
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A configurable dropdown input.
 * Supports:
 * - `name`, `placeholder`, `readonly`, `disabled`
 * - `[options]`: IFormidableFieldOption[]
 * - `<formidable-field-option>` children
 * - `[emptyOption]`, `[sortFn]`
 * - `isPanelOpen` two-way
 * - `panelPosition: 'left'|'right'|'full'`

 * @example
 * ```html
 * <formidable-dropdown-field
 *   name="language"
 *   ngModel
 *   [options]="languageOptions"
 *   panelPosition="left"
 * >
 *   <!-- Optional inline options -->
 *   <formidable-field-option [value]="'en'" [label]="'English'"></formidable-field-option>
 *   <formidable-field-option [value]="'fr'" [label]="'French'"></formidable-field-option>
 * </formidable-dropdown-field>
 * ```
 */
@Component({
  selector: 'formidable-dropdown-field',
  templateUrl: './dropdown-field.component.html',
  styleUrls: ['./dropdown-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FieldOptionComponent],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: DropdownFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: DropdownFieldComponent
    }
  ]
})
export class DropdownFieldComponent
  extends BaseFieldDirective
  implements IFormidableDropdownField, OnInit, OnChanges, AfterContentInit, OnDestroy
{
  @ViewChild('dropdownRef', { static: true }) dropdownRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChildren('optionRef') optionRefs?: QueryList<FieldOptionComponent>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter'];

  private _value = '';
  private _highlightedValue: string | null = null;
  private _typedBuffer = '';

  private readonly cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  override ngOnInit(): void {
    super.ngOnInit();
    this.registerTypeahead();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // react to changes of @Input properties
    if (changes['options'] || changes['sortFn'] || changes['emptyOption']) {
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

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(isFocused: boolean): void {
    if (!isFocused) {
      this.resetTypeahead();
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    const options = this.options$.value;
    const count = options.length;

    switch (event.key) {
      case 'Escape':
      case 'Tab':
        if (this.isPanelOpen) this.togglePanel(false);
        break;
      case 'ArrowDown':
        if (!this.isPanelOpen) {
          this.togglePanel(true);
        } else if (count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex$.value, options, 'down'));
        }
        break;
      case 'ArrowUp':
        if (this.isPanelOpen && count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex$.value, options, 'up'));
        }
        break;
      case 'Enter':
        if (this.isPanelOpen && options[this.highlightedOptionIndex$.value]) {
          const option = options[this.highlightedOptionIndex$.value]!;
          this.selectOption(option);
        }
        break;
    }
  }

  private handleExternalClick(): void {
    if (!this.isPanelOpen) return;

    this.togglePanel(false);
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string): void {
    this._value = value ?? '';

    const found = this.computeAllOptions().find((opt) => opt.value === this._value);
    this.selectedOption = found ? { ...found } : undefined;

    // if the provided value doesn't exist in the options, treat it as empty display
    if (!this.selectedOption) {
      this._value = '';
    }

    // write to wrapped input element
    this.inputRef.nativeElement.value = this.selectedOption
      ? this.selectedOption.label || this.selectedOption.value
      : '';

    this.isFieldFilled = this.inputRef.nativeElement.value.length > 0;
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectedOption?.value || null;
  }

  get isLabelFloating(): boolean {
    const blocked = this.disabled || this.readonly;
    return !blocked && !this.isFieldFocused && !this.isFieldFilled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.dropdownRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  // #endregion

  // #region IFormidableDropdownField

  // empty

  // #endregion

  // #region IFormidableOptionField

  @Input() options?: IFormidableFieldOption[] = [];
  @Input() emptyOption: IFormidableFieldOption = EMPTY_FIELD_OPTION;
  @Input() sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number;

  @ContentChildren(FORMIDABLE_FIELD_OPTION)
  optionComponents?: QueryList<IFormidableFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormidableFieldOption[]>([]);
  protected readonly highlightedOptionIndex$ = new BehaviorSubject<number>(-1);
  private readonly typeahead$ = new BehaviorSubject<string>('');

  protected selectedOption?: IFormidableFieldOption = undefined;

  public selectOption(option: IFormidableFieldOption): void {
    if (option.disabled) return;

    const newOption: IFormidableFieldOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    // commit selection + update displayed label
    this.selectedOption = newOption;
    this.inputRef.nativeElement.value = this.selectedOption.label!; // update input value with selected option label

    // emit value change
    this.valueChangeSubject$.next(this.selectedOption.value);
    this.valueChanged.emit(this.selectedOption.value);
    this.isFieldFilled = this.selectedOption.value.length > 0;
    this.onChange(this.selectedOption.value); // notify ControlValueAccessor of the change
    this.onTouched();

    // simulate blur (field-state blur, not necessarily native blur)
    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.focusChanged.emit(false);

    // close panel
    this.togglePanel(false);
  }

  private deselectOption(opts: { clearInput?: boolean } = {}): void {
    // only do work if there actually was a selection
    if (!this.selectedOption) return;

    this.setHighlightedIndex(-1);
    this.selectedOption = undefined;
    this._value = '';

    if (opts.clearInput) {
      this.inputRef.nativeElement.value = '';
    }

    this.valueChangeSubject$.next(null);
    this.valueChanged.emit(null);
    this.isFieldFilled = this.inputRef.nativeElement.value.length > 0;
    this.onChange(null);
    this.onTouched();

    this.cdRef.markForCheck();
  }

  private onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateOptions(allOptions);
    this.reconcileSelectionAgainstOptions(allOptions);

    // keep highlight consistent if panel is open
    if (this.isPanelOpen) {
      this.reconcileHighlightAfterOptionsChanged();
      this.updatePanelPosition();
    }

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
    this.writeValue(this._value);
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableFieldOption[]): void {
    if (!this.selectedOption) return;

    const stillExists = allOptions.some((o) => o.value === this.selectedOption!.value);
    if (!stillExists) {
      // selection is no longer valid
      this.deselectOption({ clearInput: true });
    }
  }

  // #endregion

  // #region IFormidablePanelField

  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  @Input()
  get isPanelOpen(): boolean {
    return this._isPanelOpen;
  }
  set isPanelOpen(val: boolean) {
    this.togglePanel(val);
  }

  @Input() panelPosition: FormidablePanelPosition = 'full';

  private _isPanelOpen = false;

  /** Mousedown is used to prevent sending focusChanged events. */
  protected toggleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.inputRef.nativeElement.focus(); // ensure input remains focused, so keyboard events work
    this.togglePanel(!this.isPanelOpen);
  }

  panelMouseDown(event: MouseEvent): void {
    // Prevent blur when clicking inside the panel
    event.preventDefault();
  }

  protected togglePanel(isOpen: boolean): void {
    this._isPanelOpen = isOpen;

    // additional field specific behavior
    setTimeout(() => scrollIntoView(this.dropdownRef, this.panelRef, isOpen));

    if (isOpen) {
      this.highlightSelectedOption();
      updatePanelPosition(this.dropdownRef, this.panelRef);
    } else {
      this.resetTypeahead();
      this.setHighlightedIndex(-1);
    }

    this.cdRef.markForCheck();
  }

  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.dropdownRef, this.panelRef));
  }

  // #endregion

  private highlightSelectedOption(): void {
    const selectedIndex = this.options$.value.findIndex((opt) => opt.value === this.selectedOption?.value);

    this.setHighlightedIndex(selectedIndex);
  }

  private reconcileHighlightAfterOptionsChanged(): void {
    if (!this.isPanelOpen) return;

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

    // try keep previously highlighted value
    if (this._highlightedValue) {
      const keepIndex = options.findIndex((o) => o.value === this._highlightedValue);
      if (keepIndex >= 0) {
        this.setHighlightedIndex(keepIndex);
        return;
      }
    }

    // clamp old index into new bounds
    const prevHighlightIndex = this.highlightedOptionIndex$.value;

    let nextIndex = prevHighlightIndex;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= count) nextIndex = count - 1;

    // ensure not disabled
    if (options[nextIndex]?.disabled) {
      const fixed = getNextAvailableOptionIndex(nextIndex, options, 'down');
      nextIndex = fixed >= 0 ? fixed : getNextAvailableOptionIndex(nextIndex, options, 'up');
    }

    this.setHighlightedIndex(nextIndex >= 0 ? nextIndex : -1);
  }

  private setHighlightedIndex(index: number): void {
    this.highlightedOptionIndex$.next(index);

    const option = index >= 0 ? this.options$.value[index] : undefined;
    this._highlightedValue = option?.value ?? null;

    setTimeout(() => scrollHighlightedOptionIntoView(index, this.optionRefs));
  }

  private registerTypeahead(): void {
    this.typeahead$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(() => this.isFieldFocused),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.highlightFirstMatchingOption(term);
        this._typedBuffer = '';
      });
  }

  private highlightFirstMatchingOption(term: string): void {
    if (!term) return;

    if (!this.isPanelOpen) {
      this.togglePanel(true);
    }

    const matchIndex = this.options$.value.findIndex((opt) =>
      (opt.label || opt.value).toLowerCase().startsWith(term.toLowerCase())
    );

    this.setHighlightedIndex(matchIndex >= 0 ? matchIndex : -1);
  }

  protected onTypeaheadKeydown(event: KeyboardEvent): void {
    if (isPrintableCharacter(event) && !this.readonly && !this.disabled) {
      this._typedBuffer += event.key;
      this.typeahead$.next(this._typedBuffer);

      if (!this.isPanelOpen) {
        this.togglePanel(true);
      }
    } else if (event.key === 'Backspace') {
      this._typedBuffer = this._typedBuffer.slice(0, -1);
      this.typeahead$.next(this._typedBuffer);
    }
  }

  private resetTypeahead(): void {
    this._typedBuffer = '';
    this.typeahead$.next('');
  }
}
