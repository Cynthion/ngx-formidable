import { Component, ElementRef, model, signal, viewChild } from '@angular/core';
import { applyDefaultOption } from '../../../helpers/option.helpers';
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
  imports: [FieldOption],
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
export class CheckboxGroupField extends BaseOptionField<string[]> {
  readonly checkboxGroupRef = viewChild.required<ElementRef<HTMLDivElement>>('checkboxGroupRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.navigateOptions(event);
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' '];

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // #region FormidableField

  /** The picked options' values, in the order they were picked. Empty for none. */
  public readonly value = model<string[]>([]);

  // A pick builds a new array, so equal contents are the same value. A classic control starts out `null`.
  protected override isSameValue(a: string[] | null, b: string[] | null): boolean {
    return a === b || (!!a && !!b && a.length === b.length && a.every((value, index) => value === b[index]));
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.checkboxGroupRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'vertical';

  // #endregion

  // #region FormidableOptionField

  public readonly optionRole: FieldOptionRole = 'checkbox';

  protected readonly activeOptions = signal<FormidableOption[]>([]);

  public selectOption(option: FormidableOption): void {
    if (!this.canEdit() || option.disabled || option.readonly) return;

    const current = this.picked;
    const next = current.includes(option.value)
      ? current.filter((value) => value !== option.value)
      : [...current, option.value];

    this.setValue(next);
  }

  protected onOptionsChanged(): void {
    this.activeOptions.set(
      applyDefaultOption(this.computeAllOptions(), this.defaultOption(), this.defaultOptionMode())
    );
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
