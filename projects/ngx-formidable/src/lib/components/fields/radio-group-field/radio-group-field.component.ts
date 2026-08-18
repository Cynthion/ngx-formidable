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
  IFormidableOption,
  IFormidableRadioGroupField
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseOptionFieldDirective } from '../base-option-field.directive';

/**
 * A single choice from options laid out in place rather than in a panel — the choice to make when every
 * option should stay visible. `dropdown-field` puts the same choice behind a panel.
 *
 * Its decorator renders in the `vertical` layout, so the label always sits outside whatever position is set
 * on it, and a projected prefix or suffix is not rendered. `checkbox-group-field` is the multi-choice one.
 */
@Component({
  selector: 'formidable-radio-group-field',
  templateUrl: './radio-group-field.component.html',
  styleUrls: ['./radio-group-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FieldOptionComponent],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: RadioGroupFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: RadioGroupFieldComponent
    }
  ]
})
export class RadioGroupFieldComponent
  extends BaseOptionFieldDirective<string | null>
  implements IFormidableRadioGroupField, OnInit, OnDestroy
{
  @ViewChild('radioGroupRef', { static: true }) radioGroupRef!: ElementRef<HTMLDivElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter'];

  private _writtenValue: string | null = null;

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

  protected doWriteValue(value: string | null): void {
    this._writtenValue = value ?? null;

    const found = this.computeAllOptions().find((opt) => opt.value === value);
    this.selectedOption = found ? { ...found } : undefined;

    this.isFieldFilled = !!this.selectedOption?.value;
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectedOption?.value || null;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.radioGroupRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'vertical';

  // #endregion

  // #region IFormidableRadioGroupField

  // empty

  // #endregion

  // #region IFormidableOptionField

  public readonly optionRole: FieldOptionRole = 'radio';

  protected readonly options$ = new BehaviorSubject<IFormidableOption[]>([]);

  private selectedOption?: IFormidableOption = undefined;

  protected get activeOptions(): IFormidableOption[] {
    return this.options$.value;
  }

  protected override get selectedOptionValue(): string | null {
    return this.selectedOption?.value ?? null;
  }

  public selectOption(option: IFormidableOption): void {
    if (option.disabled) return;

    const newOption: IFormidableOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    // commit selection
    this.selectedOption = newOption;
    this._writtenValue = newOption.value;

    // emit value change
    const newValue = this.selectedOption.value;
    this.valueChangeSubject$.next(newValue);
    this.valueChanged.emit(newValue);
    this.isFieldFilled = newValue.length > 0;
    this.commit(newValue); // notify ControlValueAccessor of the change
    this.touch();

    // immediately highlight the selected option
    this.highlightSelectedOption();

    this.cdRef.markForCheck();
  }

  private deselectOption(): void {
    // only do work if there actually was a selection
    if (!this.selectedOption) return;

    this.setHighlightedIndex(-1);
    this.selectedOption = undefined;

    this._writtenValue = null;
    this.isFieldFilled = false;

    this.valueChangeSubject$.next(null);
    this.valueChanged.emit(null);
    this.commit(null);
    this.touch();

    this.cdRef.markForCheck();
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    // Reconciled before the options are applied: `updateOptions` re-applies the written value, which
    // clears `selectedOption` and would leave the reconcile nothing to find.
    // A changed options list is not the user, so the reconcile may correct the model but not touch.
    this.runSilently('correction', () => this.reconcileSelectionAgainstOptions(allOptions));
    this.updateOptions(allOptions);
    this.reconcileHighlightAfterOptionsChanged();

    this.cdRef.markForCheck();
  }

  private computeAllOptions(): IFormidableOption[] {
    const combined = combineFieldOptions(this.options, this.optionComponents?.toArray(), this.sortFn);

    return applyDefaultOption(combined, this.defaultOption, this.defaultOptionMode);
  }

  private updateOptions(allOptions: IFormidableOption[]): void {
    this.options$.next(allOptions);

    // keep current value in sync with newly combined options
    this.writeValue(this._writtenValue);
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableOption[]): void {
    if (!this.selectedOption) return;

    const stillExists = allOptions.some((o) => o.value === this.selectedOption!.value);
    if (!stillExists) {
      this.deselectOption();
    }
  }

  // #endregion
}
