import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FormidableToggleFieldLabelPosition,
  IFormidableToggleField
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

@Component({
  selector: 'formidable-toggle-field',
  templateUrl: './toggle-field.component.html',
  styleUrls: ['./toggle-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
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

  private _value = false;

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

  get value(): boolean {
    return this._value;
  }

  readonly isLabelFloating = false;

  get fieldRef(): ElementRef<HTMLElement> {
    return this.toggleRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'inline';

  // #endregion

  // #region IFormidableToggleField

  @Input() labelPosition?: FormidableToggleFieldLabelPosition = 'before';
  @Input() onLabel?: string;
  @Input() offLabel?: string;

  public toggle(): void {
    if (this.readonly || this.disabled) return;

    this._value = !this._value;
    this.onValueChange();
  }

  protected onToggleClick(event: MouseEvent): void {
    event.preventDefault();
    this.toggle();
  }

  get internalLabel(): string | undefined {
    if (this.value && this.onLabel != null) return this.onLabel;
    if (!this.value && this.offLabel != null) return this.offLabel;
    return undefined;
  }

  // #endregion
}
