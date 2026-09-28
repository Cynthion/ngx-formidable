import {
  Component,
  computed,
  contentChildren,
  effect,
  ElementRef,
  input,
  model,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { applyDefaultOption, combineFieldOptions, trackProjectedOptions } from '../../../helpers/option.helpers';
import {
  FieldDecoratorLayout,
  FieldDefaultOptionMode,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION,
  FORMIDABLE_OPTION_FIELD,
  FormidableOption,
  FormidableOptionSource,
  NO_OPTIONS_TEXT
} from '../../../models/formidable.model';
import { BaseField } from '../base-field';

/**
 * A single choice from a native `<select>`, so its list is the platform's and opens where the platform puts
 * it. Pick this one when a native picker on mobile beats a styled panel — `dropdown-field` is the styled one,
 * and `autocomplete-field` the one that filters as you type.
 */
@Component({
  selector: 'formidable-select-field',
  templateUrl: './select-field.html',
  styleUrls: ['./select-field.scss'],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: SelectField
    },
    // required to provide this component as FormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: SelectField
    }
  ]
})
export class SelectField extends BaseField<string | null> {
  readonly selectRef = viewChild.required<ElementRef<HTMLSelectElement>>('selectRef');

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  constructor() {
    super();

    // `BaseOptionField` has the same effect, including why the read is deferred to a microtask;
    // this field stays on `BaseField`, because a native `<select>` has no highlight and would
    // only inherit dead state.
    effect(() => {
      this.options();
      this.defaultOption();
      this.defaultOptionMode();
      this.sortFn();
      trackProjectedOptions(this.optionComponents());

      untracked(() => queueMicrotask(() => this.onOptionsChanged()));
    });
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  /** The user picked one. */
  protected onSelectChanged(): void {
    this.setValue(this.selectRef().nativeElement.value || null);
  }

  // #region FormidableField

  /**
   * The picked option's value, or `null` for none. The template marks the matching option from it, so the
   * browser selects that option as the options render — a native `<select>` cannot hold a value before its
   * `<option>` exists.
   */
  public readonly value = model<string | null>(null);

  get fieldRef(): ElementRef<HTMLElement> {
    return this.selectRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // A native <select> always renders something in its value area, so a label can never rest there: with
  // nothing selected it shows its first option, and with no options at all it shows `noOptionsText`.
  protected override readonly showsEmptyValueHint = signal(true);

  // Mirrors the template: the arrow is drawn only while the field can actually open its list. It overlays
  // the select instead of taking a slot beside the value, but the inset it asks the decorator for is the
  // same — a label still has to clear it.
  readonly hasInFieldToggle = computed(() => !this.readonly() && !this.disabled());

  // #endregion

  // #region FormidableOptionField

  /** Options bound as data. Merged with any projected `<formidable-field-option>` children, not replaced. */
  public readonly options = input<FormidableOption[] | undefined>([]);

  /** An option pinned to the top of the list — the usual home for a "please choose" entry. */
  public readonly defaultOption = input<FormidableOption | undefined>(undefined);

  /** Whether the `defaultOption` always renders, or only when there would otherwise be no options. */
  public readonly defaultOptionMode = input<FieldDefaultOptionMode>('always');

  /** What renders in place of an empty list. */
  public readonly noOptionsText = input<string>(NO_OPTIONS_TEXT);

  /** Orders the merged list. Applied after the merge, so bound and projected options interleave. */
  public readonly sortFn = input<((a: FormidableOption, b: FormidableOption) => number) | undefined>(undefined);

  /** The projected options. One may sit inside a wrapper element rather than directly in the field. */
  public readonly optionComponents = contentChildren<FormidableOptionSource>(FORMIDABLE_OPTION, {
    descendants: true
  });

  protected readonly activeOptions = signal<FormidableOption[]>([]);

  public selectOption(_option: FormidableOption): void {
    // Native <select> chooses options; not used.
  }

  private onOptionsChanged(): void {
    const combined = combineFieldOptions(
      this.options(),
      this.optionComponents().map((source) => source.option()),
      this.sortFn()
    );

    this.activeOptions.set(applyDefaultOption(combined, this.defaultOption(), this.defaultOptionMode()));
  }

  // #endregion
}
