import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  effect,
  ElementRef,
  forwardRef,
  input,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { applyDefaultOption, combineFieldOptions, trackProjectedOptions } from '../../../helpers/option.helpers';
import {
  FieldDecoratorLayout,
  FieldDefaultOptionMode,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION,
  FORMIDABLE_OPTION_FIELD,
  IFormidableOption,
  IFormidableOptionSource,
  IFormidableSelectField,
  NO_OPTIONS_TEXT
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A single choice from a native `<select>`, so its list is the platform's and opens where the platform puts
 * it. Pick this one when a native picker on mobile beats a styled panel — `dropdown-field` is the styled one,
 * and `autocomplete-field` the one that filters as you type.
 */
@Component({
  selector: 'formidable-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: SelectFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: SelectFieldComponent
    }
  ]
})
export class SelectFieldComponent extends BaseFieldDirective<string | null> implements IFormidableSelectField {
  readonly selectRef = viewChild.required<ElementRef<HTMLSelectElement>>('selectRef');

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  constructor() {
    super();

    // `BaseOptionFieldDirective` has the same effect, including why the read is deferred to a microtask;
    // this field stays on `BaseFieldDirective`, because a native `<select>` has no highlight and would
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

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  /** The user picked one, so the element is now the source and the signal follows it. */
  protected onSelectChanged(): void {
    this.selectedValue.set(this.selectRef().nativeElement.value || null);
    this.onValueChange();
  }

  // #region ControlValueAccessor

  /**
   * What is selected, as a signal, because the element cannot be asked: a native `<select>` drops a value it
   * has no `<option>` for, and the options only reach the DOM a change-detection pass after the list moves.
   * The template marks the matching option from this, so the browser selects it as the options render.
   */
  protected readonly selectedValue = signal<string | null>(null);

  /**
   * What the form last asked for, which is not always what could be selected. Kept so a value written before
   * its option existed can be applied again once the list arrives.
   */
  private lastWrittenValue: string | null = null;

  protected doWriteValue(value: string | null): void {
    this.lastWrittenValue = value;

    const match = this.computeAllOptions().find((opt) => opt.value === value);
    const next = match ? match.value : null;

    this.selectedValue.set(next);

    // write to wrapped select element
    this.selectRef().nativeElement.value = next ?? '';

    this.isFieldFilled.set(next !== null);
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectRef().nativeElement.value || null;
  }

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

  // #region IFormidableOptionField

  /** Options bound as data. Merged with any projected `<formidable-field-option>` children, not replaced. */
  public readonly options = input<IFormidableOption[] | undefined>([]);

  /** An option pinned to the top of the list — the usual home for a "please choose" entry. */
  public readonly defaultOption = input<IFormidableOption | undefined>(undefined);

  /** Whether the `defaultOption` always renders, or only when there would otherwise be no options. */
  public readonly defaultOptionMode = input<FieldDefaultOptionMode>('always');

  /** What renders in place of an empty list. */
  public readonly noOptionsText = input<string>(NO_OPTIONS_TEXT);

  /** Orders the merged list. Applied after the merge, so bound and projected options interleave. */
  public readonly sortFn = input<((a: IFormidableOption, b: IFormidableOption) => number) | undefined>(undefined);

  /** The projected options. One may sit inside a wrapper element rather than directly in the field. */
  public readonly optionComponents = contentChildren<IFormidableOptionSource>(FORMIDABLE_OPTION, {
    descendants: true
  });

  protected readonly activeOptions = signal<IFormidableOption[]>([]);

  public selectOption(_option: IFormidableOption): void {
    // Native <select> chooses options; not used.
  }

  private onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateOptions(allOptions);
    this.reconcileSelectionAgainstOptions(allOptions);
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
    this.activeOptions.set(allOptions);

    // Keep the current value consistent with the updated options. The element comes first — it is what the
    // user picked — then what is selected, then what the form last asked for, which is the one that recovers
    // a value the element had to drop because its `<option>` did not exist yet.
    const element = this.selectRef()?.nativeElement;

    this.writeValue(element?.value || this.selectedValue() || this.lastWrittenValue || '');
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableOption[]): void {
    const current = this.selectedValue();
    if (!current) return;

    const stillExists = allOptions.some((o) => o.value === current);
    if (stillExists) return;

    // clear selection + notify like other fields
    this.selectedValue.set(null);
    this.selectRef().nativeElement.value = '';
    this.onValueChange();
  }

  // #endregion
}
