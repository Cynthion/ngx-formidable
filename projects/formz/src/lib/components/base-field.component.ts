import { Directive, ElementRef, EventEmitter, inject, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FieldDecoratorLayout, IFormzField } from '../formz.model';

@Directive()
export abstract class BaseFieldDirective<T = string>
  implements ControlValueAccessor, IFormzField<T>, OnInit, OnDestroy
{
  protected abstract registerKeyboard: boolean;
  protected abstract registerExternalClick: boolean;
  protected abstract registeredKeys: string[];

  protected id = uuid();
  protected isFieldFocused = false;
  protected isFieldFilled = false;
  protected valueChangeSubject$ = new Subject<T>();
  protected focusChangeSubject$ = new Subject<boolean>();

  protected readonly ngZone: NgZone = inject(NgZone);

  private globalKeyboardUnlisten?: () => void;
  private globalExternalClickUnlisten?: () => void;

  ngOnInit(): void {
    this.registerGlobalListeners();
  }

  ngOnDestroy(): void {
    this.unregisterGlobalListeners();
  }

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

  private registerGlobalListeners(): void {
    if (this.registerKeyboard || this.registerExternalClick) {
      this.ngZone.runOutsideAngular(() => {
        if (this.registerKeyboard) {
          const onKeyDown = (event: KeyboardEvent) =>
            this.ngZone.run(() => {
              if (!this.isFieldFocused || this.disabled) return;
              if (!this.registeredKeys.includes(event.key)) return;

              this.doHandleKeyDown(event);

              if (event.key === 'Tab') return;
              event.preventDefault();
            });

          document.addEventListener('keydown', onKeyDown);
          this.globalKeyboardUnlisten = () => document.removeEventListener('keydown', onKeyDown);
        }

        if (this.registerExternalClick) {
          const onClick = (event: MouseEvent) => {
            const isClickInside = this.elementRef.nativeElement.contains(event.target as Node);
            if (isClickInside) return;

            this.ngZone.run(() => this.doHandleExternalClick());
          };

          document.addEventListener('click', onClick);
          this.globalExternalClickUnlisten = () => document.removeEventListener('click', onClick);
        }
      });
    }
  }

  private unregisterGlobalListeners(): void {
    this.globalKeyboardUnlisten?.();
    this.globalExternalClickUnlisten?.();
  }

  protected abstract doHandleKeyDown(event: KeyboardEvent): void;

  protected abstract doHandleExternalClick(): void;
}
