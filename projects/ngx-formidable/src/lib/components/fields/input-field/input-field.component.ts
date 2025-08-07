import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { setCaretPositionToEnd } from '../../../helpers/input.helpers';
import { FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableInputField } from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.component';

/**
 * A configurable single-line text input.
 * Supports:
 * - `name`, `placeholder`, `readonly`, `disabled`
 * - `autocomplete` (`'off'|'on'|'given-name'|…`)
 * - `minLength`, `maxLength`
 *
 * @example
 * ```html
 * <formidable-input-field
 *   name="firstName"
 *   ngModel
 *   placeholder="First Name"
 *   [minLength]="2"
 * ></formidable-input-field>
 * ```
 */
@Component({
  selector: 'formidable-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: InputFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputFieldComponent extends BaseFieldDirective implements IFormidableInputField {
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    // write to wrapped element
    this.inputRef.nativeElement.value = value ?? '';
    setCaretPositionToEnd(this.inputRef.nativeElement);
  }

  //#endregion

  //#region IFormidableField

  get value(): string | null {
    return this.inputRef.nativeElement.value || null;
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.inputRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  //#region IFormidableInputField

  @Input() autocomplete: AutoFill = 'off';
  @Input() minLength = -1;
  @Input() maxLength = -1;

  //#endregion
}
