import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { setCaretPositionToEnd } from '../../../helpers/input.helpers';
import { applyDefaultOption, combineFieldOptions, getNextAvailableOptionIndex } from '../../../helpers/option.helpers';
import { scrollIntoView, updatePanelPosition } from '../../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FieldOptionRole,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
  FormidablePanelPosition,
  IFormidableAutocompleteField,
  IFormidableFieldOption
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseOptionFieldDirective } from '../base-option-field.directive';

/**
 * A configurable text input with an overlayed list of filtered options.
 * Supports:
 * - `name`, `placeholder`, `readonly`, `disabled`
 * - `[options]`: IFormidableFieldOption[]
 * - `<formidable-field-option>` children
 * - `[noOptionText]`, `[sortFn]`
 * - `isPanelOpen` two-way
 * - `panelPosition: 'left'|'right'|'full'|'sheet'`
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
  extends BaseOptionFieldDirective<string | null>
  implements IFormidableAutocompleteField, OnInit
{
  @ViewChild('autocompleteRef', { static: true }) autocompleteRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter'];

  protected filterChangeSubject$ = new BehaviorSubject<string>('');

  private _writtenValue: string | null = null;

  override ngOnInit(): void {
    super.ngOnInit();
    this.registerAutocomplete();
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
      this.highlightedOptionValue = null;
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
      case 'Enter': {
        if (!this.isPanelOpen) return;
        const idx = this.highlightedOptionIndex$.value;
        const option = this.filteredOptions$.value[idx];
        if (option) this.selectOption(option);
        break;
      }
    }
  }

  private handleExternalClick(): void {
    if (!this.isPanelOpen) return;

    this.togglePanel(false);
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string | null): void {
    this._writtenValue = value ?? null;

    const found = this.computeSelectableOptions(this.computeAllOptions()).find(
      (opt) => opt.value === this._writtenValue
    );
    this.selectedOption = found ? { ...found } : undefined;

    // write to wrapped input element — if the option isn't found yet (options may not be
    // loaded), the input stays empty; _writtenValue is kept so onOptionsChanged re-applies it
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

  get fieldRef(): ElementRef<HTMLElement> {
    return this.autocompleteRef as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef.nativeElement;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region IFormidableAutocompleteField

  public filterChange$ = this.filterChangeSubject$.asObservable();

  @Output() filterChanged = new EventEmitter<string>();

  // #endregion

  // #region IFormidableOptionField

  public readonly optionRole: FieldOptionRole = 'option';

  protected readonly filteredOptions$ = new BehaviorSubject<IFormidableFieldOption[]>([]);

  protected selectedOption?: IFormidableFieldOption = undefined;

  protected get activeOptions(): IFormidableFieldOption[] {
    return this.filteredOptions$.value;
  }

  protected override get selectedOptionValue(): string | null {
    return this.selectedOption?.value ?? null;
  }

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
    this.touch();

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
    this._writtenValue = null; // clear pending value so it isn't re-applied when options change

    if (opts.clearInput) {
      this.inputRef.nativeElement.value = '';
      this.filterChangeSubject$.next(''); // optional: keeps filter + list consistent
    }

    this.valueChangeSubject$.next(null);
    this.valueChanged.emit(null);
    this.isFieldFilled = this.inputRef.nativeElement.value.length > 0;
    this.onChange(null);
    this.touch();

    this.cdRef.markForCheck();
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateFilteredOptions(allOptions);

    // Only re-apply the written value when there actually is one. Calling writeValue(null)
    // would clear the native input and reset the filter subject, erasing the user's typed
    // text whenever the option list refreshes (e.g. during fuzzy-search updates).
    if (this._writtenValue !== null) {
      this.writeValue(this._writtenValue);
    }

    // A changed options list is not the user, so the reconcile may correct the model but not touch.
    this.runSilently(() => this.reconcileSelectionAgainstOptions(this.computeSelectableOptions(allOptions)));

    // keep highlight consistent if panel is open
    if (this.isPanelOpen) {
      this.reconcileHighlightAfterOptionsChanged();
      this.updatePanelPosition();
    }

    this.cdRef.markForCheck();
  }

  private computeAllOptions(): IFormidableFieldOption[] {
    return combineFieldOptions(this.options, this.optionComponents?.toArray(), this.sortFn);
  }

  /**
   * A configured default option is always selectable, whatever its mode: in `fallback` mode whether it
   * renders depends on the current filter, so excluding it here would deselect it on the next keystroke.
   */
  private computeSelectableOptions(allOptions: IFormidableFieldOption[]): IFormidableFieldOption[] {
    return this.defaultOption ? [this.defaultOption, ...allOptions] : allOptions;
  }

  private updateFilteredOptions(allOptions: IFormidableFieldOption[]): void {
    const filterValue = this.filterChangeSubject$.value;

    const filteredOptions = filterValue
      ? allOptions.filter((opt) =>
          opt.match ? opt.match(filterValue) : opt.label?.toLowerCase().includes(filterValue.toLowerCase())
        )
      : allOptions;

    // the default option is pinned after filtering, so an `always` default survives a non-matching filter
    this.filteredOptions$.next(applyDefaultOption(filteredOptions, this.defaultOption, this.defaultOptionMode));
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

    // Reads the panel's box, so it has to wait for the open state to render — a microtask would run
    // before change detection.
    setTimeout(() => scrollIntoView(this.autocompleteRef, this.panelRef, isOpen));

    if (isOpen) {
      this.highlightSelectedOption();
      // Synchronous on purpose: a closed panel is `visibility: hidden`, not `display: none`, so it is
      // already laid out and measurable. Deferring would flip it after paint, which is a visible jump.
      updatePanelPosition(this.autocompleteRef, this.panelRef);
    } else {
      this.setHighlightedIndex(-1);
    }

    this.cdRef.markForCheck();
  }

  /** Deferred, unlike the call in `togglePanel`: the option list changed, so the panel's height is only
   * correct once change detection has rendered it. */
  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.autocompleteRef, this.panelRef));
  }

  // #endregion

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
        this.tryAutoSelectExactValue(this.computeSelectableOptions(allOptions));

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
