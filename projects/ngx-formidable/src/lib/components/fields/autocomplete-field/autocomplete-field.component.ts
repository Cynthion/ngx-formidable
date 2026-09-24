import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  input,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { replaceText } from '../../../helpers/input.helpers';
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
  IFormidableAutocompleteField,
  IFormidableOption
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseOptionFieldDirective } from '../base-option-field.directive';

/**
 * A dropdown filtered by a text input inside its panel. The filter narrows the list by each option's `match`,
 * and `filterChanged` also carries it out, so a consumer can fetch options for it instead of filtering a list
 * it already holds. Only a projected or bound option can be committed. Free text is not a value.
 */
@Component({
  selector: 'formidable-autocomplete-field',
  templateUrl: './autocomplete-field.component.html',
  styleUrls: ['./autocomplete-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly autocompleteRef = viewChild.required<ElementRef<HTMLDivElement>>('autocompleteRef');
  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputRef');

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

    // The user's own typing, which always reports — it is the filter.
    this.filterChangeSubject$.next(value);
    this.filterChanged.emit(value);

    this.isFieldFilled.set(value.length > 0);
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(isFocused: boolean): void {
    if (!isFocused) {
      this.highlightedOptionValue = null;
      return;
    }

    this.selectOnKeyboardFocus(this.inputRef().nativeElement, false);
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

    const found = this.computeSelectableOptions(this.computeAllOptions()).find(
      (opt) => opt.value === this._writtenValue
    );
    this.selectedOption.set(found ? { ...found } : undefined);

    // write to wrapped input element — if the option isn't found yet (options may not be
    // loaded), the input stays empty; _writtenValue is kept so onOptionsChanged re-applies it
    const selected = this.selectedOption();
    this.inputRef().nativeElement.value = selected ? selected.label || selected.value : '';

    this.isFieldFilled.set(this.inputRef().nativeElement.value.length > 0);

    // keep filter/list consistent with displayed value
    this.setFilterText(this.inputRef().nativeElement.value);
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectedOption()?.value || null;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.autocompleteRef() as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef().nativeElement;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region IFormidableAutocompleteField

  public filterChange$ = this.filterChangeSubject$.asObservable();

  /** The filter text, so options can be fetched for it rather than filtered out of a list already bound. */
  public readonly filterChanged = output<string>();

  /**
   * The filter text the field moved on its own, rather than the user typing it.
   *
   * A value written from outside takes the filter with it — to the selected label, or to nothing where the
   * field cannot place the value yet — and a consumer who supplies the options is the only one who can put
   * the matching option back into the list. Move the field's filter without telling them and the two lists
   * drift: the field holds a value whose option the consumer has filtered out, and has nothing left to
   * display it with. That is the second lap of an `actionOption` round trip, where the created option
   * carries a label the text typed to find it does not match.
   *
   * Reported only while the field is not the user's. A focused field is one being typed into, where the
   * typed text is the filter and the field's own narrowing — a deselect, or a written value re-applied
   * because the list moved — must not pull the list out from under them.
   */
  private setFilterText(value: string): void {
    this.filterChangeSubject$.next(value);

    if (!this.isFieldFocused()) this.filterChanged.emit(value);
  }

  // #endregion

  // #region IFormidableOptionField

  public readonly optionRole: FieldOptionRole = 'option';

  /** An entry pinned to the end of the list that runs an action instead of becoming a value. */
  public readonly actionOption = input<IFormidableActionOption | undefined>(undefined);

  /** Whether the `actionOption` always renders, or only when the list would otherwise be empty. */
  public readonly actionOptionMode = input<FieldDefaultOptionMode>('always');

  protected readonly activeOptions = signal<IFormidableOption[]>([]);

  protected readonly selectedOption = signal<IFormidableOption | undefined>(undefined);

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

  protected override get selectedOptionValue(): string | null {
    return this.selectedOption()?.value ?? null;
  }

  public selectOption(option: IFormidableOption): void {
    if (option.disabled) return;

    // An action entry is not a value: the panel closes first, so whatever the action opens takes focus from
    // a field that has already settled, and nothing reaches the model. The typed filter stays put, which is
    // what lets the action read it.
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

    // commit selection + update displayed label, with the caret behind it
    this.selectedOption.set(newOption);
    replaceText(this.inputRef().nativeElement, newOption.label!);

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
    this._writtenValue = null; // clear pending value so it isn't re-applied when options change

    if (opts.clearInput) {
      this.inputRef().nativeElement.value = '';
      this.setFilterText(''); // keeps filter + list consistent
    }

    this.valueChangeSubject$.next(null);
    this.valueChanged.emit(null);
    this.isFieldFilled.set(this.inputRef().nativeElement.value.length > 0);
    this.commit(null);
    this.touch();
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateFilteredOptions(allOptions);

    // Re-apply the written value only while the field has not managed to place it, which is the whole
    // point of keeping it: the option it names had not arrived yet. Re-applying one already placed — or
    // a `null` — rewrites the input from the model on every options refresh, and a fuzzy search refreshes
    // on each keystroke, so what the user is typing is overwritten as they type it.
    if (this._writtenValue !== null && !this.selectedOption()) {
      this.writeValue(this._writtenValue);
    }

    // A changed options list is not the user, so the reconcile may correct the model but not touch.
    this.runSilently('correction', () =>
      this.reconcileSelectionAgainstOptions(this.computeSelectableOptions(allOptions))
    );

    // keep highlight consistent if panel is open
    if (this.isPanelOpen()) {
      this.reconcileHighlightAfterOptionsChanged();
      this.updatePanelPosition();
    }
  }

  private computeAllOptions(): IFormidableOption[] {
    return combineFieldOptions(
      this.options(),
      this.optionComponents().map((source) => source.option()),
      this.sortFn()
    );
  }

  // A configured default option is always selectable, whatever its mode: in `fallback` mode whether it
  // renders depends on the current filter, so excluding it here would deselect it on the next keystroke.
  private computeSelectableOptions(allOptions: IFormidableOption[]): IFormidableOption[] {
    const defaultOption = this.defaultOption();

    return defaultOption ? [defaultOption, ...allOptions] : allOptions;
  }

  private updateFilteredOptions(allOptions: IFormidableOption[]): void {
    const filterValue = this.filterChangeSubject$.value;

    const filteredOptions = filterValue
      ? allOptions.filter((opt) =>
          opt.match ? opt.match(filterValue) : opt.label?.toLowerCase().includes(filterValue.toLowerCase())
        )
      : allOptions;

    // Both are applied after filtering, so an `always` default and the action entry survive a filter that
    // matches nothing — which is the moment the action entry exists for.
    this.activeOptions.set(
      applyActionOption(
        applyDefaultOption(filteredOptions, this.defaultOption(), this.defaultOptionMode()),
        this.actionOption(),
        this.actionOptionMode()
      )
    );
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

  /**
   * Where the panel opens. The three anchored positions flip above the field when there is no room below; a
   * `sheet` keeps focus in its own filter input, so a soft keyboard can cover it.
   */
  public readonly panelPosition = input<FormidablePanelPosition>('full');

  /** Opens or closes the panel. */
  public togglePanel(isOpen: boolean): void {
    this.isPanelOpen.set(isOpen);

    if (isOpen) {
      // Reads the panel's box, so it has to wait for the open state to render — a microtask would run
      // before change detection. A timer lands after it even zonelessly: the `set` above notifies the
      // scheduler, which queues its own timer from inside that call, so ours is behind it in the queue.
      // Only while opening: closing reveals nothing, so scrolling then just moves the page under the user.
      setTimeout(() => scrollIntoView(this.autocompleteRef(), this.panelRef()));

      this.highlightSelectedOption();
      // Synchronous on purpose: a closed panel is `visibility: hidden`, not `display: none`, so it is
      // already laid out and measurable. Deferring would flip it after paint, which is a visible jump.
      updatePanelPosition(this.autocompleteRef(), this.panelRef());
    } else {
      this.setHighlightedIndex(-1);
    }
  }

  // Deferred, unlike the call in `togglePanel`: the option list changed, so the panel's height is only
  // correct once change detection has rendered it. Queued behind the scheduler's own timer, as above.
  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.autocompleteRef(), this.panelRef()));
  }

  // #endregion

  private registerAutocomplete(): void {
    this.filterChangeSubject$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(() => this.isFieldFocused()),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const typed = this.inputRef().nativeElement.value ?? '';
        const selectedLabel = this.selectedOption()?.label ?? '';

        // only deselect if the user actually diverged from the selected label
        if (this.selectedOption() && typed !== selectedLabel) {
          this.deselectOption(); // no clearInput
        }

        const allOptions = this.computeAllOptions();

        this.updateFilteredOptions(allOptions);
        this.tryAutoSelectExactValue(this.computeSelectableOptions(allOptions));

        if (!this.isPanelOpen()) {
          this.togglePanel(true);
        } else {
          this.updatePanelPosition();
        }
      });
  }

  private tryAutoSelectExactValue(allOptions: IFormidableOption[]): void {
    const typed = this.inputRef().nativeElement.value;
    if (!typed) return;

    const match = allOptions.find((o) => !o.disabled && o.label === typed);
    if (!match) return;

    this.selectOption(match);
  }
}
