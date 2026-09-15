import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FormidableToggleFieldLabelPosition,
  IFormidableToggleField
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A boolean rendered as a switch, with an optional label on either side of it.
 *
 * Its decorator renders in the `inline` layout, so the label always sits outside whatever position is set on
 * it — the switch is a fixed-size pill with no value area for a label to rest in.
 */
@Component({
  selector: 'formidable-toggle-field',
  templateUrl: './toggle-field.component.html',
  styleUrls: ['./toggle-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: ToggleFieldComponent
    }
  ]
})
export class ToggleFieldComponent extends BaseFieldDirective<boolean | null> implements IFormidableToggleField {
  @ViewChild('toggleRef', { static: true }) toggleRef!: ElementRef<HTMLDivElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = [' ', 'Space', 'Enter'];

  private _value: boolean | null = null;

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  private handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case ' ':
      case 'Space':
      case 'Enter':
        this.toggle();
        break;
    }
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: boolean): void {
    this._value = !!value;
  }

  // #endregion

  // #region IFormidableField

  get value(): boolean | null {
    return this._value;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.toggleRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'inline';

  // #endregion

  // #region IFormidableToggleField

  /** Which side of the switch `onLabel` / `offLabel` sits on. Unrelated to a projected label's position. */
  public readonly labelPosition = input<FormidableToggleFieldLabelPosition | undefined>('before');

  /** Text shown beside the switch while on. The field's own, not a projected label. */
  public readonly onLabel = input<string | undefined>(undefined);

  /** Text shown beside the switch while off. Leave unset to show `onLabel` in both states. */
  public readonly offLabel = input<string | undefined>(undefined);

  /** Flips the value, as clicking the switch or pressing Space or Enter does. No-op while readonly. */
  public toggle(): void {
    if (this.readonly() || this.disabled()) return;

    this._value = !this._value;
    this.onValueChange();
  }

  protected onToggleClick(event: MouseEvent): void {
    event.preventDefault();
    this.toggle();
  }

  get internalLabel(): string | undefined {
    if (this.value && this.onLabel() != null) return this.onLabel();
    if (!this.value && this.offLabel() != null) return this.offLabel();
    return undefined;
  }

  // #endregion
}
