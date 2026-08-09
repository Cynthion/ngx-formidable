import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { format, isEqual } from 'date-fns';
import { NgxMaskConfig, NgxMaskDirective } from 'ngx-mask';
import {
  findSegmentAtCaret,
  formatToTimeTokenMask,
  isValidDateObject,
  normalizeDatePart,
  parseUnicodeDateTime,
  stepDateTimeUnit,
  UNICODE_TIME_TOKENS,
  validateUnicodeTimeTokenFormat
} from '../../../helpers/format.helpers';
import { renderEmptyMask } from '../../../helpers/input.helpers';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FormidableEmptyHint,
  IFormidableTimeField
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * An input field for selecting times via masked text entry.
 * Provides:
 * - Masked input (ngx-mask) according to a Unicode time format (e.g. "HH.mm").
 * - Automatic parsing/formatting.
 * - Simple keyboard handling.
 *
 * @input unicodeTokenFormat?: string
 *   Unicode time format mask (defaults to "HH.mm").
 *
 * @output valueChanged: EventEmitter<Date|null>
 * @output focusChanged: EventEmitter<boolean>
 *   Emitted when the time is parsed/selected or focus changes.
 *
 * Example:
 * ```html
 * <formidable-time-field
 *   name="appointmentTime"
 *   ngModel
 *   [unicodeTokenFormat]="'HH:mm'"
 * ></formidable-time-field>
 * ```
 */
@Component({
  selector: 'formidable-time-field',
  templateUrl: './time-field.component.html',
  styleUrls: ['./time-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, NgxMaskDirective],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: TimeFieldComponent
    }
  ]
})
export class TimeFieldComponent
  extends BaseFieldDirective<Date | null>
  implements IFormidableTimeField, OnInit, OnChanges, OnDestroy
{
  @ViewChild('timeRef', { static: true }) timeRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['Enter', 'ArrowUp', 'ArrowDown'];

  private maskChar = '0';
  private readonly defaultUnicodeTokenFormat = 'HH.mm';

  override ngOnInit(): void {
    super.ngOnInit();

    if (!validateUnicodeTimeTokenFormat(this.unicodeTokenFormat)) {
      console.warn(
        `[ngx-formidable] Invalid unicodeTokenFormat: "${this.unicodeTokenFormat}". ` +
          `Falling back to default "${this.defaultUnicodeTokenFormat}". Supported tokens: ${UNICODE_TIME_TOKENS.join(', ')}.`
      );

      this.unicodeTokenFormat = this.defaultUnicodeTokenFormat;
    }

    // must run before the first binding pass, so the input carries the correct mask
    this.updateMask();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unicodeTokenFormat'] && !changes['unicodeTokenFormat'].firstChange) {
      this.updateMask();
      this.setTime(this.selectedTime); // re-render the current value in the new format
    }
  }

  /**
   * Typing commits on blur — a half-typed time is not a time — so value changes are handled in the
   * selectTime method. Wiping the text is the exception: it commits at once, or the cleared time would
   * stay the model's and `stepSegment` would keep stepping from it.
   */
  protected override onValueChange(): void {
    if (this.selectedTime && this.isInputCleared) {
      this.setTime(null);
      return;
    }

    this.isFieldFilled = !!this.value;
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(isFocused: boolean): void {
    // A readonly field has nothing to type into: it neither hands its display to ngxMask nor commits on blur.
    if (this.readonly) return;

    // hand the empty display over to ngxMask while focused (see renderEmpty)
    if (isFocused) {
      if (this.selectedTime == null) this.renderEmpty();
      return;
    }

    // try set time on blur
    this.trySetTimeFromInput(this.inputRef.nativeElement.value);
  }

  private handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        this.trySetTimeFromInput(this.inputRef.nativeElement.value);
        break;
      case 'ArrowUp':
        this.stepSegment(1);
        break;
      case 'ArrowDown':
        this.stepSegment(-1);
        break;
    }
  }

  /**
   * Steps the time part under the caret by one, and leaves that part selected so repeated arrows
   * keep to it — and so the next digit typed replaces it.
   *
   * The input text is what gets stepped, not `selectedTime`: it also carries what was typed but not
   * yet committed. An empty field is seeded with midnight, so arrows alone can fill it.
   */
  private stepSegment(direction: 1 | -1): void {
    const input = this.inputRef.nativeElement;
    const segment = findSegmentAtCaret(this.unicodeTokenFormat, input.selectionStart ?? 0);
    if (!segment) return;

    const base = this.onParse(input.value, this.unicodeTokenFormat) ?? this.selectedTime ?? new Date(1970, 0, 1);

    this.setTime(normalizeDatePart(stepDateTimeUnit(base, segment.unit, direction)));

    // setTime re-renders the input from a setTimeout of its own; ours has to land after it
    setTimeout(() => input.setSelectionRange(segment.start, segment.end));
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: Date | null): void {
    this.trySetTimeFromInput(value);
  }

  // #endregion

  // #region IFormidableField

  get value(): Date | null {
    return this.selectedTime || null;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.timeRef as ElementRef<HTMLElement>;
  }

  protected override get focusElement(): HTMLElement {
    return this.inputRef.nativeElement;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region IFormidableTimeField

  @Input() unicodeTokenFormat = this.defaultUnicodeTokenFormat;
  /** What an empty, unfocused field shows: underscores (default, "__ : __") or the `unicodeTokenFormat` ("HH : mm"). */
  @Input() emptyHint: FormidableEmptyHint = 'underscores';

  protected ngxMask = formatToTimeTokenMask(this.unicodeTokenFormat!, this.maskChar);

  protected ngxMaskConfig: Pick<NgxMaskConfig, 'showMaskTyped' | 'leadZeroDateTime' | 'dropSpecialCharacters'> = {
    showMaskTyped: true,
    leadZeroDateTime: false, // must be enforced by unicodeTokenFormat, if required
    dropSpecialCharacters: false // keep special characters like '-', '.' or '/' in the input
  };

  // An empty time field always shows its `emptyHint` in the value area, so a label can never rest there.
  protected override get showsEmptyValueHint(): boolean {
    return true;
  }

  /** ngxMask's own empty display: the mask with every slot as its placeholder character. */
  private get maskPlaceholder(): string {
    return this.ngxMask.replace(/\w/g, '_');
  }

  /** The resting display of an empty field for the current `emptyHint`: the format string, or `maskPlaceholder`. */
  private get emptyDisplay(): string {
    return this.emptyHint === 'format' ? (this.unicodeTokenFormat ?? '') : this.maskPlaceholder;
  }

  /** ngxMask either empties the input outright or leaves the slots it renders for a focused empty field. */
  private get isInputCleared(): boolean {
    const value = this.inputRef.nativeElement.value;

    return value === '' || value === this.maskPlaceholder;
  }

  /** Shows the `emptyHint` at rest, but lets ngxMask own the text while focused. */
  private renderEmpty(): void {
    renderEmptyMask(this.inputRef.nativeElement, this.emptyDisplay, this.maskPlaceholder, this.isFieldFocused);
  }

  private selectedTime: Date | null = null;

  public selectTime(time: Date | null): void {
    // only trigger value changes if there are changes
    // (panel could close without date change)
    if (this.selectedTime === null && time === null) return;
    if (this.selectedTime === undefined && time === undefined) return;
    if (this.selectedTime && time && isEqual(normalizeDatePart(this.selectedTime), normalizeDatePart(time))) return;

    this.selectedTime = time ? normalizeDatePart(time) : null;

    this.valueChangeSubject$.next(this.selectedTime);
    this.valueChanged.emit(this.selectedTime);
    this.isFieldFilled = !!this.selectedTime;
    this.onChange(this.selectedTime); // notify ControlValueAccessor of the change
    this.onTouched();
  }

  // #endregion

  // #region Time

  /** Uses the entered string, parses it and returns the resulting Date. */
  private onParse(dateString: string, unicodeTokenFormat: string): Date | null {
    return parseUnicodeDateTime(dateString, unicodeTokenFormat);
  }

  // #endregion

  private updateMask(): void {
    this.ngxMask = formatToTimeTokenMask(this.unicodeTokenFormat!, this.maskChar);
  }

  private trySetTimeFromInput(value: Date | null | string): void {
    if (value === null || value === undefined || value === '') {
      this.setTime(null);
      return;
    }

    if (isValidDateObject(value)) {
      this.setTime(value as Date);
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        this.setTime(null);
        return;
      }

      const parsedDate = this.onParse(trimmed, this.unicodeTokenFormat || this.defaultUnicodeTokenFormat);

      if (parsedDate) {
        this.setTime(parsedDate);
        return;
      }
    }

    this.setTime(null);
  }

  private setTime(time: Date | null): void {
    this.selectTime(time);

    // Waits for the ngxMask directive to initialize on the input, which it does across a full task —
    // a microtask would land before it. `stepSegment` restores the caret from a timer queued behind
    // this one, so this must stay a macrotask.
    setTimeout(() => {
      // ngxMask leaves an empty input untouched, so render the empty state ourselves
      if (this.selectedTime == null) {
        this.renderEmpty();
        return;
      }

      const formatted = format(this.selectedTime, this.unicodeTokenFormat || this.defaultUnicodeTokenFormat);
      if (this.inputRef.nativeElement.value !== formatted) this.inputRef.nativeElement.value = formatted;
    });
  }
}
