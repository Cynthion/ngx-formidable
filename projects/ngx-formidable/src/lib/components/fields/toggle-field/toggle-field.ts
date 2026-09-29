import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, input, model, viewChild } from '@angular/core';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FormidableToggleFieldLabelPosition
} from '../../../models/formidable.model';
import { BaseField } from '../base-field';

/**
 * A boolean rendered as a switch, with an optional label on either side of it.
 *
 * Its decorator renders in the `inline` layout, so the label always sits outside whatever position is set on
 * it — the switch is a fixed-size pill with no value area for a label to rest in.
 */
@Component({
  selector: 'formidable-toggle-field',
  templateUrl: './toggle-field.html',
  styleUrls: ['./toggle-field.scss'],
  imports: [NgTemplateOutlet],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: ToggleField
    }
  ]
})
export class ToggleField extends BaseField<boolean> {
  readonly toggleRef = viewChild.required<ElementRef<HTMLDivElement>>('toggleRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected registeredKeys = [' ', 'Space', 'Enter'];

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  private handleKeydown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case ' ':
      case 'Space':
      case 'Enter':
        this.toggle();
        return true;
      default:
        return false;
    }
  }

  // #region FormidableField

  /** Whether the switch is on. */
  public readonly value = model(false);

  get fieldRef(): ElementRef<HTMLElement> {
    return this.toggleRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'inline';

  // #endregion

  // #region Toggle

  /** Which side of the switch `onLabel` / `offLabel` sits on. Unrelated to a projected label's position. */
  public readonly labelPosition = input<FormidableToggleFieldLabelPosition | undefined>('before');

  /** Text shown beside the switch while on. The field's own, not a projected label. */
  public readonly onLabel = input<string | undefined>(undefined);

  /** Text shown beside the switch while off. Leave unset to show `onLabel` in both states. */
  public readonly offLabel = input<string | undefined>(undefined);

  /** Flips the value, as clicking the switch or pressing Space or Enter does. No-op while readonly. */
  public toggle(): void {
    if (this.readonly() || this.disabled()) return;

    this.setValue(!this.value());
  }

  protected onToggleClick(event: MouseEvent): void {
    event.preventDefault();
    this.toggle();
  }

  get internalLabel(): string | undefined {
    if (this.value() && this.onLabel() != null) return this.onLabel();
    if (!this.value() && this.offLabel() != null) return this.offLabel();
    return undefined;
  }

  // #endregion
}
