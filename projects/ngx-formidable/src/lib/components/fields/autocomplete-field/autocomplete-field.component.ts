import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { setCaretPositionToEnd } from '../../../helpers/input.helpers';
import { getNextAvailableOptionIndex } from '../../../helpers/option.helpers';
import {
  scrollHighlightedOptionIntoView,
  scrollIntoView,
  updatePanelPosition
} from '../../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_FIELD_OPTION,
  FORMIDABLE_OPTION_FIELD,
  FormidablePanelPosition,
  IFormidableAutocompleteField,
  IFormidableFieldOption,
  NO_OPTIONS_TEXT
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A configurable text input with an overlayed list of filtered options.
 * Supports:
 * - `name`, `placeholder`, `readonly`, `disabled`
 * - `[options]`: IFormidableFieldOption[]
 * - `<formidable-field-option>` children
 * - `[noOptionText]`, `[sortFn]`
 * - `isPanelOpen` two-way
 * - `panelPosition: 'left'|'right'|'full'`
 *
 * @example
 * ```html
 * <formidable-autocomplete-field
 *   name="hobby"
 *   ngModel
 *   [options]="hobbyOptions"
 * >
 *   <!-- Optional inline options -->
 *   <formidable-field-option [value]="'reading'" [label]="'Reading'"></formidable-field-option>
 *   <formidable-field-option [value]="'gaming'" [label]="'Gaming'"></formidable-field-option>
 * </formidable-autocomplete-field>
 * ```
 */
@Component({
  selector: 'formidable-autocomplete-field',
  templateUrl: './autocomplete-field.component.html',
  styleUrls: ['./autocomplete-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FieldOptionComponent],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutocompleteFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: AutocompleteFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: AutocompleteFieldComponent
    }
  ]
})
export class AutocompleteFieldComponent
  extends BaseFieldDirective
  implements IFormidableAutocompleteField, OnInit, OnChanges, AfterContentInit, OnDestroy
{
  @ViewChild('autocompleteRef', { static: true }) autocompleteRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChildren('optionRef') optionRefs?: QueryList<FieldOptionComponent>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter'];

  protected filterChangeSubject$ = new BehaviorSubject<string>('');

  // private _value = '';
  private _highlightedValue: string | null = null;

  private readonly cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  override ngOnInit(): void {
    super.ngOnInit();
    this.registerAutocomplete();
  }

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

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';

    this.filterChangeSubject$.next(value);
    this.filterChanged.emit(value);

    this.isFieldFilled = value.length > 0;
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(isFocused: boolean): void {
    if (!isFocused) {
      this._highlightedValue = null;
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    const options = this.filteredOptions$.value;
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
    // this._value = value ?? '';

    const found = this.computeAllOptions().find((opt) => opt.value === value);
    this.selectedOption = found ? { ...found } : undefined;

    // if the provided value doesn't exist in the options, treat it as empty display
    if (!this.selectedOption) {
      // this._value = '';
    }

    // write to wrapped input element
    this.inputRef.nativeElement.value = this.selectedOption
      ? this.selectedOption.label || this.selectedOption.value
      : '';

    this.isFieldFilled = this.inputRef.nativeElement.value.length > 0;

    // keep filter/list consistent with displayed value
    this.filterChangeSubject$.next(this.inputRef.nativeElement.value);
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
    return this.autocompleteRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  // #endregion

  // #region IFormidableAutocompleteField

  public filterChange$ = this.filterChangeSubject$.asObservable();

  @Output() filterChanged = new EventEmitter<string>();

  // #endregion

  // #region IFormidableOptionField

  @Input() options?: IFormidableFieldOption[] = [];
  @Input() noOptionsText: string = NO_OPTIONS_TEXT;
  @Input() sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number;

  @ContentChildren(FORMIDABLE_FIELD_OPTION)
  optionComponents?: QueryList<IFormidableFieldOption>;

  protected readonly filteredOptions$ = new BehaviorSubject<IFormidableFieldOption[]>([]);
  protected readonly highlightedOptionIndex$ = new BehaviorSubject<number>(-1);

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

    // move caret to end of input
    setCaretPositionToEnd(this.inputRef.nativeElement);
  }

  private deselectOption(opts: { clearInput?: boolean } = {}): void {
    // only do work if there actually was a selection
    if (!this.selectedOption) return;

    this.setHighlightedIndex(-1);
    this.selectedOption = undefined;

    if (opts.clearInput) {
      this.inputRef.nativeElement.value = '';
      this.filterChangeSubject$.next(''); // optional: keeps filter + list consistent
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

    this.updateFilteredOptions(allOptions);
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

  private updateFilteredOptions(allOptions: IFormidableFieldOption[]): void {
    const filterValue = this.filterChangeSubject$.value;

    const filteredOptions = filterValue
      ? allOptions.filter((opt) =>
          opt.match ? opt.match(filterValue) : opt.label?.toLowerCase().includes(filterValue.toLowerCase())
        )
      : allOptions;

    this.filteredOptions$.next(filteredOptions);
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

  protected togglePanel(isOpen: boolean): void {
    this._isPanelOpen = isOpen;

    // additional field specific behavior
    setTimeout(() => scrollIntoView(this.autocompleteRef, this.panelRef, isOpen));

    if (isOpen) {
      this.highlightSelectedOption();
      updatePanelPosition(this.autocompleteRef, this.panelRef);
    } else {
      this._highlightedValue = null;
      this.setHighlightedIndex(-1);
    }

    this.cdRef.markForCheck();
  }

  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.autocompleteRef, this.panelRef));
  }

  // #endregion

  private highlightSelectedOption(): void {
    const selectedIndex = this.filteredOptions$.value.findIndex((opt) => opt.value === this.selectedOption?.value);

    this.setHighlightedIndex(selectedIndex);
  }

  private reconcileHighlightAfterOptionsChanged(): void {
    if (!this.isPanelOpen) return;

    const options = this.filteredOptions$.value;
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

    const option = index >= 0 ? this.filteredOptions$.value[index] : undefined;
    this._highlightedValue = option?.value ?? null;

    setTimeout(() => scrollHighlightedOptionIntoView(index, this.optionRefs));
  }

  private registerAutocomplete(): void {
    this.filterChangeSubject$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(() => this.isFieldFocused),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const typed = this.inputRef.nativeElement.value ?? '';
        const selectedLabel = this.selectedOption?.label ?? '';

        // only deselect if the user actually diverged from the selected label
        if (this.selectedOption && typed !== selectedLabel) {
          this.deselectOption(); // no clearInput
        }

        const allOptions = this.computeAllOptions();

        this.updateFilteredOptions(allOptions);
        this.tryAutoSelectExactValue(allOptions);

        if (!this.isPanelOpen) {
          this.togglePanel(true);
        } else {
          this.updatePanelPosition();
        }
      });
  }

  private tryAutoSelectExactValue(allOptions: IFormidableFieldOption[]): void {
    const typed = this.inputRef.nativeElement.value;
    if (!typed) return;

    const match = allOptions.find((o) => !o.disabled && o.label === typed);
    if (!match) return;

    this.selectOption(match);
  }
}
