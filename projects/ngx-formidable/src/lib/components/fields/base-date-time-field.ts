import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectorRef,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  Signal,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { ParseResult, transformedValue } from '@angular/forms/signals';
import { format, isEqual } from 'date-fns';
import { NgxMaskConfig } from 'ngx-mask';
import {
  findSegmentAtCaret,
  formatToTokenMask,
  parseUnicodeDateTime,
  stepDateTimeUnit,
  validateUnicodeTokenFormat
} from '../../helpers/format.helpers';
import { renderEmptyMask } from '../../helpers/input.helpers';
import { DEFAULT_PLACEHOLDER_CHARACTER } from '../../helpers/mask.helpers';
import { onSignalChange } from '../../helpers/utility.helpers';
import { FieldDecoratorLayout, FormidableEmptyHint } from '../../models/formidable.model';
import { BaseField } from './base-field';

/**
 * The base class behind `date-field` and `time-field`: a `Date` typed into a mask derived from
 * `unicodeTokenFormat`, or stepped with the arrow keys on the segment under the caret. The two differ in their
 * tokens, in the part of the `Date` they ignore, and in the date field's calendar.
 *
 * Typing commits on blur, because a half-typed date is not a date. Text that does not parse stays as typed,
 * reports a `parse` error to whichever forms API binds the field, and leaves the model alone. Emptying the text
 * commits `null` at once, so the arrows step from the default again.
 */
@Directive()
export abstract class BaseDateTimeField extends BaseField<Date | null> {
  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputRef');

  /**
   * A Unicode format. Decides the mask, the display, and which segment the arrow keys step. An unsupported
   * format warns and falls back to the default.
   */
  abstract readonly unicodeTokenFormat: Signal<string>;

  // What `unicodeTokenFormat` falls back to, and the tokens it may hold.
  protected abstract readonly defaultUnicodeTokenFormat: string;
  protected abstract readonly unicodeTokens: readonly string[];

  // Drops the part of a `Date` the field does not edit: the time of a date, the date of a time.
  protected abstract normalize(value: Date): Date;

  // What an arrow key steps from while the field is empty.
  protected abstract stepSeed(): Date;

  // The field's own pick: `selectDate` or `selectTime`.
  protected abstract select(value: Date | null): void;

  private readonly maskChar = '0';

  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor() {
    super();

    effect(() => this.warnAboutTokenFormat());

    // Trap: `ngModel` and `[formControl]` take a parse error into the control from an effect that runs after
    // their host's template, and ask for no further check — so the field's `errors` would follow on the
    // host's next check, whenever that comes. One more check once rendered hands them over at once.
    onSignalChange(
      () => this.text.parseErrors(),
      () => afterNextRender(() => this.changeDetector.markForCheck(), { injector: this.injector })
    );

    // Renders the model, and renders it again in a changed format. Text that did not parse is left as typed.
    afterRenderEffect(() => {
      const text = this.text();

      untracked(() => this.render(text));
    });
  }

  // #region FormidableField

  /**
   * The date or time, or `null` for none. What the user enters keeps only its own part: a date is at
   * midnight, a time on 1970-01-01.
   */
  public readonly value = model<Date | null>(null);

  // A pick builds a new `Date`, so the same day, or the same time of day, is the same value.
  protected override isSameValue(a: Date | null, b: Date | null): boolean {
    return a === b || (!!a && !!b && isEqual(this.normalize(a), this.normalize(b)));
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef().nativeElement;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region Text

  // What the input holds, parsed into the model when it commits. Text that does not parse is reported to the
  // forms API as a `parse` error; the model's own rendering otherwise.
  protected readonly text = transformedValue(this.value, {
    parse: (text: string) => this.parse(text),
    format: (value: Date | null) => this.formatValue(value)
  });

  private parse(text: string): ParseResult<Date | null> {
    // The model's own rendering is no edit — and a two-digit year would parse back into another century.
    if (text === this.formatValue(this.value())) return {};
    if (this.isEmptyText(text)) return { value: null };

    const parsed = parseUnicodeDateTime(text, this.tokenFormat());
    if (!parsed) return { error: { kind: 'parse' } };

    return this.isSameValue(this.value(), parsed) ? {} : { value: this.normalize(parsed) };
  }

  private formatValue(value: Date | null): string {
    return value ? format(value, this.tokenFormat()) : '';
  }

  // Commits what the input shows, as a blur or `Enter` does.
  protected commitText(): void {
    this.text.set(this.inputRef().nativeElement.value);
    this.render(this.text());
  }

  // Commits what the user picked or stepped to, and renders the model again even where that is no change:
  // text typed but not committed still has to give way to it, and a parse error goes with that text.
  protected commit(value: Date | null): void {
    this.select(value);
    this.text.set(this.formatValue(this.value()));
    this.render(this.text());
  }

  // Typing commits on blur, but wiping the text commits at once, or the cleared value would stay the model's
  // and `stepSegment` would keep stepping from it.
  protected onInput(): void {
    if (this.isEmptyText(this.inputRef().nativeElement.value)) this.text.set('');
  }

  protected doOnFocusChange(isFocused: boolean): void {
    // A readonly field has nothing to type into: it neither hands its display to ngxMask nor commits on blur.
    if (this.readonly()) return;

    // hand the empty display over to ngxMask while focused (see renderEmpty)
    if (isFocused) {
      if (this.isEmptyText(this.inputRef().nativeElement.value)) this.renderEmpty();
      this.selectOnKeyboardFocus(this.inputRef().nativeElement, true);
      return;
    }

    this.commitText();
  }

  private render(text: string): void {
    // Waits for the ngxMask directive to initialize on the input, which it does across a full task —
    // a microtask would land before it. `stepSegment` restores the caret from a timer queued behind
    // this one, so this must stay a macrotask.
    setTimeout(() => {
      // ngxMask leaves an empty input untouched, so render the empty state ourselves
      if (this.isEmptyText(text)) {
        this.renderEmpty();
        return;
      }

      const input = this.inputRef().nativeElement;
      if (input.value !== text) input.value = text;
    });
  }

  // #endregion

  // #region Steps

  // Steps the part under the caret by one, and leaves that part selected so repeated arrows keep to it — and
  // so the next digit typed replaces it.
  //
  // The input text is what gets stepped, not the model: it also carries what was typed but not yet
  // committed. An empty field is seeded first, so arrows alone can fill it.
  protected stepSegment(direction: 1 | -1): void {
    const input = this.inputRef().nativeElement;
    const segment = findSegmentAtCaret(this.tokenFormat(), input.selectionStart ?? 0);
    if (!segment) return;

    const base = parseUnicodeDateTime(input.value, this.tokenFormat()) ?? this.value() ?? this.stepSeed();
    const next = this.normalize(stepDateTimeUnit(base, segment.unit, direction));
    if (this.isOutOfRange(next)) return;

    this.commit(next);

    // commit re-renders the input from a setTimeout of its own; ours has to land after it
    setTimeout(() => input.setSelectionRange(segment.start, segment.end));
  }

  // A step is refused rather than clamped. Nothing is out of range unless the field has a range.
  protected isOutOfRange(_value: Date): boolean {
    return false;
  }

  // #endregion

  // #region Mask

  /** What an empty, unfocused field shows: the mask's underscores (default) or the `unicodeTokenFormat` itself. */
  public readonly emptyHint = input<FormidableEmptyHint>('underscores');

  // The format in force: `unicodeTokenFormat`, or the default in place of one it does not support.
  protected readonly tokenFormat = computed(() =>
    validateUnicodeTokenFormat(this.unicodeTokenFormat(), this.unicodeTokens)
      ? this.unicodeTokenFormat()
      : this.defaultUnicodeTokenFormat
  );

  protected readonly ngxMask = computed(() => formatToTokenMask(this.tokenFormat(), this.maskChar));

  protected readonly ngxMaskConfig: Pick<
    NgxMaskConfig,
    'showMaskTyped' | 'leadZeroDateTime' | 'dropSpecialCharacters' | 'placeHolderCharacter'
  > = {
    showMaskTyped: true,
    // Bound rather than inherited: the empty display is compared against character by character, so a
    // global `provideNgxMask` must not be able to change it out from under that.
    placeHolderCharacter: DEFAULT_PLACEHOLDER_CHARACTER,
    leadZeroDateTime: false, // must be enforced by unicodeTokenFormat, if required
    dropSpecialCharacters: false // keep special characters like '-', '.' or '/' in the input
  };

  // An empty date or time field always shows its `emptyHint` in the value area, so a label can never rest there.
  protected override readonly showsEmptyValueHint = signal(true);

  // ngxMask's own empty display: the mask with every slot as its placeholder character.
  private get maskPlaceholder(): string {
    return this.ngxMask().replace(/\w/g, this.maskPlaceholderCharacter);
  }

  // The resting display of an empty field for the current `emptyHint`: the format string, or
  // `maskPlaceholder`.
  private get emptyDisplay(): string {
    return this.emptyHint() === 'format' ? this.tokenFormat() : this.maskPlaceholder;
  }

  // Whether text is one of the empty displays rather than characters somebody typed: ngxMask either empties
  // the input outright or leaves the slots it renders for a focused empty field.
  private isEmptyText(text: string): boolean {
    return text.trim() === '' || text === this.maskPlaceholder || text === this.emptyDisplay;
  }

  // Shows the `emptyHint` at rest, but lets ngxMask own the text while focused.
  private renderEmpty(): void {
    renderEmptyMask(this.inputRef().nativeElement, this.emptyDisplay, this.maskPlaceholder, this.isFieldFocused());
  }

  private warnAboutTokenFormat(): void {
    const unicodeTokenFormat = this.unicodeTokenFormat();
    if (validateUnicodeTokenFormat(unicodeTokenFormat, this.unicodeTokens)) return;

    console.warn(
      `[ngx-formidable] Invalid unicodeTokenFormat: "${unicodeTokenFormat}". ` +
        `Falling back to default "${this.defaultUnicodeTokenFormat}". Supported tokens: ${this.unicodeTokens.join(', ')}.`
    );
  }

  // #endregion
}
