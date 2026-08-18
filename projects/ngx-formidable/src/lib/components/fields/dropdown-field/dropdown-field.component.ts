import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { isPrintableCharacter } from '../../../helpers/input.helpers';
import { applyDefaultOption, combineFieldOptions, getNextAvailableOptionIndex } from '../../../helpers/option.helpers';
import { scrollIntoView, updatePanelPosition } from '../../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FieldOptionRole,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
  FormidablePanelPosition,
  IFormidableDropdownField,
  IFormidableFieldOption
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseOptionFieldDirective } from '../base-option-field.directive';

/**
 * A single choice from a styled panel of options, walked with the keyboard and reachable by type-ahead. The
 * value is not typed into, so the field itself is read-only to the keyboard; `autocomplete-field` is the one
 * that filters as you type, and `select-field` the one that uses the platform's own picker.
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
  extends BaseOptionFieldDirective
  implements IFormidableDropdownField, OnInit, OnDestroy
{
  @ViewChild('dropdownRef', { static: true }) dropdownRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter'];

  private _writtenValue: string | null = null;
  private _typedBuffer = '';

  override ngOnInit(): void {
    super.ngOnInit();
    this.registerTypeahead();
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
      case 'Enter': {
        if (!this.isPanelOpen) return;
        const idx = this.highlightedOptionIndex$.value;
        const option = this.options$.value[idx];
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

    const found = this.computeAllOptions().find((opt) => opt.value === this._writtenValue);
    this.selectedOption = found ? { ...found } : undefined;

    // write to wrapped input element — if the option isn't found yet (options may not be
    // loaded), the input stays empty; _writtenValue is kept so updateOptions re-applies it
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

  get fieldRef(): ElementRef<HTMLElement> {
    return this.dropdownRef as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef.nativeElement;
  }

  // Mirrors the template: there is nothing to open once the field is readonly or disabled.
  get hasInFieldToggle(): boolean {
    return !this.readonly && !this.disabled;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region IFormidableDropdownField

  // empty

  // #endregion

  // #region IFormidableOptionField

  public readonly optionRole: FieldOptionRole = 'option';

  protected readonly options$ = new BehaviorSubject<IFormidableFieldOption[]>([]);
  private readonly typeahead$ = new BehaviorSubject<string>('');

  protected selectedOption?: IFormidableFieldOption = undefined;

  protected get activeOptions(): IFormidableFieldOption[] {
    return this.options$.value;
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
    this.commit(this.selectedOption.value); // notify ControlValueAccessor of the change
    this.touch();

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
    this._writtenValue = null;

    if (opts.clearInput) {
      this.inputRef.nativeElement.value = '';
    }

    this.valueChangeSubject$.next(null);
    this.valueChanged.emit(null);
    this.isFieldFilled = this.inputRef.nativeElement.value.length > 0;
    this.commit(null);
    this.touch();

    this.cdRef.markForCheck();
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    // Reconciled before the options are applied: `updateOptions` re-applies the written value, which
    // clears `selectedOption` and would leave the reconcile nothing to find.
    // A changed options list is not the user, so the reconcile may correct the model but not touch.
    this.runSilently('correction', () => this.reconcileSelectionAgainstOptions(allOptions));
    this.updateOptions(allOptions);

    // keep highlight consistent if panel is open
    if (this.isPanelOpen) {
      this.reconcileHighlightAfterOptionsChanged();
      this.updatePanelPosition();
    }

    this.cdRef.markForCheck();
  }

  private computeAllOptions(): IFormidableFieldOption[] {
    const combined = combineFieldOptions(this.options, this.optionComponents?.toArray(), this.sortFn);

    return applyDefaultOption(combined, this.defaultOption, this.defaultOptionMode);
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
      // selection is no longer valid
      this.deselectOption({ clearInput: true });
    }
  }

  // #endregion

  // #region IFormidablePanelField

  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  /** Opens and closes the panel from outside. Setting it runs the same path a click on the toggle does. */
  @Input()
  get isPanelOpen(): boolean {
    return this._isPanelOpen;
  }
  set isPanelOpen(val: boolean) {
    this.togglePanel(val);
  }

  /** Where the panel opens. The three anchored positions flip above the field when there is no room below. */
  @Input() panelPosition: FormidablePanelPosition = 'full';

  private _isPanelOpen = false;

  // Mousedown is used to prevent sending focusChanged events.
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

    // Reads the panel's box, so it has to wait for the open state to render — a microtask would run
    // before change detection.
    setTimeout(() => scrollIntoView(this.dropdownRef, this.panelRef, isOpen));

    if (isOpen) {
      this.highlightSelectedOption();
      // Synchronous on purpose: a closed panel is `visibility: hidden`, not `display: none`, so it is
      // already laid out and measurable. Deferring would flip it after paint, which is a visible jump.
      updatePanelPosition(this.dropdownRef, this.panelRef);
    } else {
      this.resetTypeahead();
      this.setHighlightedIndex(-1);
    }

    this.cdRef.markForCheck();
  }

  // Deferred, unlike the call in `togglePanel`: the option list changed, so the panel's height is only
  // correct once change detection has rendered it.
  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.dropdownRef, this.panelRef));
  }

  // #endregion

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
