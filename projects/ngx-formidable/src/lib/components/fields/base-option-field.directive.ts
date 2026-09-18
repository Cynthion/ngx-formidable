import { contentChildren, Directive, effect, input, signal, Signal, untracked, viewChildren } from '@angular/core';
import { getNextAvailableOptionIndex } from '../../helpers/option.helpers';
import { scrollHighlightedOptionIntoView } from '../../helpers/position.helpers';
import {
  FieldDefaultOptionMode,
  FORMIDABLE_OPTION,
  IFormidableOption,
  IFormidableOptionSource,
  NO_OPTIONS_TEXT
} from '../../models/formidable.model';
import { FieldOptionComponent } from '../field-option/field-option.component';
import { BaseFieldDirective } from './base-field.directive';

/**
 * The base class behind the fields that render a list of options and walk it with a highlight —
 * `dropdown-field`, `autocomplete-field`, `radio-group-field` and `checkbox-group-field`. It adds the option
 * inputs below to everything `BaseFieldDirective` already gives a field.
 *
 * Options come from the `options` input, from projected `<formidable-field-option>` children, or from both.
 */
@Directive()
export abstract class BaseOptionFieldDirective<T = string | null> extends BaseFieldDirective<T> {
  /** Options bound as data. Merged with any projected `<formidable-field-option>` children, not replaced. */
  public readonly options = input<IFormidableOption[] | undefined>([]);

  /** An option pinned to the top of the list, never sorted and never filtered. See `defaultOptionMode`. */
  public readonly defaultOption = input<IFormidableOption | undefined>(undefined);

  /** Whether the `defaultOption` always renders, or only when there would otherwise be no options. */
  public readonly defaultOptionMode = input<FieldDefaultOptionMode>('always');

  /** What renders in place of an empty list. Plain text, not an option — there is nothing there to pick. */
  public readonly noOptionsText = input<string>(NO_OPTIONS_TEXT);

  /** Orders the merged list. Applied after the merge, so bound and projected options interleave. */
  public readonly sortFn = input<((a: IFormidableOption, b: IFormidableOption) => number) | undefined>(undefined);

  /** The projected options. One may sit inside a wrapper element rather than directly in the field. */
  public readonly optionComponents = contentChildren<IFormidableOptionSource>(FORMIDABLE_OPTION, {
    descendants: true
  });

  protected readonly optionRefs = viewChildren<FieldOptionComponent>('optionRef');

  protected readonly highlightedOptionIndex = signal(-1);

  // The highlighted option's value, so a reconcile can follow it across a changed list.
  protected highlightedOptionValue: string | null = null;

  constructor() {
    super();

    // One source of truth for "the option list moved".
    //
    // The `queueMicrotask` stays, and is the one thing signals do not remove. A projected option resolves
    // its content — and therefore its label — in its own `ngAfterContentInit`, and an option inside an
    // `@for` has not had its `required` inputs applied while this effect runs. Reading either now gives a
    // wrong label or throws NG0950; a microtask lands after both.
    effect(() => {
      this.optionSources();
      untracked(() => queueMicrotask(() => this.onOptionsChanged()));
    });
  }

  // What the effect above watches. Not the merged list itself: each field merges differently, and the
  // reconcile needs to run for a changed `sortFn` as much as for a changed option.
  //
  // The projected children are watched by the query's own identity and never by reading `option()` off
  // them, because that reads a `required` input: the effect's first run can land before the bindings on an
  // option inside an `@for` have been applied, and the read would throw NG0950 rather than wait.
  private optionSources(): unknown[] {
    return [this.options(), this.defaultOption(), this.defaultOptionMode(), this.sortFn(), this.optionComponents()];
  }

  // Recombines the options and re-reconciles selection and highlight against them.
  protected abstract onOptionsChanged(): void;

  // The options the highlight walks — the rendered list, which `autocomplete-field` filters.
  protected abstract readonly activeOptions: Signal<IFormidableOption[]>;

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

    // skip disabled
    if (options[nextIndex]?.disabled) {
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

    // `optionRefs` is only repopulated once the new highlight has rendered, so a microtask would
    // resolve the wrong element. A timer lands after the render even zonelessly: the `set` above notifies
    // the scheduler, which queues its own timer from inside that call, so ours is behind it in the queue.
    setTimeout(() => scrollHighlightedOptionIntoView(index, this.optionRefs()));
  }

  private get selectedOptionIndex(): number {
    const value = this.selectedOptionValue;

    return value === null ? -1 : this.activeOptions().findIndex((o) => o.value === value);
  }
}
