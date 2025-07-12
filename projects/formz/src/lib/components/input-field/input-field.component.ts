import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FieldDecoratorLayout, FORMZ_FIELD, IFormzInputField } from '../../form-model';

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
export class InputFieldComponent implements ControlValueAccessor, IFormzInputField {
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  private id = uuid();
  private isFieldFocused = false;
  private isFieldFilled = false;
  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  protected onInputChange(): void {
    const value = this.value;
    this.valueChangeSubject$.next(value);
    this.valueChanged.emit(value);
    this.isFieldFilled = value.length > 0;
    this.onChange(value); // notify ControlValueAccessor of the change
  }

  protected onFocusChange(isFocused: boolean): void {
    this.focusChangeSubject$.next(isFocused);
    this.focusChanged.emit(isFocused);
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

    // write to wrapped input element
    this.inputRef.nativeElement.value = value ?? '';
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

  //#region IFormzInputField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() autocomplete: AutoFill = 'off';
  @Input() minLength = -1;
  @Input() maxLength = -1;
  @Input() readOnly = false;
  @Input() disabled = false;
  @Input() required = false;

  //#endregion

  //#region IFormzField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  @Output() valueChanged = new EventEmitter<string>();
  @Output() focusChanged = new EventEmitter<boolean>();

  get fieldId(): string {
    return this.id;
  }

  get value(): string {
    return this.inputRef.nativeElement.value;
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.inputRef as ElementRef<HTMLElement>;
  }

  decoratorLayout?: FieldDecoratorLayout = 'single';

  //#endregion
}
