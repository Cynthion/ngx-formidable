import { Directive, ElementRef, EventEmitter, inject, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { debounceTime, filter, fromEvent, merge, Subject, takeUntil, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FieldDecoratorLayout, IFormzField } from '../formz.model';

@Directive()
export abstract class BaseFieldDirective<T = string>
  implements ControlValueAccessor, IFormzField<T>, OnInit, OnDestroy
{
  protected abstract keyboardCallback: ((event: KeyboardEvent) => void) | null;
  protected abstract externalClickCallback: (() => void) | null;
  protected abstract windowResizeScrollCallback: (() => void) | null;
  protected abstract registeredKeys: string[];

  protected id = uuid();
  protected isFieldFocused = false;
  protected isFieldFilled = false;
  protected valueChangeSubject$ = new Subject<T>();
  protected focusChangeSubject$ = new Subject<boolean>();

  protected readonly ngZone: NgZone = inject(NgZone);

  protected readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.registerGlobalListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onValueChange(): void {
    const value = this.value;

    this.isFieldFilled = typeof value === 'string' || Array.isArray(value) ? value.length > 0 : !!value;

    this.valueChangeSubject$.next(value);
    this.valueChanged.emit(value);
    this.onChange(value); // notify ControlValueAccessor of the change

    this.doOnValueChange();
  }

  protected onFocusChange(isFocused: boolean): void {
    this.isFieldFocused = isFocused;

    this.focusChangeSubject$.next(isFocused);
    this.focusChanged.emit(isFocused);

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
    if (this.keyboardCallback || this.externalClickCallback || this.windowResizeScrollCallback) {
      this.ngZone.runOutsideAngular(() => {
        if (this.keyboardCallback) {
          fromEvent<KeyboardEvent>(document, 'keydown')
            .pipe(
              filter(() => this.isFieldFocused && !this.disabled),
              filter((event) => this.registeredKeys.includes(event.key)),
              tap((event) => {
                // immediately prevent default, before debounceTime
                if (event.key !== 'Tab' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                  event.preventDefault();
              }),
              // debounceTime(100),
              takeUntil(this.destroy$)
            )
            .subscribe((event: KeyboardEvent) =>
              this.ngZone.run(() => {
                this.keyboardCallback?.(event);
              })
            );
        }

        if (this.externalClickCallback) {
          fromEvent<MouseEvent>(document, 'click')
            .pipe(
              debounceTime(50),
              filter((event) => !this.elementRef.nativeElement.contains(event.target as Node)),
              takeUntil(this.destroy$)
            )
            .subscribe(() => this.ngZone.run(() => this.externalClickCallback?.()));
        }

        if (this.windowResizeScrollCallback) {
          const resize$ = fromEvent(window, 'resize');
          const scroll$ = fromEvent(window, 'scroll');

          merge(resize$, scroll$)
            .pipe(debounceTime(50), takeUntil(this.destroy$))
            .subscribe(() => this.ngZone.run(() => this.windowResizeScrollCallback?.()));
        }
      });
    }
  }
}
