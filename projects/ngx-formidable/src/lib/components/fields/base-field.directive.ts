import {
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  HostBinding,
  inject,
  Injector,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, NgControl } from '@angular/forms';
import { debounceTime, filter, fromEvent, merge, Subject, takeUntil, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { openPanelPosition } from '../../helpers/position.helpers';
import { FieldDecoratorLayout, IFormidableField } from '../../models/formidable.model';
import { FieldDecoratorComponent } from '../field-decorator/field-decorator.component';

@Directive()
export abstract class BaseFieldDirective<T = string | null>
  implements ControlValueAccessor, IFormidableField<T>, OnInit, AfterViewInit, OnDestroy
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

  // Element injectors follow the declaring template, so a projected field really does see its decorator.
  // Optional: a field used on its own has no label, hint or errors to point at.
  private readonly decorator = inject(FieldDecoratorComponent, { optional: true });
  protected readonly cdRef = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);

  private ngControl?: NgControl | null;

  /** The control this field is bound to, if it is bound to one at all. */
  private get control(): AbstractControl | null {
    return this.ngControl?.control ?? null;
  }

  protected readonly destroy$ = new Subject<void>();

  private _valuePrevious: T | null = null;

  /**
   * The decorator is normally the atom that owns the field's stacking context and rises while a panel is
   * open. Without one there is nothing above the field to be it, so the field's own host takes the job —
   * hence the same two state classes here, and only here. See `tech/layering.md`.
   */
  @HostBinding('class.is-undecorated')
  protected get isUndecorated(): boolean {
    return !this.decorator;
  }

  @HostBinding('class.has-open-panel')
  protected get hasOpenPanel(): boolean {
    const position = this.isUndecorated ? openPanelPosition(this) : null;

    return position !== null && position !== 'sheet';
  }

  @HostBinding('class.has-open-sheet')
  protected get hasOpenSheet(): boolean {
    return this.isUndecorated && openPanelPosition(this) === 'sheet';
  }

  ngOnInit(): void {
    // Resolved here rather than injected: `NgModel` picks its value accessor inside its own constructor, so
    // asking for it from this field's would close the loop and throw NG0200. By this hook it is built.
    this.ngControl = this.injector.get(NgControl, null, { optional: true, self: true });

    this.registerGlobalListeners();
  }

  ngAfterViewInit(): void {
    // Focusing inside the change detection pass flips `isFieldFocused`, which the decorator reads through
    // `canLabelRest` — an ExpressionChanged error. A microtask lands after the pass, with the refs resolved.
    if (this.autoFocus) queueMicrotask(() => this.focus());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onValueChange(): void {
    const value = this.value;

    if (value == this._valuePrevious) return;
    this._valuePrevious = value;

    this.isFieldFilled = BaseFieldDirective.isFilled(value);

    this.valueChangeSubject$.next(value);
    this.valueChanged.emit(value);
    this.commit(value); // notify ControlValueAccessor of the change

    this.doOnValueChange();
  }

  protected onFocusChange(isFocused: boolean): void {
    if (this.disabled) return;

    this.isFieldFocused = isFocused;

    this.focusChangeSubject$.next(isFocused);
    this.focusChanged.emit(isFocused);

    // A blur the field caused itself — focus moved onto its own panel — is not the user leaving it, so it
    // neither commits nor touches.
    if (!isFocused && this.ignoresBlur()) return;

    this.doOnFocusChange(isFocused);

    // The last act of a blur: under `updateOn: 'blur'` this is what commits the value, so whatever the
    // field writes above has to be written by now.
    if (!isFocused) this.touch();
  }

  /**
   * Whether this blur is the field's own doing, because focus moved to something the field itself owns.
   * Consumes the flag it reads, so the blur after it counts again. Overridden by the fields that move focus.
   */
  protected ignoresBlur(): boolean {
    return false;
  }

  protected abstract doOnValueChange(): void;
  protected abstract doOnFocusChange(isFocused: boolean): void;

  // #region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onChange: (value: T) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onTouched: () => void = () => {};

  /** What is driving the work now running, when it is not the user. */
  private silence: 'write' | 'correction' | null = null;

  /**
   * The single touch channel every field goes through. Under `updateOn: 'blur'` a touch is also the commit
   * and under `updateOn: 'submit'` it pre-sets the pending touch, so a touch the user did not cause would
   * commit and reveal a field nobody has visited. Neither a write nor a correction is the user.
   */
  protected touch(): void {
    if (this.silence === null) this.onTouched();
  }

  /**
   * The single value channel every field goes through. A write is the form's own value arriving, so there is
   * nothing to report back. A correction is not: a clamped number, a masked string, or a selection an
   * options list no longer offers all have to reach the model.
   */
  protected commit(value: T): void {
    if (this.silence !== 'write') this.onChange(value);
  }

  /**
   * Runs work the user did not cause: the form writing a value, or the field correcting one it was given.
   * Neither may touch the control or leave it dirty, and a write reports nothing back besides.
   *
   * Angular raises its pending dirty flag on every change a value accessor reports and offers no way to opt
   * out, so a control that was pristine on the way in is put back on the way out.
   */
  protected runSilently(cause: 'write' | 'correction', work: () => void): void {
    const previous = this.silence;
    const wasPristine = this.control?.pristine ?? false;

    this.silence = cause;

    try {
      work();
    } finally {
      this.silence = previous;
      if (wasPristine) this.control?.markAsPristine();
    }
  }

  writeValue(value: T): void {
    this.isFieldFilled = BaseFieldDirective.isFilled(value);
    // What the field now displays, so `onValueChange` compares against it and not against the last value a
    // user typed. Without this a written-in value cleared by a user reads as no change, and never reaches
    // the model.
    this._valuePrevious = value;

    // The form wrote this, so nothing on the way down may touch the control or report the value back.
    this.runSilently('write', () => this.doWriteValue(value));
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
  @Input() showRequiredMarker = false;
  @Input() autoFocus = false;

  public valueChange$ = this.valueChangeSubject$.asObservable();
  public focusChange$ = this.focusChangeSubject$.asObservable();

  @Output() public valueChanged = new EventEmitter<T>();
  @Output() public focusChanged = new EventEmitter<boolean>();

  get fieldId(): string {
    return this.id;
  }

  // #region ARIA

  // The decorator owns the label, the hint and the errors, so it is what mints the ids these point at.

  /**
   * Names the fields a `<label for>` cannot reach: the groups, the toggle and the slider.
   *
   * Read once per repaint of this `OnPush` field, so a label added or removed at runtime (an `@if`
   * around it) only lands the next time the field is checked. Every other projected decoration is the
   * decorator's own to render, which is why it is the decorator — and not the field — that is not `OnPush`.
   */
  protected get labelledBy(): string | null {
    return this.decorator?.labelledById ?? null;
  }

  protected get describedBy(): string | null {
    return this.decorator?.describedByIds ?? null;
  }

  protected get isInvalid(): boolean {
    return this.decorator?.isInvalid ?? false;
  }

  // The decorator mints the ids for what it renders around the field; the field mints the ids for what
  // lives inside its own box — its panel here, and each option in `BaseOptionFieldDirective`.

  /** Names the popup a panel field's `aria-controls` points at, whether that is a listbox or a dialog. */
  protected get panelId(): string {
    return `${this.fieldId}-panel`;
  }

  /**
   * Repaints the field when its validity changes. Validity lives in the errors component, whose
   * `markForCheck` marks its own ancestors and never this sibling — so `FieldErrorsDirective` calls this
   * as well, or `aria-invalid` would bind once and go stale.
   */
  public markForCheck(): void {
    this.cdRef.markForCheck();
  }

  // #endregion

  abstract get value(): T;

  private static isFilled(value: unknown): boolean {
    return typeof value === 'string' || Array.isArray(value) ? value.length > 0 : !!value;
  }

  get canLabelRest(): boolean {
    // Readonly/disabled fields never rest — the label stays put instead of
    // dropping over the (often filled) value when the field gains focus.
    if (this.disabled || this.readonly) return false;
    // Only what the field renders of its own accord counts here — its value, or mask slots. A
    // `placeholder` is the decorator's to weigh, because whether it blocks a resting label or is hidden
    // behind one depends on the label's position, which this field cannot see.
    return !this.isFieldFocused && !this.isFieldFilled && !this.showsEmptyValueHint;
  }

  /**
   * Whether the field renders something where the value goes even while it has no value (e.g. mask
   * slots), which a resting label would collide with. Overridden by the fields that do.
   */
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  protected get showsEmptyValueHint(): boolean {
    return false;
  }

  abstract fieldRef: ElementRef<HTMLElement>;

  abstract decoratorLayout: FieldDecoratorLayout;

  /**
   * The element that actually takes focus. `fieldRef` is a plain `div` for the fields that wrap their
   * control, so those override this.
   */
  protected get focusElement(): HTMLElement | undefined {
    return this.fieldRef?.nativeElement;
  }

  /** Focuses the field without opening its panel — no panel field opens on focus. */
  public focus(): void {
    if (this.disabled) return;

    this.focusElement?.focus();
  }

  protected preventPointerDown(event: PointerEvent): void {
    if (!this.readonly && !this.disabled) return;

    event.preventDefault();
    // Waits for the browser's default pointerdown handling: `preventDefault` suppresses the native focus,
    // so the re-focus has to land after the event dispatch. A microtask still runs inside it.
    setTimeout(() => this.focusElement?.focus());
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
