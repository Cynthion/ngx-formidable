import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FieldDecoratorLayout, FORMZ_FIELD, IFormzTextareaField } from '../../form-model';

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
export class TextareaFieldComponent implements ControlValueAccessor, IFormzTextareaField {
  @ViewChild('textareaRef', { static: true }) textareaRef!: ElementRef<HTMLTextAreaElement>;

  private id = uuid();
  private isFieldFocused = false;
  private isFieldFilled = false;
  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  /**
   * Enable or disable autosizing of the textarea.
   * If true, the textarea will automatically adjust its height based on the content.
   */
  @Input() enableAutosize = true;

  protected onInputChange(): void {
    const value = this.value;
    this.valueChangeSubject$.next(value);
    this.isFieldFilled = value.length > 0;
    this.onChange(value); // notify ControlValueAccessor of the change

    if (this.enableAutosize) {
      this.autoResize();
    }
  }

  protected onFocusChange(isFocused: boolean): void {
    this.focusChangeSubject$.next(isFocused);
    this.isFieldFocused = isFocused;

    if (!isFocused) {
      this.onTouched(); // on blur, notify ControlValueAccessor that the field was touched
    }
  }

  //#region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: unknown) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.isFieldFilled = !!value;

    // write to wrapped textarea element
    this.textareaRef.nativeElement.value = value ?? '';
  }

  registerOnChange(fn: never): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: never): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  //#endregion

  //#region IFormzTextareaField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() autocomplete: AutoFill = 'off';
  @Input() minLength = -1;
  @Input() maxLength = -1;
  @Input() disabled = false;
  @Input() readOnly = false;
  @Input() required = false;

  //#endregion

  //#region IFormzField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  get fieldId(): string {
    return this.id;
  }

  get value(): string {
    return this.textareaRef?.nativeElement.value || '';
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.textareaRef as ElementRef<HTMLElement>;
  }

  decoratorLayout?: FieldDecoratorLayout = 'single';

  //#endregion

  private autoResize(): void {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) return;

    textarea.style.height = 'auto'; // reset height to recalculate
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}
