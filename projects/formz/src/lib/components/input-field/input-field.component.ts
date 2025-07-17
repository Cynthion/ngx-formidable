import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldDecoratorLayout, FORMZ_FIELD, IFormzInputField } from '../../formz.model';
import { BaseFieldDirective } from '../base-field.component';

@Component({
  selector: 'formz-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzField
    {
      provide: FORMZ_FIELD,
      useExisting: InputFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputFieldComponent extends BaseFieldDirective implements IFormzInputField {
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  protected registerKeyboard = false;
  protected registerExternalClick = false;
  protected registerWindowResizeScroll = null;
  protected registeredKeys: string[] = [];

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  protected doHandleKeyDown(_event: KeyboardEvent): void {
    // No additional actions needed
  }

  protected doHandleExternalClick(): void {
    // No additional actions needed
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    // write to wrapped element
    this.inputRef.nativeElement.value = value ?? '';
  }

  //#endregion

  //#region IFormzInputField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() autocomplete: AutoFill = 'off';
  @Input() minLength = -1;
  @Input() maxLength = -1;
  @Input() readOnly = false;
  @Input() required = false;

  //#endregion

  //#region IFormzField

  get value(): string {
    return this.inputRef.nativeElement.value;
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.inputRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion
}
