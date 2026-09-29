import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  OnInit,
  output,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { replaceText } from '../../../helpers/input.helpers';
import { applyActionOption, applyDefaultOption } from '../../../helpers/option.helpers';
import {
  FieldDecoratorLayout,
  FieldDefaultOptionMode,
  FieldOptionRole,
  FORMIDABLE_DEFAULTS,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
  FormidableActionOption,
  FormidableOption,
  FormidablePanelField,
  FormidablePanelPosition
} from '../../../models/formidable.model';
import { FieldOption } from '../../field-option/field-option';
import { BaseOptionField } from '../base-option-field';

/**
 * A dropdown filtered by a text input inside its panel. The filter narrows the list by each option's `match`,
 * and `filterChange` also carries it out, so a consumer can fetch options for it instead of filtering a list
 * it already holds. Only a projected or bound option can be committed. Free text is not a value.
 */
@Component({
  selector: 'formidable-autocomplete-field',
  templateUrl: './autocomplete-field.html',
  styleUrls: ['./autocomplete-field.scss'],
  imports: [FieldOption],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: AutocompleteField
    },
    // required to provide this component as FormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: AutocompleteField
    }
  ]
})
export class AutocompleteField extends BaseOptionField<string | null> implements OnInit {
  readonly autocompleteRef = viewChild.required<ElementRef<HTMLDivElement>>('autocompleteRef');
  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.navigatePanelOptions(event, this);
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter'];

  protected filterChangeSubject$ = new BehaviorSubject<string>('');

  constructor() {
    super();

    // Renders a model the user did not type: the option's label, or nothing while no option carries it —
    // which clears the filter, so a consumer who supplies the options can put that option back. Never while
    // focused: there the typed text is the filter, and the options a consumer fetches for it on every
    // keystroke would otherwise put the old label back over it. A pick renders its own label.
    afterRenderEffect(() => {
      this.value();
      const selected = this.selectedOption();

      untracked(() => {
        const input = this.inputRef().nativeElement;
        const text = selected ? selected.label || selected.value : '';

        if (this.isFieldFocused() || input.value === text) return;

        input.value = text;
        this.setFilterText(text);
      });
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.registerAutocomplete();
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';

    // The user's own typing, which always reports — it is the filter.
    this.filterChangeSubject$.next(value);
    this.filterText.set(value);
    this.filterChange.emit(value);
  }

  protected doOnFocusChange(isFocused: boolean): void {
    if (!isFocused) {
      this.highlightedOptionValue = null;
      return;
    }

    this.selectOnKeyboardFocus(this.inputRef().nativeElement, false);
  }

  // #region FormidableField

  /** The picked option's value, or `null` for none. Free text is not a value. */
  public readonly value = model<string | null>(null);

  // Whatever the input shows counts — the filter being typed as much as a picked label.
  protected override readonly isFieldFilled = computed(() => this.filterText().length > 0);

  get fieldRef(): ElementRef<HTMLElement> {
    return this.autocompleteRef() as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef().nativeElement;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region Autocomplete

  /** The filter text, so options can be fetched for it rather than filtered out of a list already bound. */
  public readonly filterChange = output<string>();

  private readonly filterText = signal('');

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
    this.filterText.set(value);

    if (!this.isFieldFocused()) this.filterChange.emit(value);
  }

  // #endregion

  // #region FormidableOptionField

  public readonly optionRole: FieldOptionRole = 'option';

  /** An entry pinned to the end of the list that runs an action instead of becoming a value. */
  public readonly actionOption = input<FormidableActionOption | undefined>(undefined);

  /** Whether the `actionOption` always renders, or only when the list would otherwise be empty. */
  public readonly actionOptionMode = input<FieldDefaultOptionMode>('always');

  protected readonly activeOptions = signal<FormidableOption[]>([]);

  // Every option the model could name, filtered or not, which the selection is looked up in.
  private readonly allOptions = signal<FormidableOption[]>([]);

  // The option the model names, if it has arrived.
  protected readonly selectedOption = computed(() =>
    this.computeSelectableOptions(this.allOptions()).find((option) => option.value === this.value())
  );

  protected readonly hasSelectableOptions = computed(() =>
    this.activeOptions().some((option) => !this.isActionOption(option))
  );

  protected override optionSources(): unknown[] {
    return [...super.optionSources(), this.actionOption(), this.actionOptionMode()];
  }

  private isActionOption(option: FormidableOption): boolean {
    const actionOption = this.actionOption();

    return !!actionOption && option.value === actionOption.value;
  }

  protected override get selectedOptionValue(): string | null {
    return this.selectedOption()?.value ?? null;
  }

  public selectOption(option: FormidableOption): void {
    if (option.disabled) return;

    // An action entry is not a value: the panel closes first, so whatever the action opens takes focus from
    // a field that has already settled, and nothing reaches the model. The typed filter stays put, which is
    // what lets the action read it.
    if (this.isActionOption(option)) {
      this.togglePanel(false);
      this.actionOption()!.action();

      return;
    }

    const newOption: FormidableOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    // commit selection + update displayed label, with the caret behind it
    replaceText(this.inputRef().nativeElement, newOption.label!);

    this.setValue(newOption.value);
    this.togglePanel(false);
  }

  private deselectOption(): void {
    // only do work if there actually was a selection
    if (!this.selectedOption()) return;

    this.setHighlightedIndex(-1);
    this.setValue(null);
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.allOptions.set(allOptions);
    this.updateFilteredOptions(allOptions);

    // keep highlight consistent if panel is open
    if (this.isPanelOpen()) {
      this.reconcileHighlightAfterOptionsChanged();
      this.placePanelAfterRender();
    }
  }

  // A configured default option is always selectable, whatever its mode: in `fallback` mode whether it
  // renders depends on the current filter, so excluding it here would deselect it on the next keystroke.
  private computeSelectableOptions(allOptions: FormidableOption[]): FormidableOption[] {
    const defaultOption = this.defaultOption();

    return defaultOption ? [defaultOption, ...allOptions] : allOptions;
  }

  private updateFilteredOptions(allOptions: FormidableOption[]): void {
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

  // #endregion

  // #region FormidablePanelField

  readonly panelRef = viewChild<ElementRef<HTMLDivElement>>('panelRef');

  /** Whether the panel is currently open. Call `togglePanel` to open or close it from outside. */
  public readonly isPanelOpen = signal(false);

  private readonly defaultPanelPosition = inject(FORMIDABLE_DEFAULTS).panelPosition ?? 'full';

  /**
   * Where the panel opens. The three anchored positions flip above the field when there is no room below; a
   * `sheet` keeps focus in its own filter input, so a soft keyboard can cover it.
   * Unset or `undefined`, the app default applies.
   */
  public readonly panelPosition = input(this.defaultPanelPosition, {
    transform: (position: FormidablePanelPosition | undefined) => position ?? this.defaultPanelPosition
  });

  protected override get panel(): FormidablePanelField {
    return this;
  }

  /** Opens or closes the panel. */
  public togglePanel(isOpen: boolean): void {
    this.isPanelOpen.set(isOpen);
    this.onPanelToggle(isOpen);

    if (isOpen) {
      this.highlightSelectedOption();
    } else {
      this.setHighlightedIndex(-1);
    }
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
          this.placePanelAfterRender();
        }
      });
  }

  private tryAutoSelectExactValue(allOptions: FormidableOption[]): void {
    const typed = this.inputRef().nativeElement.value;
    if (!typed) return;

    const match = allOptions.find((o) => !o.disabled && o.label === typed);
    if (!match) return;

    this.selectOption(match);
  }
}
