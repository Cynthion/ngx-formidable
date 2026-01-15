import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  QueryList,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, takeUntil } from 'rxjs';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_FIELD_OPTION,
  FORMIDABLE_OPTION_FIELD,
  IFormidableFieldOption,
  IFormidableSelectField,
  NO_OPTIONS_TEXT
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A configurable `<select>` element.
 * Supports:
 * - `name`, `placeholder`, `readonly`, `disabled`
 * - `[options]`: IFormidableFieldOption[]
 * - `<formidable-field-option>` children
 * - `[noOptionText]`, `[sortFn]`
 *
 * @example
 * ```html
 * <formidable-select-field name="country" ngModel [options]="countryList">
 *  <!-- Optional inline options -->
 *  <formidable-field-option [value]="'us'" [label]="'United States'"></formidable-field-option>
 * </formidable-select-field>
 * ```
 */
@Component({
  selector: 'formidable-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
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
  extends BaseFieldDirective
  implements IFormidableSelectField, OnChanges, AfterContentInit, OnDestroy
{
  @ViewChild('selectRef', { static: true }) selectRef!: ElementRef<HTMLSelectElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  private readonly cdRef = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    // react to changes of @Input properties
    if (changes['options'] || changes['sortFn']) {
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

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string): void {
    const match = this.options$.value.find((opt) => opt.value === value);

    // write to wrapped select element
    this.selectRef.nativeElement.value = match ? match.value : '';

    this.isFieldFilled = this.selectRef.nativeElement.value.length > 0;
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectRef.nativeElement.value || null;
  }

  get isLabelFloating(): boolean {
    const blocked = this.disabled || this.readonly;
    return !blocked && !this.isFieldFocused && !this.isFieldFilled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.selectRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  // #endregion

  // #region IFormidableOptionField

  @Input() options?: IFormidableFieldOption[] = [];
  @Input() noOptionsText: string = NO_OPTIONS_TEXT;
  @Input() sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number;

  @ContentChildren(FORMIDABLE_FIELD_OPTION)
  optionComponents?: QueryList<IFormidableFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormidableFieldOption[]>([]);

  public selectOption(_option: IFormidableFieldOption): void {
    // Native <select> chooses options; not used.
  }

  private onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateOptions(allOptions);
    this.reconcileSelectionAgainstOptions(allOptions);

    this.cdRef.markForCheck();
  }

  private computeAllOptions(): IFormidableFieldOption[] {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    let combined = [...inlineOptions, ...projectedOptions];

    if (this.sortFn) {
      combined = [...combined].sort(this.sortFn);
    }

    return combined;
  }

  private updateOptions(allOptions: IFormidableFieldOption[]): void {
    this.options$.next(allOptions);

    // keep current value consistent with updated options
    this.writeValue(this.selectRef?.nativeElement?.value ?? '');
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableFieldOption[]): void {
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
