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
  OnDestroy,
  OnInit,
  Output,
  QueryList,
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
  EMPTY_FIELD_OPTION,
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_FIELD_OPTION,
  FORMIDABLE_OPTION_FIELD,
  FormidablePanelPosition,
  IFormidableAutocompleteField,
  IFormidableFieldOption
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A configurable text input with an overlayed list of filtered options.
 * Supports:
 * - `name`, `placeholder`, `readonly`, `disabled`
 * - `[options]`: IFormidableFieldOption[]
 * - `<formidable-field-option>` children
 * - `[emptyOption]`, `[sortFn]`
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
  implements IFormidableAutocompleteField, OnInit, AfterContentInit, OnDestroy
{
  @ViewChild('autocompleteRef', { static: true }) autocompleteRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChildren('optionRef') optionRefs?: QueryList<FieldOptionComponent>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter'];

  protected filterChangeSubject$ = new BehaviorSubject<string>('');

  private readonly cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  override ngOnInit(): void {
    super.ngOnInit();
    this.registerAutocomplete();
  }

  ngAfterContentInit(): void {
    // The projected options (option.template) might not be available immediately after content initialization,
    // so we use setTimeout to ensure they are processed after the current change detection cycle.
    setTimeout(() => {
      this.updateFilteredOptions();
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();

    this.destroy$.next();
    this.destroy$.complete();
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

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
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

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    const found = this.combineAllOptions().find((opt) => opt.value === value);

    this.selectedOption = found ? { ...found } : undefined;
    this.isFieldFilled = found ? !!value : false;

    // write to wrapped input element
    this.inputRef.nativeElement.value = found ? found.label || found.value : '';
  }

  //#endregion

  //#region IFormidableField

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

  //#endregion

  //#region IFormidableAutocompleteField

  public filterChange$ = this.filterChangeSubject$.asObservable();

  @Output() filterChanged = new EventEmitter<string>();

  //#endregion

  //#region IFormidableOptionField

  @Input() options?: IFormidableFieldOption[] = [];
  @Input() emptyOption: IFormidableFieldOption = EMPTY_FIELD_OPTION;
  @Input() sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number;

  @ContentChildren(FORMIDABLE_FIELD_OPTION)
  optionComponents?: QueryList<IFormidableFieldOption>;

  protected readonly filteredOptions$ = new BehaviorSubject<IFormidableFieldOption[]>([]);
  protected readonly highlightedOptionIndex$ = new BehaviorSubject<number>(-1);

  private selectedOption?: IFormidableFieldOption = undefined;

  public selectOption(option: IFormidableFieldOption): void {
    if (option.disabled) return;

    const newOption: IFormidableFieldOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    this.selectedOption = newOption;
    this.inputRef.nativeElement.value = this.selectedOption.label!; // update input value with selected option label

    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.focusChanged.emit(false);
    this.valueChangeSubject$.next(this.selectedOption.value);
    this.valueChanged.emit(this.selectedOption.value);
    this.isFieldFilled = this.selectedOption.value.length > 0;
    this.onChange(this.selectedOption.value); // notify ControlValueAccessor of the change
    this.onTouched();
    this.togglePanel(false);
    setCaretPositionToEnd(this.inputRef.nativeElement);
  }

  private deselectOption(): void {
    this.setHighlightedIndex(-1);
    this.selectedOption = undefined;
    this.onChange(null);
  }

  private combineAllOptions(): IFormidableFieldOption[] {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    let combined = [...inlineOptions, ...projectedOptions];

    if (this.sortFn) {
      combined = [...combined].sort(this.sortFn);
    }

    return combined;
  }

  private updateFilteredOptions(): void {
    const filterValue = this.filterChangeSubject$.value;

    const allOptions = this.combineAllOptions();

    const filteredOptions = filterValue
      ? allOptions.filter((opt) =>
          opt.match ? opt.match(filterValue) : opt.label?.toLowerCase().includes(filterValue.toLowerCase())
        )
      : allOptions;

    this.filteredOptions$.next(filteredOptions);
  }

  //#endregion

  //#region IFormidablePanelField

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
      this.setHighlightedIndex(-1);
    }

    this.cdRef.markForCheck();
  }

  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.autocompleteRef, this.panelRef));
  }

  //#endregion

  private highlightSelectedOption(): void {
    const selectedIndex = this.filteredOptions$.value.findIndex((opt) => opt.value === this.selectedOption?.value);

    this.setHighlightedIndex(selectedIndex);
  }

  private setHighlightedIndex(index: number): void {
    this.highlightedOptionIndex$.next(index);

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
        this.deselectOption();
        this.updateFilteredOptions();

        this.tryAutoSelectExactValue();

        if (!this.isPanelOpen) {
          this.togglePanel(true);
        } else {
          this.updatePanelPosition();
        }
      });
  }

  private tryAutoSelectExactValue() {
    const typed = this.inputRef.nativeElement.value;
    if (!typed) return;

    const options = this.combineAllOptions();
    const match = options.find((o) => !o.disabled && o.label === typed);
    if (!match) return;

    this.selectOption(match);
  }
}
