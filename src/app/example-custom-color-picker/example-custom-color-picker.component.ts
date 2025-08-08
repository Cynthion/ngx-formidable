import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BaseFieldDirective, FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableField } from 'ngx-formidable';

@Component({
  selector: 'custom-color-picker',
  template: `
    <input
      #inputRef
      type="color"
      [value]="value || '#000000'"
      (input)="onNativeInput($event)" />
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ExampleCustomColorPickerComponent),
      multi: true
    },
    {
      provide: FORMIDABLE_FIELD,
      useExisting: forwardRef(() => ExampleCustomColorPickerComponent)
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleCustomColorPickerComponent extends BaseFieldDirective implements IFormidableField {
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

  // Called when Angular writes to the form control
  protected doWriteValue(value: string): void {
    this.inputRef.nativeElement.value = value || '#000000';
  }

  //#endregion

  //#region IFormidableField

  get value(): string | null {
    return this.inputRef.nativeElement.value || null;
  }

  get isLabelFloating(): boolean {
    const blocked = this.disabled || this.readonly;
    return !blocked && !this.isFieldFocused && !this.isFieldFilled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.inputRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  //#region Custom Input Properties

  // ...

  //#endregion

  // Called when the native input fires
  onNativeInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.valueChangeSubject$.next(v);
    this.valueChanged.emit(v);
    this.onChange(v);
  }
}
