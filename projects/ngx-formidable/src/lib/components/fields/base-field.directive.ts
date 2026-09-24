import {
  AfterViewInit,
  computed,
  Directive,
  ElementRef,
  HostBinding,
  inject,
  Injector,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  Signal
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, NgControl } from '@angular/forms';
import { debounceTime, filter, fromEvent, merge, Subject, takeUntil, tap } from 'rxjs';
import { endOfMaskedValue } from '../../helpers/input.helpers';
import { DEFAULT_PLACEHOLDER_CHARACTER } from '../../helpers/mask.helpers';
import { openPanelPosition } from '../../helpers/position.helpers';
import { FieldDecoratorLayout, IFormidableField } from '../../models/formidable.model';
import { FieldDecoratorComponent } from '../field-decorator/field-decorator.component';

// Seeds every id the library mints.
let nextFieldId = 0;

/**
 * The base class a custom field extends. It supplies the value and focus channels, the `ControlValueAccessor`
 * plumbing, the accessible names, and the keyboard, outside-click and resize listeners; a subclass supplies
 * the control it renders and fills in the `do*` hooks.
 *
 * Extending it is not enough on its own — a custom field must also register itself as `NG_VALUE_ACCESSOR`, so
 * `ngModel` can bind it, and as `FORMIDABLE_FIELD`, so `formidable-field-decorator` can find it.
 */
@Directive()
export abstract class BaseFieldDirective<T = string | null>
  implements ControlValueAccessor, IFormidableField<T>, OnInit, AfterViewInit, OnDestroy
{
  /** Handles the keys named in `registeredKeys`. `null` for a field with no keyboard behaviour of its own. */
  protected abstract keyboardCallback: ((event: KeyboardEvent) => void) | null;

  /** Runs on a click landing outside the field — how a panel field closes. `null` to not listen. */
  protected abstract externalClickCallback: (() => void) | null;

  /** Runs on a debounced window resize or scroll — how an open panel is repositioned. `null` to not listen. */
  protected abstract windowResizeScrollCallback: (() => void) | null;

  /**
   * Which keys reach `keyboardCallback`. Everything listed is `preventDefault`ed on the way in, except
   * `Tab` and the horizontal arrows, which must keep their native behaviour.
   */
  protected abstract registeredKeys: string[];

  protected id = `formidable-field-${nextFieldId++}`;
  protected readonly isFieldFocused = signal(false);
  protected readonly isFieldFilled = signal(false);
  protected valueChangeSubject$ = new Subject<T>();
  protected focusChangeSubject$ = new Subject<boolean>();

  // Element injectors follow the declaring template, so a projected field really does see its decorator.
  // Optional: a field used on its own has no label, hint or errors to point at.
  private readonly decorator = inject(FieldDecoratorComponent, { optional: true });
  private readonly injector = inject(Injector);

  private ngControl?: NgControl | null;

  /** The control this field is bound to, if it is bound to one at all. */
  private get control(): AbstractControl | null {
    return this.ngControl?.control ?? null;
  }

  protected readonly destroy$ = new Subject<void>();

  private _valuePrevious: T | null = null;

  // The decorator is normally the atom that owns the field's stacking context and rises while a panel is
  // open. Without one there is nothing above the field to be it, so the field's own host takes the job —
  // hence the same two state classes here, and only here. See `tech/layering.md`.
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
    if (this.autoFocus()) queueMicrotask(() => this.focus());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // #region Caret

  // Whether focus arriving by `Tab` selects an input's content is the browser's call, and not one to pass
  // on to a consumer, so the library makes it. That needs the one thing the DOM does not say for itself:
  // whether a pointer press is what brought focus in. See `tech/caret.md`.
  private pointerPress = false;

  // Where the pointer left the caret, read on `mouseup` and written back on `click`.
  private clickedSelection: [number, number] | null = null;

  /**
   * The character a mask renders for a position nobody has filled yet. Overridden by a field that lets a
   * consumer configure it, and the only thing telling the value from the empty slots behind it.
   */
  protected get maskPlaceholderCharacter(): string {
    return DEFAULT_PLACEHOLDER_CHARACTER;
  }

  /** Bind to the editor's `mousedown` in a field that has one. */
  protected onEditorMouseDown(): void {
    this.pointerPress = true;

    // The focus this press causes and the `mouseup` that follows are both dispatched inside it, so a
    // timer is the first point after the whole interaction.
    setTimeout(() => (this.pointerPress = false));
  }

  /**
   * Selects what the editor holds, so the next character typed replaces it. Does nothing for focus a
   * pointer brought in, where the caret belongs where the click landed.
   */
  protected selectOnKeyboardFocus(element: HTMLInputElement | HTMLTextAreaElement, isMasked: boolean): void {
    if (this.pointerPress) return;

    const end = isMasked ? endOfMaskedValue(element, this.maskPlaceholderCharacter) : element.value.length;

    element.setSelectionRange(0, end);
  }

  /**
   * Bind to a masked editor's `mouseup`, where the caret is still the one the browser placed. ngx-mask
   * pulls it to the end of the typed text on a `click` listener of its own, so a click on one of the
   * empty slots it renders lands short of where it was aimed.
   */
  protected rememberClickedCaret(element: HTMLInputElement | HTMLTextAreaElement): void {
    this.clickedSelection = [element.selectionStart ?? 0, element.selectionEnd ?? 0];
  }

  /** Bind to the same editor's `click`, which Angular runs after the mask has had its say. */
  protected restoreClickedCaret(element: HTMLInputElement | HTMLTextAreaElement): void {
    const clicked = this.clickedSelection;
    this.clickedSelection = null;
    if (!clicked) return;

    // Never past the value: a click aimed into the unused slots belongs at the end of what is filled.
    const end = endOfMaskedValue(element, this.maskPlaceholderCharacter);

    element.setSelectionRange(Math.min(clicked[0], end), Math.min(clicked[1], end));
  }

  // #endregion

  protected onValueChange(): void {
    const value = this.value;

    if (value == this._valuePrevious) return;
    this._valuePrevious = value;

    this.isFieldFilled.set(BaseFieldDirective.isFilled(value));

    this.valueChangeSubject$.next(value);
    this.valueChanged.emit(value);
    this.commit(value); // notify ControlValueAccessor of the change

    this.doOnValueChange();
  }

  protected onFocusChange(isFocused: boolean): void {
    if (this.disabled()) return;

    this.isFieldFocused.set(isFocused);

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
   * Whether this blur is the field's own doing, because focus moved to something the field itself owns — a
   * panel, say. Override it in a field that moves focus, so such a blur neither commits nor touches.
   */
  protected ignoresBlur(): boolean {
    return false;
  }

  /** The subclass's half of a value change, after the base has committed it and told everyone. */
  protected abstract doOnValueChange(): void;

  /**
   * The subclass's half of a focus change. A field that must not respond while `readonly` guards it here and
   * not in `onFocusChange`, which all eleven fields share and which owns the focus ring and the touch.
   */
  protected abstract doOnFocusChange(isFocused: boolean): void;

  // #region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onChange: (value: T) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onTouched: () => void = () => {};

  // What is driving the work now running, when it is not the user.
  private silence: 'write' | 'correction' | null = null;

  /** Marks the control touched. Ignored while `runSilently` is in effect, because that is not the user. */
  protected touch(): void {
    // Under `updateOn: 'blur'` a touch is also the commit and under `updateOn: 'submit'` it pre-sets the
    // pending touch, so a touch the user did not cause would commit and reveal a field nobody has visited.
    if (this.silence === null) this.onTouched();
  }

  /** Reports a value to the bound control. Ignored while a write is in effect, since the form sent that one. */
  protected commit(value: T): void {
    if (this.silence !== 'write') this.onChange(value);
  }

  /**
   * Runs work the user did not cause: the form writing a value, or the field correcting one it was given.
   * Neither may touch the control or leave it dirty, and a write reports nothing back besides.
   */
  protected runSilently(cause: 'write' | 'correction', work: () => void): void {
    // Angular raises its pending dirty flag on every change a value accessor reports and offers no way to
    // opt out, so a control that was pristine on the way in is put back on the way out.
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
    this.isFieldFilled.set(BaseFieldDirective.isFilled(value));
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
    this.disabled.set(isDisabled);
  }

  /**
   * Puts a value the form wrote into whatever the subclass renders. Runs inside `runSilently`, so it may not
   * report anything back and must not leave the control dirty or touched.
   */
  protected abstract doWriteValue(value: T): void;

  // #endregion

  // #region IFormidableField

  /** The control's name, which is also the key it takes in the model and its validation target. */
  public readonly name = input('');

  /** Placeholder text. A field with one has nothing for an `inside` label to rest in, so that label floats. */
  public readonly placeholder = input('');

  /** Blocks edits but stays focusable and keeps its focus ring, unlike `disabled`. */
  public readonly readonly = input(false);

  /**
   * Blocks edits and takes the field out of the tab order. A `model` and not an `input`, because Angular's
   * own `setDisabledState` writes it as well — so `disabledChange` also reports a `control.disable()`.
   */
  public readonly disabled = model(false);

  /**
   * Suffixes the required marker to the label. Presentational only — nothing is inferred from a validator,
   * so this and the rules are the consumer's to keep in step. The form can switch all of them off at once.
   */
  public readonly showRequiredMarker = input(false);

  /** Focuses the field once it has rendered. Does not open a panel. */
  public readonly autoFocus = input(false);

  /** For the decorator, which subscribes on the way in. `valueChanged` is the same signal for a consumer. */
  public valueChange$ = this.valueChangeSubject$.asObservable();

  /** For the decorator, which subscribes on the way in. `focusChanged` is the same signal for a consumer. */
  public focusChange$ = this.focusChangeSubject$.asObservable();

  /** Emits the committed value on every change. Distinct-checked, so writing the same value twice is silent. */
  public readonly valueChanged = output<T>();

  /** Emits `true` on focus and `false` on blur — including a blur the field caused itself. */
  public readonly focusChanged = output<boolean>();

  get fieldId(): string {
    return this.id;
  }

  // #region ARIA

  // The decorator owns the label, the hint and the errors, so it is what mints the ids these point at.

  /** Binds `aria-labelledby` for a control a `<label for>` cannot reach: the groups, the toggle, the slider. */
  // Reads the decorator's `contentChild()` query through its getter, so a label added or removed at
  // runtime (an `@if` around it) marks this field on the pass that resolves the query.
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

  /** Binds `aria-controls` on a field that opens a panel, whether that panel is a listbox or a dialog. */
  protected get panelId(): string {
    return `${this.fieldId}-panel`;
  }

  // #endregion

  /** What the field currently holds, read straight off whatever it renders rather than cached. */
  abstract get value(): T;

  private static isFilled(value: unknown): boolean {
    return typeof value === 'string' || Array.isArray(value) ? value.length > 0 : !!value;
  }

  public readonly canLabelRest = computed(() => {
    // Readonly/disabled fields never rest — the label stays put instead of
    // dropping over the (often filled) value when the field gains focus.
    if (this.disabled() || this.readonly()) return false;
    // Only what the field renders of its own accord counts here — its value, or mask slots. A
    // `placeholder` is the decorator's to weigh, because whether it blocks a resting label or is hidden
    // behind one depends on the label's position, which this field cannot see.
    return !this.isFieldFocused() && !this.isFieldFilled() && !this.showsEmptyValueHint();
  });

  /**
   * Whether the field renders something where the value goes even while it has no value (e.g. mask
   * slots), which a resting label would collide with. Overridden by the fields that do.
   */
  // A signal and not a getter, because `canLabelRest` is a `computed` over it: a computed caches, so a
  // plain getter here would pin whatever it returned the first time the label state was resolved.
  protected readonly showsEmptyValueHint: Signal<boolean> = signal(false);

  /** The field's outer element. The decorator measures it, and the global listeners are scoped to it. */
  abstract fieldRef: ElementRef<HTMLElement>;

  /** The shape this field asks its decorator to render in. The field's own call, not a consumer's. */
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
    if (this.disabled()) return;

    this.focusElement?.focus();
  }

  /** Keeps a readonly or disabled field from being edited by pointer, while leaving it focusable. */
  protected preventPointerDown(event: PointerEvent): void {
    if (!this.readonly() && !this.disabled()) return;

    event.preventDefault();
    // Waits for the browser's default pointerdown handling: `preventDefault` suppresses the native focus,
    // so the re-focus has to land after the event dispatch. A microtask still runs inside it.
    setTimeout(() => this.focusElement?.focus());
  }

  /** Blocks the keys a native control would act on while readonly or disabled — a `select`, a range input. */
  protected preventKeydown(event: KeyboardEvent): void {
    if (!this.readonly() && !this.disabled()) return;

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

  // No `NgZone` anywhere: what these callbacks change is signals, and a signal write notifies the change
  // detection scheduler from any callstack. See `tech/architecture.md` for what that costs a consumer who
  // opts back into zone change detection.
  private registerGlobalListeners(): void {
    if (this.keyboardCallback && this.registeredKeys.length > 0) {
      fromEvent<KeyboardEvent>(this.fieldRef.nativeElement, 'keydown')
        .pipe(
          filter(() => this.isFieldFocused() && !this.readonly() && !this.disabled()),
          filter((event) => this.registeredKeys.includes(event.key)),
          tap((event) => {
            // immediately prevent default, before debounceTime
            if (event.key !== 'Tab' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') event.preventDefault();
          }),
          takeUntil(this.destroy$)
        )
        .subscribe((event: KeyboardEvent) => this.keyboardCallback?.(event));
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
        .subscribe(() => this.externalClickCallback?.());
    }

    if (this.windowResizeScrollCallback) {
      const resize$ = fromEvent(window, 'resize');
      // Captured on the document rather than listened for on `window`: `scroll` does not bubble, so a
      // field scrolling inside a pane of its own would otherwise never hear that it has moved.
      const scroll$ = fromEvent(document, 'scroll', { capture: true });

      merge(resize$, scroll$)
        .pipe(debounceTime(50), takeUntil(this.destroy$))
        .subscribe(() => this.windowResizeScrollCallback?.());
    }
  }
}
