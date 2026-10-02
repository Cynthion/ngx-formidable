import { afterNextRender, Directive, signal, Signal, viewChildren } from '@angular/core';
import { getNextAvailableOptionIndex } from '../../helpers/option.helpers';
import { scrollHighlightedOptionIntoView } from '../../helpers/position.helpers';
import { FormidableOption, FormidablePanelField } from '../../models/formidable.model';
import { FieldOption } from '../field-option/field-option';
import { BaseOptionListField } from './base-option-list-field';

/**
 * The base class behind the fields that walk their list of options with a highlight — `dropdown-field`,
 * `autocomplete-field`, `radio-group-field` and `checkbox-group-field`. It adds the highlight and the keys
 * that move it to everything `BaseOptionListField` already gives a field.
 */
@Directive()
export abstract class BaseOptionField<T = string | null> extends BaseOptionListField<T> {
  protected readonly optionRefs = viewChildren<FieldOption>('optionRef');

  protected readonly highlightedOptionIndex = signal(-1);

  // The highlighted option's value, so a reconcile can follow it across a changed list.
  protected highlightedOptionValue: string | null = null;

  // The options the highlight walks — the rendered list, which `autocomplete-field` filters.
  protected abstract readonly activeOptions: Signal<FormidableOption[]>;

  /** Commits an option, as a click on it does. No-op for a readonly or disabled option, or field. */
  public abstract selectOption(option: FormidableOption): void;

  // The value the selection claims the highlight for. `null` for a multi-select field, which has no single
  // selection to claim it.
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  protected get selectedOptionValue(): string | null {
    return null;
  }

  // `null` for a negative index, so a field with nothing highlighted emits no `aria-activedescendant`.
  protected optionId(index: number): string | null {
    return index >= 0 ? `${this.fieldId}-option-${index}` : null;
  }

  // The groups' keys: the arrows walk the list, and `Enter` or `Space` pick the highlighted option.
  protected navigateOptions(event: KeyboardEvent): boolean {
    const options = this.activeOptions();

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        const index = getNextAvailableOptionIndex(
          this.highlightedOptionIndex(),
          options,
          event.key === 'ArrowDown' ? 'down' : 'up'
        );
        if (index < 0) return false;

        this.setHighlightedIndex(index);
        return true;
      }
      case 'Enter':
      case ' ': {
        const option = options[this.highlightedOptionIndex()];
        if (!option) return false;

        this.selectOption(option);
        return true;
      }
      default:
        return false;
    }
  }

  // The panel fields' keys: `ArrowDown` opens the panel, `Escape` and `Tab` close it, and while it is open
  // the list is walked as a group's is. An open panel keeps every key it is walked with, even one with
  // nothing to act on, so an `Enter` meant for the list never submits the form behind it.
  protected navigatePanelOptions(event: KeyboardEvent, panel: FormidablePanelField): boolean {
    const isOpen = panel.isPanelOpen();

    switch (event.key) {
      case 'Tab':
        if (isOpen) panel.togglePanel(false);
        return false;
      case 'Escape':
        if (isOpen) panel.togglePanel(false);
        return isOpen;
      case 'ArrowDown':
        if (isOpen) this.navigateOptions(event);
        else panel.togglePanel(true);
        return true;
      default:
        if (isOpen) this.navigateOptions(event);
        return isOpen;
    }
  }

  protected highlightSelectedOption(): void {
    this.setHighlightedIndex(this.selectedOptionIndex);
  }

  protected reconcileHighlightAfterOptionsChanged(): void {
    const options = this.activeOptions();
    const count = options.length;

    // empty list
    if (count === 0) {
      this.setHighlightedIndex(-1);
      return;
    }

    // selection wins
    const selectedIndex = this.selectedOptionIndex;
    if (selectedIndex >= 0) {
      this.setHighlightedIndex(selectedIndex);
      return;
    }

    // try keep previously highlighted value
    if (this.highlightedOptionValue) {
      const keepIndex = options.findIndex((o) => o.value === this.highlightedOptionValue);
      if (keepIndex >= 0) {
        this.setHighlightedIndex(keepIndex);
        return;
      }
    }

    // clamp previous index into new bounds
    let nextIndex = this.highlightedOptionIndex();
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= count) nextIndex = count - 1;

    // skip what cannot be picked
    if (options[nextIndex]?.disabled || options[nextIndex]?.readonly) {
      const fixed = getNextAvailableOptionIndex(nextIndex, options, 'down');
      nextIndex = fixed >= 0 ? fixed : getNextAvailableOptionIndex(nextIndex, options, 'up');
    }

    this.setHighlightedIndex(nextIndex >= 0 ? nextIndex : -1);
  }

  protected setHighlightedIndex(index: number): void {
    this.highlightedOptionIndex.set(index);

    const option = index >= 0 ? this.activeOptions()[index] : undefined;
    this.highlightedOptionValue = option?.value ?? null;

    if (!this.isFieldFocused()) return;
    if (index < 0) return;

    // `optionRefs` is only repopulated once the new highlight has rendered.
    afterNextRender(() => scrollHighlightedOptionIntoView(index, this.optionRefs()), { injector: this.injector });
  }

  private get selectedOptionIndex(): number {
    const value = this.selectedOptionValue;

    return value === null ? -1 : this.activeOptions().findIndex((o) => o.value === value);
  }
}
