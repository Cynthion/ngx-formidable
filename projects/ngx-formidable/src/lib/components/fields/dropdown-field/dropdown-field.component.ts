import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  input,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { isPrintableCharacter } from '../../../helpers/input.helpers';
import {
  applyActionOption,
  applyDefaultOption,
  combineFieldOptions,
  getNextAvailableOptionIndex
} from '../../../helpers/option.helpers';
import { scrollIntoView, updatePanelPosition } from '../../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FieldDefaultOptionMode,
  FieldOptionRole,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
  FormidablePanelPosition,
  IFormidableActionOption,
  IFormidableDropdownField,
  IFormidableOption
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
  readonly dropdownRef = viewChild.required<ElementRef<HTMLDivElement>>('dropdownRef');
  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputRef');

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
    const options = this.activeOptions();
    const count = options.length;

    switch (event.key) {
      case 'Escape':
      case 'Tab':
        if (this.isPanelOpen()) this.togglePanel(false);
        break;
      case 'ArrowDown':
        if (!this.isPanelOpen()) {
          this.togglePanel(true);
        } else if (count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex(), options, 'down'));
        }
        break;
      case 'ArrowUp':
        if (this.isPanelOpen() && count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex(), options, 'up'));
        }
        break;
      case 'Enter': {
        if (!this.isPanelOpen()) return;
        const idx = this.highlightedOptionIndex();
        const option = this.activeOptions()[idx];
        if (option) this.selectOption(option);
        break;
      }
    }
  }

  private handleExternalClick(): void {
    if (!this.isPanelOpen()) return;

    this.togglePanel(false);
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string | null): void {
    this._writtenValue = value ?? null;

    const found = this.computeAllOptions().find((opt) => opt.value === this._writtenValue);
    this.selectedOption.set(found ? { ...found } : undefined);

    // write to wrapped input element — if the option isn't found yet (options may not be
    // loaded), the input stays empty; _writtenValue is kept so updateOptions re-applies it
    const selected = this.selectedOption();
    this.inputRef().nativeElement.value = selected ? selected.label || selected.value : '';

    this.isFieldFilled.set(this.inputRef().nativeElement.value.length > 0);
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectedOption()?.value || null;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.dropdownRef() as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef().nativeElement;
  }

  // Mirrors the template: there is nothing to open once the field is readonly or disabled.
  readonly hasInFieldToggle = computed(() => !this.readonly() && !this.disabled());

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region IFormidableDropdownField

  // empty

  // #endregion

  // #region IFormidableOptionField

  public readonly optionRole: FieldOptionRole = 'option';

  /** An entry pinned to the end of the list that runs an action instead of becoming a value. */
  public readonly actionOption = input<IFormidableActionOption | undefined>(undefined);

  /** Whether the `actionOption` always renders, or only when the list would otherwise be empty. */
  public readonly actionOptionMode = input<FieldDefaultOptionMode>('always');

  protected readonly activeOptions = signal<IFormidableOption[]>([]);
  private readonly typeahead$ = new BehaviorSubject<string>('');

  protected readonly hasSelectableOptions = computed(() =>
    this.activeOptions().some((option) => !this.isActionOption(option))
  );

  protected override optionSources(): unknown[] {
    return [...super.optionSources(), this.actionOption(), this.actionOptionMode()];
  }

  private isActionOption(option: IFormidableOption): boolean {
    const actionOption = this.actionOption();

    return !!actionOption && option.value === actionOption.value;
  }

  protected readonly selectedOption = signal<IFormidableOption | undefined>(undefined);

  protected override get selectedOptionValue(): string | null {
    return this.selectedOption()?.value ?? null;
  }

  public selectOption(option: IFormidableOption): void {
    if (option.disabled) return;

    // An action entry is not a value: the panel closes first, so whatever the action opens takes focus from
    // a field that has already settled, and nothing reaches the model.
    if (this.isActionOption(option)) {
      this.togglePanel(false);
      this.actionOption()!.action();

      return;
    }

    const newOption: IFormidableOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    // commit selection + update displayed label
    this.selectedOption.set(newOption);
    this.inputRef().nativeElement.value = newOption.label!; // update input value with selected option label

    // emit value change
    this.valueChangeSubject$.next(newOption.value);
    this.valueChanged.emit(newOption.value);
    this.isFieldFilled.set(newOption.value.length > 0);
    this.commit(newOption.value); // notify ControlValueAccessor of the change
    this.touch();

    // simulate blur (field-state blur, not necessarily native blur)
    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.focusChanged.emit(false);

    // close panel
    this.togglePanel(false);
  }

  private deselectOption(opts: { clearInput?: boolean } = {}): void {
    // only do work if there actually was a selection
    if (!this.selectedOption()) return;

    this.setHighlightedIndex(-1);
    this.selectedOption.set(undefined);
    this._writtenValue = null;

    if (opts.clearInput) {
      this.inputRef().nativeElement.value = '';
    }

    this.valueChangeSubject$.next(null);
    this.valueChanged.emit(null);
    this.isFieldFilled.set(this.inputRef().nativeElement.value.length > 0);
    this.commit(null);
    this.touch();
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    // Reconciled before the options are applied: `updateOptions` re-applies the written value, which
    // clears `selectedOption` and would leave the reconcile nothing to find.
    // A changed options list is not the user, so the reconcile may correct the model but not touch.
    this.runSilently('correction', () => this.reconcileSelectionAgainstOptions(allOptions));
    this.updateOptions(allOptions);

    // keep highlight consistent if panel is open
    if (this.isPanelOpen()) {
      this.reconcileHighlightAfterOptionsChanged();
      this.updatePanelPosition();
    }
  }

  private computeAllOptions(): IFormidableOption[] {
    const combined = combineFieldOptions(
      this.options(),
      this.optionComponents().map((source) => source.option()),
      this.sortFn()
    );

    return applyDefaultOption(combined, this.defaultOption(), this.defaultOptionMode());
  }

  private updateOptions(allOptions: IFormidableOption[]): void {
    this.activeOptions.set(applyActionOption(allOptions, this.actionOption(), this.actionOptionMode()));

    // keep current value in sync with newly combined options
    this.writeValue(this._writtenValue);
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableOption[]): void {
    if (!this.selectedOption()) return;

    const stillExists = allOptions.some((o) => o.value === this.selectedOption()!.value);
    if (!stillExists) {
      // selection is no longer valid
      this.deselectOption({ clearInput: true });
    }
  }

  // #endregion

  // #region IFormidablePanelField

  readonly panelRef = viewChild<ElementRef<HTMLDivElement>>('panelRef');

  /** Whether the panel is currently open. Call `togglePanel` to open or close it from outside. */
  public readonly isPanelOpen = signal(false);

  /** Where the panel opens. The three anchored positions flip above the field when there is no room below. */
  public readonly panelPosition = input<FormidablePanelPosition>('full');

  // Mousedown is used to prevent sending focusChanged events.
  protected toggleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.inputRef().nativeElement.focus(); // ensure input remains focused, so keyboard events work
    this.togglePanel(!this.isPanelOpen());
  }

  panelMouseDown(event: MouseEvent): void {
    // Prevent blur when clicking inside the panel
    event.preventDefault();
  }

  /** Opens or closes the panel. */
  public togglePanel(isOpen: boolean): void {
    this.isPanelOpen.set(isOpen);

    if (isOpen) {
      // Reads the panel's box, so it has to wait for the open state to render — a microtask would run
      // before change detection. A timer lands after it even zonelessly: the `set` above notifies the
      // scheduler, which queues its own timer from inside that call, so ours is behind it in the queue.
      // Only while opening: closing reveals nothing, so scrolling then just moves the page under the user.
      setTimeout(() => scrollIntoView(this.dropdownRef(), this.panelRef()));

      this.highlightSelectedOption();
      // Synchronous on purpose: a closed panel is `visibility: hidden`, not `display: none`, so it is
      // already laid out and measurable. Deferring would flip it after paint, which is a visible jump.
      updatePanelPosition(this.dropdownRef(), this.panelRef());
    } else {
      this.resetTypeahead();
      this.setHighlightedIndex(-1);
    }
  }

  // Deferred, unlike the call in `togglePanel`: the option list changed, so the panel's height is only
  // correct once change detection has rendered it. Queued behind the scheduler's own timer, as above.
  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.dropdownRef(), this.panelRef()));
  }

  // #endregion

  private registerTypeahead(): void {
    this.typeahead$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(() => this.isFieldFocused()),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.highlightFirstMatchingOption(term);
        this._typedBuffer = '';
      });
  }

  private highlightFirstMatchingOption(term: string): void {
    if (!term) return;

    if (!this.isPanelOpen()) {
      this.togglePanel(true);
    }

    // The action entry is skipped: typing "a" looks for a value, not for "Add A New Address…".
    const matchIndex = this.activeOptions().findIndex(
      (opt) => !this.isActionOption(opt) && (opt.label || opt.value).toLowerCase().startsWith(term.toLowerCase())
    );

    this.setHighlightedIndex(matchIndex >= 0 ? matchIndex : -1);
  }

  protected onTypeaheadKeydown(event: KeyboardEvent): void {
    // The display input is readonly and takes no pointer events, so a select-all is the one gesture that can
    // still leave a highlight on the value — one no mouse could have made.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      return;
    }

    if (isPrintableCharacter(event) && !this.readonly() && !this.disabled()) {
      this._typedBuffer += event.key;
      this.typeahead$.next(this._typedBuffer);

      if (!this.isPanelOpen()) {
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
