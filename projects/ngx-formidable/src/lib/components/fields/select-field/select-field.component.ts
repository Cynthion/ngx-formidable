import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  input,
  OnChanges,
  QueryList,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { applyDefaultOption, combineFieldOptions } from '../../../helpers/option.helpers';
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
export class SelectFieldComponent
  extends BaseFieldDirective<string | null>
  implements IFormidableSelectField, OnChanges, AfterContentInit
{
  @ViewChild('selectRef', { static: true }) selectRef!: ElementRef<HTMLSelectElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // react to changes of the option inputs
    if (changes['options'] || changes['defaultOption'] || changes['defaultOptionMode'] || changes['sortFn']) {
      queueMicrotask(() => this.onOptionsChanged());
    }
  }

  ngAfterContentInit(): void {
    // The projected options (option.template) might not be available immediately after content initialization,
    // so we use queueMicrotask to ensure they are processed after the current change detection cycle.
    queueMicrotask(() => this.onOptionsChanged());

    this.optionComponents?.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => queueMicrotask(() => this.onOptionsChanged()));
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string | null): void {
    const match = this.computeAllOptions().find((opt) => opt.value === value);

    // write to wrapped select element
    this.selectRef.nativeElement.value = match ? match.value : '';

    this.isFieldFilled = this.selectRef.nativeElement.value.length > 0;
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectRef.nativeElement.value || null;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.selectRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // A native <select> always renders something in its value area, so a label can never rest there: with
  // nothing selected it shows its first option, and with no options at all it shows `noOptionsText`.
  protected override get showsEmptyValueHint(): boolean {
    return true;
  }

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

  @ContentChildren(FORMIDABLE_OPTION, { descendants: true })
  optionComponents?: QueryList<IFormidableOptionSource>;

  protected readonly options$ = new BehaviorSubject<IFormidableOption[]>([]);

  public selectOption(_option: IFormidableOption): void {
    // Native <select> chooses options; not used.
  }

  private onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateOptions(allOptions);
    this.reconcileSelectionAgainstOptions(allOptions);

    this.cdRef.markForCheck();
  }

  private computeAllOptions(): IFormidableOption[] {
    const combined = combineFieldOptions(
      this.options(),
      this.optionComponents?.map((source) => source.option()),
      this.sortFn()
    );

    return applyDefaultOption(combined, this.defaultOption(), this.defaultOptionMode());
  }

  private updateOptions(allOptions: IFormidableOption[]): void {
    this.options$.next(allOptions);

    // keep current value consistent with updated options
    this.writeValue(this.selectRef?.nativeElement?.value ?? '');
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableOption[]): void {
    const current = this.selectRef.nativeElement.value;
    if (!current) return;

    const stillExists = allOptions.some((o) => o.value === current);
    if (stillExists) return;

    // clear selection + notify like other fields
    this.selectRef.nativeElement.value = '';
    this.onValueChange();
  }

  // #endregion
}
