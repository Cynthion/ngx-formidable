import { ChangeDetectionStrategy, Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FormzFieldBase } from '../../form-model';

@Component({
  selector: 'formz-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
  providers: [
    // required to use FormzFieldBase  during injection as a base class for this component
    { provide: FormzFieldBase, useExisting: forwardRef(() => InputFieldComponent) },
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputFieldComponent extends FormzFieldBase implements ControlValueAccessor {
  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;

  private id = uuid();
  private isFieldFocused = false;
  private isFieldFilled = false;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  protected onInputChange(): void {
    const value = this.value;
    console.log('InputFieldComponent. onInputChange', value);
    this.valueChangeSubject$.next(value);
    this.isFieldFilled = value.length > 0;
    this.onChange(value); // notify ControlValueAccessor of the change
  }

  protected onFocusChange(isFocused: boolean): void {
    console.log('InputFieldComponent. onFocusChange', isFocused);
    this.focusChangeSubject$.next(isFocused);
    this.isFieldFocused = isFocused;

    if (!isFocused) {
      this.onTouched(); // on blur, notify ControlValueAccessor that the field was touched
    }
  }

  //#region IFormzField

  get fieldId(): string {
    return this.id;
  }

  get value(): string {
    return this.inputRef?.nativeElement.value || '';
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    console.log('InputFieldComponent. elementRef', this.inputRef);
    return this.inputRef as ElementRef<HTMLElement>;
  }

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  //#endregion

  //#region ControlValueAccessor

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  protected isDisabled = false;

  writeValue(value: any): void {
    console.log('InputFieldComponent. writeValue', value);

    if (this.inputRef) {
      this.inputRef.nativeElement.value = value ?? '';
      this.isFieldFilled = !!value;
    } else {
      console.warn('InputFieldComponent. writeValue called before inputRef is available.');
      // Handle case when inputRef not yet available
      // setTimeout(() => this.writeValue(value));
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;

    if (this.inputRef) {
      this.inputRef.nativeElement.disabled = isDisabled;
    }
  }
  //#endregion
}
