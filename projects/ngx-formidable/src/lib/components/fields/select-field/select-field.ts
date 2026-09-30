import { Component, computed, ElementRef, model, signal, viewChild } from '@angular/core';
import { applyDefaultOption } from '../../../helpers/option.helpers';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_OPTION_FIELD,
  FormidableOption
} from '../../../models/formidable.model';
import { BaseOptionListField } from '../base-option-list-field';

/**
 * A single choice from a native `<select>`, so its list is the platform's and opens where the platform puts
 * it. Pick this one when a native picker on mobile beats a styled panel — `dropdown-field` is the styled one,
 * and `autocomplete-field` the one that filters as you type.
 */
@Component({
  selector: 'formidable-select-field',
  templateUrl: './select-field.html',
  styleUrls: ['./select-field.scss'],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: SelectField
    },
    // required to provide this component as FormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: SelectField
    }
  ]
})
export class SelectField extends BaseOptionListField<string | null> {
  readonly selectRef = viewChild.required<ElementRef<HTMLSelectElement>>('selectRef');

  protected keyboardCallback = null;
  protected registeredKeys: string[] = [];

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  protected onSelectChanged(): void {
    this.setValue(this.selectRef().nativeElement.value);
  }

  // #region FormidableField

  /**
   * The picked option's value, or `null` for none. A value no option carries renders as no selection — the
   * `placeholder`, or nothing — rather than as whichever option the platform would put in its place.
   */
  public readonly value = model<string | null>(null);

  get fieldRef(): ElementRef<HTMLElement> {
    return this.selectRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // Mirrors the template: the arrow is drawn only while the field can actually open its list. It overlays
  // the select instead of taking a slot beside the value, but the inset it asks the decorator for is the
  // same — a label still has to clear it.
  readonly hasInFieldToggle = this.canEdit;

  // #endregion

  // #region FormidableOptionField

  protected readonly activeOptions = signal<FormidableOption[]>([]);

  // The option the model names, if it has arrived.
  protected readonly selectedOption = computed(() =>
    this.activeOptions().find((option) => option.value === this.value())
  );

  public selectOption(_option: FormidableOption): void {
    // Native <select> chooses options; not used.
  }

  protected onOptionsChanged(): void {
    this.activeOptions.set(
      applyDefaultOption(this.computeAllOptions(), this.defaultOption(), this.defaultOptionMode())
    );
  }

  // #endregion
}
