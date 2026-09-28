import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, model, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { applyDefaultOption, combineFieldOptions, getNextAvailableOptionIndex } from '../../../helpers/option.helpers';
import {
  FieldDecoratorLayout,
  FieldOptionRole,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
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
export class CheckboxGroupField extends BaseOptionField<string[]> implements OnInit, OnDestroy {
  readonly checkboxGroupRef = viewChild.required<ElementRef<HTMLDivElement>>('checkboxGroupRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter'];

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

  // #region FormidableField

  /** The picked options' values, in the order they were picked. Empty for none. */
  public readonly value = model<string[]>([]);

  // A pick builds a new array, so equal contents are the same value.
  protected override isSameValue(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.checkboxGroupRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'vertical';

  // #endregion

  // #region Checkbox Group

  // empty

  // #endregion

  // #region FormidableOptionField

  public readonly optionRole: FieldOptionRole = 'checkbox';

  protected readonly activeOptions = signal<FormidableOption[]>([]);

  public selectOption(option: FormidableOption): void {
    if (option.disabled) return;

    const current = this.picked;
    const next = current.includes(option.value)
      ? current.filter((value) => value !== option.value)
      : [...current, option.value];

    this.setValue(next);
    this.touch.emit();
  }

  protected onOptionsChanged(): void {
    const combined = combineFieldOptions(
      this.options(),
      this.optionComponents().map((source) => source.option()),
      this.sortFn()
    );

    this.activeOptions.set(applyDefaultOption(combined, this.defaultOption(), this.defaultOptionMode()));
    this.reconcileHighlightAfterOptionsChanged();
  }

  // #endregion

  protected isChecked(value: string): boolean {
    return this.picked.includes(value);
  }

  // A classic control is `null` until something writes it.
  private get picked(): string[] {
    return this.value() ?? [];
  }
}
