import {
  AfterContentInit,
  ContentChildren,
  Directive,
  Input,
  OnChanges,
  QueryList,
  SimpleChanges,
  ViewChildren
} from '@angular/core';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { getNextAvailableOptionIndex } from '../../helpers/option.helpers';
import { scrollHighlightedOptionIntoView } from '../../helpers/position.helpers';
import {
  FieldDefaultOptionMode,
  FORMIDABLE_OPTION,
  IFormidableOption,
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
export abstract class BaseOptionFieldDirective<T = string | null>
  extends BaseFieldDirective<T>
  implements OnChanges, AfterContentInit
{
  /** Options bound as data. Merged with any projected `<formidable-field-option>` children, not replaced. */
  @Input() options?: IFormidableOption[] = [];

  /** An option pinned to the top of the list, never sorted and never filtered. See `defaultOptionMode`. */
  @Input() defaultOption?: IFormidableOption;

  /** Whether the `defaultOption` always renders, or only when there would otherwise be no options. */
  @Input() defaultOptionMode: FieldDefaultOptionMode = 'always';

  /** What renders in place of an empty list. Plain text, not an option — there is nothing there to pick. */
  @Input() noOptionsText: string = NO_OPTIONS_TEXT;

  /** Orders the merged list. Applied after the merge, so bound and projected options interleave. */
  @Input() sortFn?: (a: IFormidableOption, b: IFormidableOption) => number;

  /** The projected options. One may sit inside a wrapper element rather than directly in the field. */
  @ContentChildren(FORMIDABLE_OPTION, { descendants: true })
  optionComponents?: QueryList<IFormidableOption>;

  @ViewChildren('optionRef') protected optionRefs?: QueryList<FieldOptionComponent>;

  protected readonly highlightedOptionIndex$ = new BehaviorSubject<number>(-1);

  // The highlighted option's value, so a reconcile can follow it across a changed list.
  protected highlightedOptionValue: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    // react to changes of @Input properties
    if (changes['options'] || changes['sortFn'] || changes['defaultOption'] || changes['defaultOptionMode']) {
      queueMicrotask(() => this.onOptionsChanged());
    }
  }

  ngAfterContentInit(): void {
    // The projected options (option.template) might not be available immediately after content initialization,
    // so we use queueMicrotask to ensure they are processed after the current change detection cycle.
    queueMicrotask(() => this.onOptionsChanged());

    // react to the changes of projected options
    this.optionComponents?.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => queueMicrotask(() => this.onOptionsChanged()));
  }

  // Recombines the options and re-reconciles selection and highlight against them.
  protected abstract onOptionsChanged(): void;

  // The options the highlight walks — the rendered list, which `autocomplete-field` filters.
  protected abstract get activeOptions(): IFormidableOption[];

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
    const options = this.activeOptions;
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
    let nextIndex = this.highlightedOptionIndex$.value;
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
    this.highlightedOptionIndex$.next(index);

    const option = index >= 0 ? this.activeOptions[index] : undefined;
    this.highlightedOptionValue = option?.value ?? null;

    if (!this.isFieldFocused) return;
    if (index < 0) return;

    // `optionRefs` is only repopulated once the new highlight has rendered, so a microtask would
    // resolve the wrong element.
    setTimeout(() => scrollHighlightedOptionIntoView(index, this.optionRefs));
  }

  private get selectedOptionIndex(): number {
    const value = this.selectedOptionValue;

    return value === null ? -1 : this.activeOptions.findIndex((o) => o.value === value);
  }
}
