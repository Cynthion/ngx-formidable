import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  OnInit,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { debounceTime, filter, Subject, takeUntil } from 'rxjs';
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

  // The user's typing, and nothing else: it opens the panel and picks an exact match.
  private readonly filterChangeSubject$ = new Subject<string>();

  // The value the input's text follows: the field's own pick or deselect, or the render below. `undefined`
  // while no option carries the value, so its label is still owed.
  private syncedValue?: string | null;

  constructor() {
    super();

    // Renders a model the user did not type: the option's label, or nothing while no option carries it —
    // which clears the filter, so a consumer who supplies the options can put that option back, and the label
    // follows once they do. While focused, only for a value written from outside, such as a clear button that
    // keeps focus on the field, and for the label such a value still owes: otherwise the typed text is the
    // filter, and the options a consumer fetches for it on every keystroke would put the old label back over
    // it, and the field's own narrowing — a deselect, or a written value re-applied because the list moved —
    // would pull the list out from under the user. A pick renders its own label.
    afterRenderEffect(() => {
      const value = this.value();
      const selected = this.selectedOption();

      untracked(() => {
        const input = this.inputRef().nativeElement;
        const text = this.selectedLabel();
        const isOwed = value !== this.syncedValue;

        this.syncedValue = selected ? value : undefined;
        if ((this.isFieldFocused() && !isOwed) || input.value === text) return;

        input.value = text;
        this.setFilterText(text);
      });
    });

    // Renders a filter written from outside, such as a clear button's. The field's own writes leave the input
    // holding the filter already. Trap: not part of the render above, which a pick re-runs: a pick leaves the
    // input on the label and the filter on what was typed, and must keep the label.
    afterRenderEffect(() => {
      const text = this.filter();

      untracked(() => {
        const input = this.inputRef().nativeElement;
        if (input.value === text) return;

        input.value = text;
        this.updateFilteredOptions(this.allOptions());
      });
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.registerAutocomplete();
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';

    // Typed past the picked label, it lets the pick go at once: a field left within the debounce would keep
    // it, and so would one whose list has already dropped its option.
    if (value !== this.selectedLabel()) this.deselectOption();

    // The user's own typing is the filter, reported whenever it changes.
    this.filterChangeSubject$.next(value);
    this.filter.set(value);
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

  // Whatever the input shows counts: the filter being typed, or a picked label, which a pick from the list
  // renders with nothing typed.
  protected override readonly isFieldFilled = computed(() => this.filter().length > 0 || !!this.selectedOption());

  get fieldRef(): ElementRef<HTMLElement> {
    return this.autocompleteRef() as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef().nativeElement;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region Autocomplete

  /**
   * The filter text the list is narrowed by: what the user types, or what a value written from outside moves it
   * to. After a pick the input shows the label and the filter keeps what was typed. `filterChange` reports each
   * change, so options can be fetched for it. Write it to seed or empty the text: a write opens no panel and
   * picks nothing, so a clear button writes the value too.
   */
  public readonly filter = model('');

  // The filter text the field moved on its own, rather than the user typing it.
  //
  // A value written from outside takes the filter with it — to the selected label, or to nothing where the
  // field cannot place the value yet — and a consumer who supplies the options is the only one who can put
  // the matching option back into the list. Move the field's filter without telling them and the two lists
  // drift: the field holds a value whose option the consumer has filtered out, and has nothing left to
  // display it with. That is the second lap of an `actionOption` round trip, where the created option
  // carries a label the text typed to find it does not match.
  //
  // Not typing, so it neither opens the panel nor picks.
  private setFilterText(value: string): void {
    this.filter.set(value);
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

  // The text the selection renders: its label, else its value, and nothing while no option carries it.
  private readonly selectedLabel = computed(() => {
    const selected = this.selectedOption();

    return selected ? selected.label || selected.value : '';
  });

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
    if (!this.canEdit() || option.disabled || option.readonly) return;

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

  protected override setValue(value: string | null): void {
    this.syncedValue = value;
    super.setValue(value);
  }

  private deselectOption(): void {
    // only do work if there actually was a selection, carried by the list or not
    if (this.value() === null) return;

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
    const filterValue = this.filter();

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

  // Every pause in typing counts, even on the text the last one ended on: after an outside clear, the same
  // word typed again is new to the field. A pause whose text a write from outside has since replaced does not,
  // or a clear inside the debounce would open the panel over the emptied field.
  private registerAutocomplete(): void {
    this.filterChangeSubject$
      .pipe(
        debounceTime(200),
        filter((typed) => typed === this.filter() && this.isFieldFocused()),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
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
