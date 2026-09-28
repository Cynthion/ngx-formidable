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
 * A single choice from options laid out in place rather than in a panel — the choice to make when every
 * option should stay visible. `dropdown-field` puts the same choice behind a panel.
 *
 * Its decorator renders in the `vertical` layout, so the label always sits outside whatever position is set
 * on it, and a projected prefix or suffix is not rendered. `checkbox-group-field` is the multi-choice one.
 */
@Component({
  selector: 'formidable-radio-group-field',
  templateUrl: './radio-group-field.html',
  styleUrls: ['./radio-group-field.scss'],
  imports: [NgTemplateOutlet, FieldOption],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: RadioGroupField
    },
    // required to provide this component as FormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: RadioGroupField
    }
  ]
})
export class RadioGroupField extends BaseOptionField<string | null> implements OnInit, OnDestroy {
  readonly radioGroupRef = viewChild.required<ElementRef<HTMLDivElement>>('radioGroupRef');

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

  /** The picked option's value, or `null` for none. */
  public readonly value = model<string | null>(null);

  get fieldRef(): ElementRef<HTMLElement> {
    return this.radioGroupRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'vertical';

  // #endregion

  // #region Radio Group

  // empty

  // #endregion

  // #region FormidableOptionField

  public readonly optionRole: FieldOptionRole = 'radio';

  protected readonly activeOptions = signal<FormidableOption[]>([]);

  protected override get selectedOptionValue(): string | null {
    return this.value();
  }

  public selectOption(option: FormidableOption): void {
    if (option.disabled) return;

    this.setValue(option.value);
    this.touch.emit();

    // immediately highlight the selected option
    this.highlightSelectedOption();
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
}
