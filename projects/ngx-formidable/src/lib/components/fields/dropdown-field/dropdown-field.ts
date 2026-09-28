import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { isPrintableCharacter } from '../../../helpers/input.helpers';
import { applyActionOption, applyDefaultOption } from '../../../helpers/option.helpers';
import { scrollIntoView, updatePanelPosition } from '../../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FieldDefaultOptionMode,
  FieldOptionRole,
  FORMIDABLE_DEFAULTS,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
  FormidableActionOption,
  FormidableOption,
  FormidablePanelPosition
} from '../../../models/formidable.model';
import { FieldOption } from '../../field-option/field-option';
import { BaseOptionField } from '../base-option-field';

/**
 * A single choice from a styled panel of options, walked with the keyboard and reachable by type-ahead. The
 * value is not typed into, so the field itself is read-only to the keyboard; `autocomplete-field` is the one
 * that filters as you type, and `select-field` the one that uses the platform's own picker.
 */
@Component({
  selector: 'formidable-dropdown-field',
  templateUrl: './dropdown-field.html',
  styleUrls: ['./dropdown-field.scss'],
  imports: [FieldOption],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: DropdownField
    },
    // required to provide this component as FormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: DropdownField
    }
  ]
})
export class DropdownField extends BaseOptionField implements OnInit, OnDestroy {
  readonly dropdownRef = viewChild.required<ElementRef<HTMLDivElement>>('dropdownRef');
  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.navigatePanelOptions(event, this);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter'];

  private _typedBuffer = '';

  override ngOnInit(): void {
    super.ngOnInit();
    this.registerTypeahead();
  }

  protected doOnFocusChange(isFocused: boolean): void {
    if (!isFocused) {
      this.resetTypeahead();
    }
  }

  private handleExternalClick(): void {
    if (!this.isPanelOpen()) return;

    this.togglePanel(false);
  }

  // #region FormidableField

  /** The picked option's value, or `null` for none. */
  public readonly value = model<string | null>(null);

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

  // #region FormidableOptionField

  public readonly optionRole: FieldOptionRole = 'option';

  /** An entry pinned to the end of the list that runs an action instead of becoming a value. */
  public readonly actionOption = input<FormidableActionOption | undefined>(undefined);

  /** Whether the `actionOption` always renders, or only when the list would otherwise be empty. */
  public readonly actionOptionMode = input<FieldDefaultOptionMode>('always');

  protected readonly activeOptions = signal<FormidableOption[]>([]);
  private readonly typeahead$ = new BehaviorSubject<string>('');

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

  // The option the model names, if it has arrived. The action entry is never one.
  protected readonly selectedOption = computed(() =>
    this.activeOptions().find((option) => option.value === this.value() && !this.isActionOption(option))
  );

  protected override get selectedOptionValue(): string | null {
    return this.selectedOption()?.value ?? null;
  }

  public selectOption(option: FormidableOption): void {
    if (option.disabled) return;

    // An action entry is not a value: the panel closes first, so whatever the action opens takes focus from
    // a field that has already settled, and nothing reaches the model.
    if (this.isActionOption(option)) {
      this.togglePanel(false);
      this.actionOption()!.action();

      return;
    }

    this.setValue(option.value);
    this.touch.emit();

    this.togglePanel(false);
  }

  protected onOptionsChanged(): void {
    const allOptions = applyDefaultOption(this.computeAllOptions(), this.defaultOption(), this.defaultOptionMode());

    this.activeOptions.set(applyActionOption(allOptions, this.actionOption(), this.actionOptionMode()));

    // keep highlight consistent if panel is open
    if (this.isPanelOpen()) {
      this.reconcileHighlightAfterOptionsChanged();
      this.updatePanelPosition();
    }
  }

  // #endregion

  // #region FormidablePanelField

  readonly panelRef = viewChild<ElementRef<HTMLDivElement>>('panelRef');

  /** Whether the panel is currently open. Call `togglePanel` to open or close it from outside. */
  public readonly isPanelOpen = signal(false);

  private readonly defaultPanelPosition = inject(FORMIDABLE_DEFAULTS).panelPosition ?? 'full';

  /**
   * Where the panel opens. The three anchored positions flip above the field when there is no room below.
   * Unset or `undefined`, the app default applies.
   */
  public readonly panelPosition = input(this.defaultPanelPosition, {
    transform: (position: FormidablePanelPosition | undefined) => position ?? this.defaultPanelPosition
  });

  // Mousedown, so the click keeps focus in the input rather than blurring it.
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
