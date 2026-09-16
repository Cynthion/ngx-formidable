import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
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
  readonly radioGroupRef = viewChild.required<ElementRef<HTMLDivElement>>('radioGroupRef');

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
    const options = this.activeOptions();
    const count = options.length;

    switch (event.key) {
      case 'ArrowDown':
        if (count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex(), options, 'down'));
        }
        break;
      case 'ArrowUp':
        if (count > 0) {
          this.setHighlightedIndex(getNextAvailableOptionIndex(this.highlightedOptionIndex(), options, 'up'));
        }
        break;
      case 'Enter': {
        const idx = this.highlightedOptionIndex();
        const option = this.activeOptions()[idx];
        if (option) this.selectOption(option);
        break;
      }
    }
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string | null): void {
    this._writtenValue = value ?? null;

    const found = this.computeAllOptions().find((opt) => opt.value === value);
    this.selectedOption.set(found ? { ...found } : undefined);

    this.isFieldFilled.set(!!this.selectedOption()?.value);
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    return this.selectedOption()?.value || null;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.radioGroupRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'vertical';

  // #endregion

  // #region IFormidableRadioGroupField

  // empty

  // #endregion

  // #region IFormidableOptionField

  public readonly optionRole: FieldOptionRole = 'radio';

  protected readonly activeOptions = signal<IFormidableOption[]>([]);

  private readonly selectedOption = signal<IFormidableOption | undefined>(undefined);

  protected override get selectedOptionValue(): string | null {
    return this.selectedOption()?.value ?? null;
  }

  public selectOption(option: IFormidableOption): void {
    if (option.disabled) return;

    const newOption: IFormidableOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    // commit selection
    this.selectedOption.set(newOption);
    this._writtenValue = newOption.value;

    // emit value change
    const newValue = newOption.value;
    this.valueChangeSubject$.next(newValue);
    this.valueChanged.emit(newValue);
    this.isFieldFilled.set(newValue.length > 0);
    this.commit(newValue); // notify ControlValueAccessor of the change
    this.touch();

    // immediately highlight the selected option
    this.highlightSelectedOption();
  }

  private deselectOption(): void {
    // only do work if there actually was a selection
    if (!this.selectedOption()) return;

    this.setHighlightedIndex(-1);
    this.selectedOption.set(undefined);

    this._writtenValue = null;
    this.isFieldFilled.set(false);

    this.valueChangeSubject$.next(null);
    this.valueChanged.emit(null);
    this.commit(null);
    this.touch();
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    // Reconciled before the options are applied: `updateOptions` re-applies the written value, which
    // clears `selectedOption` and would leave the reconcile nothing to find.
    // A changed options list is not the user, so the reconcile may correct the model but not touch.
    this.runSilently('correction', () => this.reconcileSelectionAgainstOptions(allOptions));
    this.updateOptions(allOptions);
    this.reconcileHighlightAfterOptionsChanged();
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

    // keep current value in sync with newly combined options
    this.writeValue(this._writtenValue);
  }

  private reconcileSelectionAgainstOptions(allOptions: IFormidableOption[]): void {
    if (!this.selectedOption()) return;

    const stillExists = allOptions.some((o) => o.value === this.selectedOption()!.value);
    if (!stillExists) {
      this.deselectOption();
    }
  }

  // #endregion
}
