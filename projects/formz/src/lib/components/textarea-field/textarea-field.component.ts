import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldDecoratorLayout, FORMZ_FIELD, IFormzTextareaField } from '../../formz.model';
import { BaseFieldDirective } from '../base-field.component';

@Component({
  selector: 'formz-textarea-field',
  templateUrl: './textarea-field.component.html',
  styleUrls: ['./textarea-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzField
    {
      provide: FORMZ_FIELD,
      useExisting: TextareaFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextareaFieldComponent extends BaseFieldDirective implements IFormzTextareaField {
  @ViewChild('textareaRef', { static: true }) textareaRef!: ElementRef<HTMLTextAreaElement>;

  protected registerKeyboard = false;
  protected registerExternalClick = false;
  protected registeredKeys: string[] = [];

  protected doOnValueChange(): void {
    if (this.enableAutosize) {
      this.autoResize();
    }
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
    this.textareaRef.nativeElement.value = value ?? '';
  }

  //#endregion

  //#region IFormzTextareaField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() autocomplete: AutoFill = 'off';
  @Input() minLength = -1;
  @Input() maxLength = -1;
  @Input() readOnly = false;
  @Input() required = false;

  @Input() enableAutosize = true;

  //#endregion

  //#region IFormzField

  get value(): string {
    return this.textareaRef.nativeElement.value;
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.textareaRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  private autoResize(): void {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) return;

    textarea.style.height = 'auto'; // reset height to recalculate
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}
