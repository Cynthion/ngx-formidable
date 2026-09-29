import { afterNextRender, contentChildren, Directive, effect, input, untracked } from '@angular/core';
import { combineFieldOptions, trackProjectedOptions } from '../../helpers/option.helpers';
import {
  FieldDefaultOptionMode,
  FORMIDABLE_OPTION,
  FormidableOption,
  FormidableOptionSource,
  NO_OPTIONS_TEXT
} from '../../models/formidable.model';
import { BaseField } from './base-field';

/**
 * The base class behind every field that renders a list of options: `select-field`, whose native `<select>`
 * walks its list itself, and the four of `BaseOptionField`, which walk theirs with a highlight. It adds the
 * option inputs below to everything `BaseField` already gives a field.
 *
 * Options come from the `options` input, from projected `<formidable-field-option>` children, or from both.
 */
@Directive()
export abstract class BaseOptionListField<T = string | null> extends BaseField<T> {
  /** Options bound as data. Merged with any projected `<formidable-field-option>` children, not replaced. */
  public readonly options = input<FormidableOption[] | undefined>([]);

  /** An option pinned to the top of the list, never sorted and never filtered. See `defaultOptionMode`. */
  public readonly defaultOption = input<FormidableOption | undefined>(undefined);

  /** Whether the `defaultOption` always renders, or only when there would otherwise be no options. */
  public readonly defaultOptionMode = input<FieldDefaultOptionMode>('always');

  /** What renders in place of an empty list. Nothing there can be picked. */
  public readonly noOptionsText = input<string>(NO_OPTIONS_TEXT);

  /** Orders the merged list. Applied after the merge, so bound and projected options interleave. */
  public readonly sortFn = input<((a: FormidableOption, b: FormidableOption) => number) | undefined>(undefined);

  /** The projected options. One may sit inside a wrapper element rather than directly in the field. */
  public readonly optionComponents = contentChildren<FormidableOptionSource>(FORMIDABLE_OPTION, {
    descendants: true
  });

  constructor() {
    super();

    // One source of truth for "the option list moved".
    //
    // A projected option resolves its content — and therefore its label — in its own `ngAfterContentInit`,
    // and an option inside an `@for` has not had its `required` inputs applied while this effect runs.
    // Reading either now gives a wrong label or throws NG0950; the render hook lands after both.
    effect(() => {
      this.optionSources();
      untracked(() => afterNextRender(() => this.onOptionsChanged(), { injector: this.injector }));
    });
  }

  // What the effect above watches. Not the merged list itself: each field merges differently, and the
  // reconcile needs to run for a changed `sortFn` as much as for a changed option.
  //
  // The projected children are watched both by the query and by each one's `option()` — see
  // `trackProjectedOptions`.
  //
  // Overridden by a field with option inputs of its own, so those move the list too.
  protected optionSources(): unknown[] {
    trackProjectedOptions(this.optionComponents());

    return [this.options(), this.defaultOption(), this.defaultOptionMode(), this.sortFn(), this.optionComponents()];
  }

  // Recombines the options, starting from `computeAllOptions()`.
  protected abstract onOptionsChanged(): void;

  // The bound and the projected options, merged and sorted: the list before `defaultOption` is pinned, which
  // each field does at its own point — `autocomplete-field` only after filtering.
  protected computeAllOptions(): FormidableOption[] {
    return combineFieldOptions(
      this.options(),
      this.optionComponents().map((source) => source.option()),
      this.sortFn()
    );
  }
}
