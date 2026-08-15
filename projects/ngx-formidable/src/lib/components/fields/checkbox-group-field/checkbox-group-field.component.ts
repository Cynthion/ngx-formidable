import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { applyDefaultOption, combineFieldOptions, getNextAvailableOptionIndex } from '../../../helpers/option.helpers';
import {
  FieldDecoratorLayout,
  FieldOptionRole,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
  IFormidableCheckboxGroupField,
  IFormidableFieldOption
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseOptionFieldDirective } from '../base-option-field.directive';

/**
 * A configurable group of selectable checkbox options.
 * Supports:
 * - `name`, `readonly`, `disabled`
 * - `[options]`: IFormidableFieldOption[]
 * - `<formidable-field-option>` children
 * - `[noOptionText]`, `[sortFn]`
 *
 * @example
 * ```html
 * <formidable-checkbox-group-field name="allergies" ngModel [options]="allergyOptions">
 *   <!-- Optional inline options -->
 *   <formidable-field-option [value]="'nuts'" [label]="'Nuts'"></formidable-field-option>
 * </formidable-checkbox-group-field>
 * ```
 */
@Component({
  selector: 'formidable-checkbox-group-field',
  templateUrl: './checkbox-group-field.component.html',
  styleUrls: ['./checkbox-group-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FieldOptionComponent],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxGroupFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: CheckboxGroupFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: CheckboxGroupFieldComponent
    }
  ]
})
export class CheckboxGroupFieldComponent
  extends BaseOptionFieldDirective<string[]>
  implements IFormidableCheckboxGroupField, OnInit, OnDestroy
{
  @ViewChild('checkboxGroupRef', { static: true }) checkboxGroupRef!: ElementRef<HTMLDivElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter'];

  private _writtenValues: string[] = [];

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  private handleKeydown(event: KeyboardEvent): void {
    const options = this.options$.value;
    const count = options.length;

    switch (event.key) {
      case 'ArrowDown':
        if (count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex$.value, options, 'down'));
        }
        break;
      case 'ArrowUp':
        if (count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex$.value, options, 'up'));
        }
        break;
      case 'Enter': {
        const idx = this.highlightedOptionIndex$.value;
        const option = this.options$.value[idx];
        if (option) this.selectOption(option);
        break;
      }
    }
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string[]): void {
    this._writtenValues = Array.isArray(value) ? value : [];
    this.isFieldFilled = this._writtenValues.length > 0;
    this.cdRef.markForCheck();
  }

  // #endregion

  // #region IFormidableField

  get value(): string[] {
    return this._writtenValues;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.checkboxGroupRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'vertical';

  // #endregion

  // #region IFormidableCheckboxGroupField

  // empty

  // #endregion

  // #region IFormidableOptionField

  public readonly optionRole: FieldOptionRole = 'checkbox';

  protected readonly options$ = new BehaviorSubject<IFormidableFieldOption[]>([]);

  protected get activeOptions(): IFormidableFieldOption[] {
    return this.options$.value;
  }

  public selectOption(option: IFormidableFieldOption): void {
    if (option.disabled) return;

    const curr = this._writtenValues;
    const exists = curr.includes(option.value);

    const next = exists ? curr.filter((v) => v !== option.value) : [...curr, option.value];

    // commit selection
    this._writtenValues = next;

    // emit value change
    this.valueChangeSubject$.next(next);
    this.valueChanged.emit(next);
    this.isFieldFilled = next.length > 0;
    this.onChange(next); // notify ControlValueAccessor of the change
    this.touch();

    this.cdRef.markForCheck();
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateOptions(allOptions);
    // A changed options list is not the user, so the reconcile may correct the model but not touch.
    this.runSilently(() => this.reconcileSelectionAgainstOptions(allOptions));
    this.reconcileHighlightAfterOptionsChanged();

    this.cdRef.markForCheck();
  }

  private computeAllOptions(): IFormidableFieldOption[] {
    const combined = combineFieldOptions(this.options, this.optionComponents?.toArray(), this.sortFn);

    return applyDefaultOption(combined, this.defaultOption, this.defaultOptionMode);
  }

  private updateOptions(allOptions: IFormidableFieldOption[]): void {
    this.options$.next(allOptions);

    // keep current value in sync with newly combined options
    this.writeValue(this._writtenValues);
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableFieldOption[]): void {
    if (!this._writtenValues.length) return;

    const allowed = new Set(allOptions.map((o) => o.value));
    const filtered = this._writtenValues.filter((v) => allowed.has(v));

    if (filtered.length === this._writtenValues.length) return; // no change

    // commit
    this._writtenValues = filtered;

    // emit like other fields when selection becomes invalid
    this.valueChangeSubject$.next(filtered);
    this.valueChanged.emit(filtered);
    this.isFieldFilled = filtered.length > 0;
    this.onChange(filtered);
    this.touch();

    this.cdRef.markForCheck();
  }

  // #endregion

  protected isChecked(value: string): boolean {
    return this._writtenValues.includes(value);
  }
}
