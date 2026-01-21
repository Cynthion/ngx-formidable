import { Directive, ElementRef, EventEmitter, inject, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { debounceTime, filter, fromEvent, merge, Subject, takeUntil, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FieldDecoratorLayout, IFormidableField } from '../../models/formidable.model';

@Directive()
export abstract class BaseFieldDirective<T = string | null>
  implements ControlValueAccessor, IFormidableField<T>, OnInit, OnDestroy
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

  private _valuePrevious: T | null = null;

  ngOnInit(): void {
    this.registerGlobalListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onValueChange(): void {
    const value = this.value;

    if (value == this._valuePrevious) return;
    this._valuePrevious = value;

    this.isFieldFilled = typeof value === 'string' || Array.isArray(value) ? value.length > 0 : !!value;

    this.valueChangeSubject$.next(value);
    this.valueChanged.emit(value);
    this.onChange(value); // notify ControlValueAccessor of the change

    this.doOnValueChange();
  }

  protected onFocusChange(isFocused: boolean): void {
    if (this.disabled) return;

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

  // #region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onChange: (value: T) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onTouched: () => void = () => {};

  writeValue(value: T): void {
    this.isFieldFilled = !!value;

    this.doWriteValue(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected abstract doWriteValue(value: T): void;

  // #endregion

  // #region IFormidableField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() readonly = false;
  @Input() disabled = false;

  public valueChange$ = this.valueChangeSubject$.asObservable();
  public focusChange$ = this.focusChangeSubject$.asObservable();

  @Output() public valueChanged = new EventEmitter<T>();
  @Output() public focusChanged = new EventEmitter<boolean>();

  get fieldId(): string {
    return this.id;
  }

  abstract get value(): T;

  get isLabelFloating(): boolean {
    const blocked = this.disabled || this.readonly;
    return !blocked && !this.isFieldFocused && !this.isFieldFilled;
  }

  abstract fieldRef: ElementRef<HTMLElement>;

  abstract decoratorLayout: FieldDecoratorLayout;

  protected preventPointerDown(event: PointerEvent, focusElementRef?: HTMLElement): void {
    if (!this.readonly && !this.disabled) return;

    event.preventDefault();
    setTimeout(() => (focusElementRef ? focusElementRef.focus() : this.fieldRef.nativeElement.focus()), 0);
  }

  protected preventKeydown(event: KeyboardEvent): void {
    if (!this.readonly && !this.disabled) return;

    const nativeSelectKeys = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Enter',
      ' ',
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Space'
    ];
    const blockedKeys: string[] = [...nativeSelectKeys];
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  // #endregion

  private registerGlobalListeners(): void {
    if (this.keyboardCallback || this.externalClickCallback || this.windowResizeScrollCallback) {
      this.ngZone.runOutsideAngular(() => {
        if (this.keyboardCallback && this.registeredKeys.length > 0) {
          fromEvent<KeyboardEvent>(this.fieldRef.nativeElement, 'keydown')
            .pipe(
              filter(() => this.isFieldFocused && !this.readonly && !this.disabled),
              filter((event) => this.registeredKeys.includes(event.key)),
              tap((event) => {
                // immediately prevent default, before debounceTime
                if (event.key !== 'Tab' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                  event.preventDefault();
              }),
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
              filter((event) => {
                const path = event.composedPath?.() ?? [];

                // accept clicks that bubble through any part of the field (like panel)
                const isInside = path.some((el) => el instanceof Node && this.fieldRef.nativeElement.contains(el));

                return !isInside;
              }),
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
