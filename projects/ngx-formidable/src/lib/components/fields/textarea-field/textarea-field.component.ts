import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  Input,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { setCaretPositionToEnd } from '../../../helpers/input.helpers';
import { FieldDecoratorLayout, FORMIDABLE_FIELD, IFormidableTextareaField } from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.component';

@Component({
  selector: 'formidable-textarea-field',
  templateUrl: './textarea-field.component.html',
  styleUrls: ['./textarea-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: TextareaFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextareaFieldComponent extends BaseFieldDirective implements IFormidableTextareaField, AfterViewInit {
  @ViewChild('textareaRef', { static: true }) textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lengthIndicatorRef') lengthIndicatorRef?: ElementRef<HTMLDivElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  ngAfterViewInit(): void {
    this.adjustLayout();
  }

  protected doOnValueChange(): void {
    if (this.enableAutosize) {
      this.autoResize();
    }
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    // write to wrapped element
    this.textareaRef.nativeElement.value = value ?? '';
    setCaretPositionToEnd(this.textareaRef.nativeElement);
  }

  //#endregion

  //#region IFormidableTextareaField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() autocomplete: AutoFill = 'off';
  @Input() minLength = -1;
  @Input() maxLength = -1;
  @Input() readOnly = false;
  @Input() required = false;

  @Input() enableAutosize = true;
  @Input() showLengthIndicator = false;

  //#endregion

  //#region IFormidableField

  get value(): string | null {
    return this.textareaRef.nativeElement.value || null;
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.textareaRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  private autoResize(): void {
    const textarea = this.textareaRef.nativeElement;

    textarea.style.height = 'auto'; // reset height to recalculate
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  private adjustLayout(): void {
    setTimeout(() => {
      // adjust length indicator, so that it also aligns right even if a suffix is set
      if (!this.textareaRef || !this.lengthIndicatorRef) return;

      const textarea = this.textareaRef.nativeElement;
      const indicator = this.lengthIndicatorRef.nativeElement;

      const style = window.getComputedStyle(textarea);
      const paddingRight = style.paddingRight;

      indicator.style.right = paddingRight;
    }, 50); // ensure this runs after the field decorators
  }
}
