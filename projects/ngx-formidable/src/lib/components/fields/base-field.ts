import {
  afterNextRender,
  AfterViewInit,
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  ModelSignal,
  OnDestroy,
  OnInit,
  output,
  signal,
  Signal
} from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';
import { debounceTime, filter, fromEvent, merge, Subject, takeUntil } from 'rxjs';
import { NgxFormidableForm } from '../../forms/form.directive';
import { endOfMaskedValue } from '../../helpers/input.helpers';
import { DEFAULT_PLACEHOLDER_CHARACTER } from '../../helpers/mask.helpers';
import { openPanelPosition, scrollIntoView, updatePanelPosition } from '../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FORMIDABLE_DEFAULTS,
  FormidableField,
  FormidablePanelField
} from '../../models/formidable.model';
import { FormidableReveal } from '../../models/validation.model';
import { FieldDecorator } from '../field-decorator/field-decorator';

// Seeds every id the library mints.
let nextFieldId = 0;

/**
 * The base class a custom field extends. It supplies the `FormValueControl` contract — the state inputs and
 * the `touch` output — the reveal of its errors, the accessible names, and the keyboard listener; a subclass
 * declares its `value` model, renders from it, and fills in the `do*` hook.
 *
 * `[formField]`, `ngModel` and `[formControl]` all bind such a field through its `value` model. A custom field
 * also registers itself as `FORMIDABLE_FIELD`, so `formidable-field-decorator` can find it.
 */
@Directive({
  host: {
    '[class.is-undecorated]': 'isUndecorated',
    '[class.has-open-panel]': 'hasOpenPanel',
    '[class.has-open-sheet]': 'hasOpenSheet'
  }
})
export abstract class BaseField<T = string | null>
  implements FormValueControl<T>, FormidableField<T>, OnInit, AfterViewInit, OnDestroy
{
  /**
   * What the field holds — the model. The forms API writes it and the field renders it; the field writes it
   * back only for an edit of the user's, and never corrects what it was given.
   */
  abstract readonly value: ModelSignal<T>;

  /**
   * Handles the keys named in `registeredKeys`, and returns whether it acted on the key. Only a key it acted
   * on is `preventDefault`ed, so one it ignores keeps its native effect — an `Enter` still submits the form.
   * `null` for a field with no keyboard behaviour of its own.
   */
  protected abstract keyboardCallback: ((event: KeyboardEvent) => boolean) | null;

  /** Which keys reach `keyboardCallback`. */
  protected abstract registeredKeys: string[];

  protected id = `formidable-field-${nextFieldId++}`;

  /** Whether focus is inside the field, which the decorator's own focus state follows. */
  public readonly isFieldFocused = signal(false);

  protected readonly isFieldFilled = computed(() => BaseField.isFilled(this.value()));

  // Element injectors follow the declaring template, so a projected field really does see its decorator.
  // Optional: a field used on its own has no label, hint or errors to point at.
  private readonly decorator = inject(FieldDecorator, { optional: true });

  protected readonly destroy$ = new Subject<void>();

  // What a render hook registered outside the constructor runs in.
  protected readonly injector = inject(Injector);

  // The decorator is normally the atom that owns the field's stacking context and rises while a panel is
  // open. Without one there is nothing above the field to be it, so the field's own host takes the job —
  // hence the same two state classes here, and only here. See `tech/layering.md`.
  protected get isUndecorated(): boolean {
    return !this.decorator;
  }

  protected get hasOpenPanel(): boolean {
    const position = this.isUndecorated ? openPanelPosition(this) : null;

    return position !== null && position !== 'sheet';
  }

  protected get hasOpenSheet(): boolean {
    return this.isUndecorated && openPanelPosition(this) === 'sheet';
  }

  ngOnInit(): void {
    this.registerGlobalListeners();
  }

  ngAfterViewInit(): void {
    // Focusing inside the change detection pass flips `isFieldFocused`, which the decorator reads through
    // `canLabelRest` — an ExpressionChanged error. The render hook lands after the pass, with the refs resolved.
    if (this.autoFocus()) afterNextRender(() => this.focus(), { injector: this.injector });
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

  /**
   * Hands the user's edit to the model. An edit equal to what the model holds is no edit at all, so it
   * reports nothing and dirties nothing.
   */
  protected setValue(value: T): void {
    if (!this.isSameValue(this.value(), value)) this.value.set(value);
  }

  /** Whether two values are the same one. Overridden by a field whose value is a `Date` or an array. */
  protected isSameValue(a: T, b: T): boolean {
    return Object.is(a, b);
  }

  /**
   * Bind to the focus and blur of whatever takes focus in the field. Pass the event where focus can move
   * between the field's own elements — bound as `focusin` and `focusout` on `fieldRef` — so such a move is
   * neither an arrival nor a departure.
   */
  protected onFocusChange(isFocused: boolean, event?: FocusEvent): void {
    if (this.disabled()) return;
    if (this.fieldRef.nativeElement.contains((event?.relatedTarget ?? null) as Node | null)) return;

    this.isFieldFocused.set(isFocused);
    this.doOnFocusChange(isFocused);

    // The last act of a blur: Signal Forms' `debounce(path, 'blur')` releases the value on the touch, so
    // whatever the field writes above has to be written by now.
    if (!isFocused) this.touch.emit();
  }

  /**
   * The subclass's half of a focus change. A field that must not respond while `readonly` guards it here and
   * not in `onFocusChange`, which all eleven fields share and which owns the focus ring and the touch.
   */
  protected abstract doOnFocusChange(isFocused: boolean): void;

  // #region FormidableField

  /** The field's name, the native `name` of its control. `[formField]` writes the field's own. */
  public readonly name = input('');

  /** Placeholder text. A field with one has nothing for an `inside` label to rest in, so that label floats. */
  public readonly placeholder = input('');

  /** Blocks edits but stays focusable and keeps its focus ring, unlike `disabled`. */
  public readonly readonly = input(false, { transform: booleanAttribute });

  /** Blocks edits and takes the field out of the tab order. Every forms API writes it from its own state. */
  public readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Marks the field required: suffixes the marker to the label and sets `aria-required`. Validates nothing.
   * `[formField]` and `[formControl]` write it from their rules; under `ngModel` it is the `required`
   * attribute, which also attaches Angular's own validator. The form can hide every marker at once.
   */
  public readonly required = input(false, { transform: booleanAttribute });

  /** Focuses the field once it has rendered. Does not open a panel. */
  public readonly autoFocus = input(false);

  /** The forms API's errors for the field, each rendered as a message through `FORMIDABLE_ERROR_MESSAGE`. */
  // `FormUiControl` requires a transform to take `unknown`; what every forms API writes is an array.
  public readonly errors = input<readonly ValidationError[], unknown>([], {
    transform: (errors) => (errors as readonly ValidationError[] | undefined) ?? []
  });

  /** Whether the forms API holds the field invalid, which shows it invalid once revealed, errors or not. */
  public readonly invalid = input(false, { transform: booleanAttribute });

  /** Whether a validator is still running. The last errors stay on screen until it settles. */
  public readonly pending = input(false, { transform: booleanAttribute });

  /** Whether the user has left the field — what `revealOn: 'touched'` waits for. */
  public readonly touched = input(false, { transform: booleanAttribute });

  /** Whether the user has edited the field — what `revealOn: 'dirty'` waits for. */
  public readonly dirty = input(false, { transform: booleanAttribute });

  /** When the messages appear. Unset, the form's `revealOn` applies, then the app default, then `touched`. */
  public readonly revealOn = input<FormidableReveal | undefined>(undefined);

  /** Emits as the last act of a blur — the user leaving the field — which marks it touched. */
  public readonly touch = output<void>();

  // Optional: a field reveals by its own setting and the app default alone, with no form around it.
  private readonly formDirective = inject(NgxFormidableForm, { optional: true });
  private readonly defaultRevealOn = inject(FORMIDABLE_DEFAULTS).revealOn ?? 'touched';

  // A pending validator has not reported yet, so the forms API holds none of its errors: keeping the last
  // settled ones stops the messages flickering away and back on every run.
  private readonly settledErrors = linkedSignal<
    { errors: readonly ValidationError[]; pending: boolean },
    readonly ValidationError[]
  >({
    source: () => ({ errors: this.errors(), pending: this.pending() }),
    computation: ({ errors, pending }, previous) => (pending && previous ? previous.value : errors)
  });

  /** Whether the field shows its errors: it is invalid and its reveal has come. Drives `aria-invalid`. */
  public readonly showErrors = computed(() => {
    if (!this.invalid() && !this.settledErrors().length) return false;

    switch (this.revealOn() ?? this.formDirective?.revealOn() ?? this.defaultRevealOn) {
      case 'always':
        return true;
      case 'dirty':
        return this.dirty();
      default:
        return this.touched();
    }
  });

  /** The errors the decorator renders as messages: none until `showErrors`, and the last ones while pending. */
  public readonly shownErrors = computed(() => (this.showErrors() ? this.settledErrors() : []));

  /** Whether the user can edit the field: neither readonly nor disabled. Every mutator and edit guard reads it. */
  protected readonly canEdit = computed(() => !this.readonly() && !this.disabled());

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

  // The decorator mints the ids for what it renders around the field; the field mints the ids for what
  // lives inside its own box — its panel here, and each option in `BaseOptionField`.

  /** Binds `aria-controls` on a field that opens a panel, whether that panel is a listbox or a dialog. */
  protected get panelId(): string {
    return `${this.fieldId}-panel`;
  }

  // #endregion

  private static isFilled(value: unknown): boolean {
    return typeof value === 'string' || Array.isArray(value) ? value.length > 0 : !!value;
  }

  public readonly canLabelRest = computed(() => {
    // Readonly/disabled fields never rest — the label stays put instead of
    // dropping over the (often filled) value when the field gains focus.
    if (!this.canEdit()) return false;
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
  public focus(options?: FocusOptions): void {
    if (this.disabled()) return;

    this.focusElement?.focus(options);
  }

  /** Keeps a readonly or disabled field from being edited by pointer, while leaving it focusable. */
  protected preventPointerDown(event: PointerEvent): void {
    if (this.canEdit()) return;

    event.preventDefault();
    // Waits for the browser's default pointerdown handling: `preventDefault` suppresses the native focus,
    // so the re-focus has to land after the event dispatch. A microtask still runs inside it.
    setTimeout(() => this.focusElement?.focus());
  }

  /** Blocks the keys a native control would act on while readonly or disabled — a `select`, a range input. */
  protected preventKeydown(event: KeyboardEvent): void {
    if (this.canEdit()) return;

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
          filter(() => this.isFieldFocused() && this.canEdit()),
          filter((event) => this.registeredKeys.includes(event.key)),
          takeUntil(this.destroy$)
        )
        .subscribe((event: KeyboardEvent) => {
          if (this.keyboardCallback?.(event)) event.preventDefault();
        });
    }

    const panel = this.panel;
    if (!panel) return;

    fromEvent<MouseEvent>(document, 'click')
      .pipe(
        filter((event) => {
          const path = event.composedPath?.() ?? [];

          // accept clicks that bubble through any part of the field (like panel)
          const isInside = path.some((el) => el instanceof Node && this.fieldRef.nativeElement.contains(el));

          return panel.isPanelOpen() && !isInside;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => panel.togglePanel(false));

    const resize$ = fromEvent(window, 'resize');
    // Captured on the document rather than listened for on `window`: `scroll` does not bubble, so a
    // field scrolling inside a pane of its own would otherwise never hear that it has moved.
    const scroll$ = fromEvent(document, 'scroll', { capture: true });

    // Synchronous once debounced: the new layout has already settled.
    merge(resize$, scroll$)
      .pipe(
        filter(() => panel.isPanelOpen()),
        debounceTime(50),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.placePanel());
  }

  // #region Panel

  // `dropdown-field`, `autocomplete-field` and `date-field` share one panel: the base closes it on a click
  // outside the field, places it again on a scroll or resize while it is open, and keeps focus in the field
  // while it is used. Each field adds only what opening and closing does to its own content.

  /** The field's panel, for a field that opens one: the field itself, as a `FormidablePanelField`. */
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  protected get panel(): FormidablePanelField | null {
    return null;
  }

  /** Bind to the `mousedown` of the element that opens and closes the panel. Focus stays in the field. */
  protected onPanelToggleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.focus();
    this.panel?.togglePanel(!this.panel.isPanelOpen());
  }

  /**
   * Bind to the panel's `mousedown`. A press inside the panel leaves focus where it is, so picking from it is
   * not leaving the field. A native `<select>` is the exception: it opens only on a press it keeps, and focus
   * on it is still inside the field.
   */
  protected onPanelMouseDown(event: MouseEvent): void {
    if (!(event.target instanceof HTMLSelectElement)) event.preventDefault();
  }

  /**
   * Call once `isPanelOpen` has changed. An opening panel is placed, and scrolled into view where it or the
   * field has left the viewport, once it has rendered open; a closing panel hands focus back to the field,
   * because the element that holds it is about to hide and a hidden element drops its focus.
   */
  protected onPanelToggle(isOpen: boolean): void {
    if (isOpen) {
      afterNextRender(
        () => {
          this.placePanel();
          if (this.panel?.isPanelOpen()) scrollIntoView(this.fieldRef, this.panel.panelRef());
        },
        { injector: this.injector }
      );
    } else if (this.panel?.panelRef()?.nativeElement.contains(document.activeElement)) {
      this.focus();
    }
  }

  /** Places the open panel once the render in flight has landed — after its option list changed, say. */
  protected placePanelAfterRender(): void {
    afterNextRender(() => this.placePanel(), { injector: this.injector });
  }

  private placePanel(): void {
    if (this.panel?.isPanelOpen()) updatePanelPosition(this.fieldRef, this.panel.panelRef());
  }

  // #endregion
}
