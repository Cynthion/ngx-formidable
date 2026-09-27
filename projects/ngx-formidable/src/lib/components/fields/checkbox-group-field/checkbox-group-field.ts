import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, forwardRef, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { applyDefaultOption, combineFieldOptions, getNextAvailableOptionIndex } from '../../../helpers/option.helpers';
import {
  FieldDecoratorLayout,
  FieldOptionRole,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
  FormidableCheckboxGroupField,
  FormidableOption
} from '../../../models/formidable.model';
import { FieldOption } from '../../field-option/field-option';
import { BaseOptionField } from '../base-option-field';

/**
 * Several choices from options laid out in place rather than in a panel. The only field whose value is an
 * array — every other option field commits a single value.
 *
 * Its decorator renders in the `vertical` layout, so the label always sits outside whatever position is set
 * on it, and a projected prefix or suffix is not rendered. `radio-group-field` is the single-choice one.
 */
@Component({
  selector: 'formidable-checkbox-group-field',
  templateUrl: './checkbox-group-field.html',
  styleUrls: ['./checkbox-group-field.scss'],
  imports: [NgTemplateOutlet, FieldOption],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxGroupField),
      multi: true
    },
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: CheckboxGroupField
    },
    // required to provide this component as FormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: CheckboxGroupField
    }
  ]
})
export class CheckboxGroupField
  extends BaseOptionField<string[]>
  implements FormidableCheckboxGroupField, OnInit, OnDestroy
{
  readonly checkboxGroupRef = viewChild.required<ElementRef<HTMLDivElement>>('checkboxGroupRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter'];

  private readonly _writtenValues = signal<string[]>([]);

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

  protected doWriteValue(value: string[]): void {
    this._writtenValues.set(Array.isArray(value) ? value : []);
    this.isFieldFilled.set(this._writtenValues().length > 0);
  }

  // #endregion

  // #region FormidableField

  get value(): string[] {
    return this._writtenValues();
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.checkboxGroupRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'vertical';

  // #endregion

  // #region FormidableCheckboxGroupField

  // empty

  // #endregion

  // #region FormidableOptionField

  public readonly optionRole: FieldOptionRole = 'checkbox';

  protected readonly activeOptions = signal<FormidableOption[]>([]);

  public selectOption(option: FormidableOption): void {
    if (option.disabled) return;

    const curr = this._writtenValues();
    const exists = curr.includes(option.value);

    const next = exists ? curr.filter((v) => v !== option.value) : [...curr, option.value];

    // commit selection
    this._writtenValues.set(next);

    // emit value change
    this.valueChangeSubject$.next(next);
    this.valueChanged.emit(next);
    this.isFieldFilled.set(next.length > 0);
    this.commit(next); // notify ControlValueAccessor of the change
    this.touch();
  }

  protected onOptionsChanged(): void {
    const allOptions = this.computeAllOptions();

    this.updateOptions(allOptions);
    // A changed options list is not the user, so the reconcile may correct the model but not touch.
    this.runSilently('correction', () => this.reconcileSelectionAgainstOptions(allOptions));
    this.reconcileHighlightAfterOptionsChanged();
  }

  private computeAllOptions(): FormidableOption[] {
    const combined = combineFieldOptions(
      this.options(),
      this.optionComponents().map((source) => source.option()),
      this.sortFn()
    );

    return applyDefaultOption(combined, this.defaultOption(), this.defaultOptionMode());
  }

  private updateOptions(allOptions: FormidableOption[]): void {
    this.activeOptions.set(allOptions);

    // keep current value in sync with newly combined options
    this.writeValue(this._writtenValues());
  }

  private reconcileSelectionAgainstOptions(allOptions: FormidableOption[]): void {
    if (!this._writtenValues().length) return;

    const allowed = new Set(allOptions.map((o) => o.value));
    const filtered = this._writtenValues().filter((v) => allowed.has(v));

    if (filtered.length === this._writtenValues().length) return; // no change

    // commit
    this._writtenValues.set(filtered);

    // emit like other fields when selection becomes invalid
    this.valueChangeSubject$.next(filtered);
    this.valueChanged.emit(filtered);
    this.isFieldFilled.set(filtered.length > 0);
    this.commit(filtered);
    this.touch();
  }

  // #endregion

  protected isChecked(value: string): boolean {
    return this._writtenValues().includes(value);
  }
}
