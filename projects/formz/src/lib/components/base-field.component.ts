import { Directive, ElementRef, EventEmitter, Output } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FieldDecoratorLayout, IFormzField } from '../form-model';

@Directive()
export abstract class BaseFieldDirective<T = string> implements ControlValueAccessor, IFormzField<T> {
  protected id = uuid();
  protected isFieldFocused = false;
  protected isFieldFilled = false;
  protected valueChangeSubject$ = new Subject<T>();
  protected focusChangeSubject$ = new Subject<boolean>();

  protected onValueChange(): void {
    const value = this.value;
    this.valueChangeSubject$.next(value);
    this.valueChanged.emit(value);
    this.isFieldFilled = typeof value === 'string' || Array.isArray(value) ? value.length > 0 : !!value;
    this.onChange(value); // notify ControlValueAccessor of the change

    this.doOnValueChange();
  }

  protected onFocusChange(isFocused: boolean): void {
    this.focusChangeSubject$.next(isFocused);
    this.focusChanged.emit(isFocused);
    this.isFieldFocused = isFocused;

    if (!isFocused) {
      this.onTouched(); // on blur, notify ControlValueAccessor that the field was touched
    }

    this.doOnFocusChange(isFocused);
  }

  protected abstract doOnValueChange(): void;
  protected abstract doOnFocusChange(isFocused: boolean): void;

  //#region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onChange: (value: unknown) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onTouched: () => void = () => {};

  writeValue(value: T): void {
    this.isFieldFilled = !!value;

    this.doWriteValue(value);
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

  protected abstract doWriteValue(value: T): void;

  //#endregion

  //#region IFormzField

  public disabled = false;

  public valueChange$ = this.valueChangeSubject$.asObservable();
  public focusChange$ = this.focusChangeSubject$.asObservable();

  @Output() public valueChanged = new EventEmitter<T>();
  @Output() public focusChanged = new EventEmitter<boolean>();

  get fieldId(): string {
    return this.id;
  }

  abstract get value(): T;

  abstract isLabelFloating: boolean;

  abstract elementRef: ElementRef<HTMLElement>;

  abstract decoratorLayout: FieldDecoratorLayout;

  //#endregion
}
