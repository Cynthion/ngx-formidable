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
  formatToTimeTokenMask,
  isValidDateObject,
  normalizeDatePart,
  parseUnicodeDateTime,
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
  protected registeredKeys = ['Enter'];

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

  /** Override onValueChange to only trigger onChange and valueChanged events when a time is set. */
  protected override onValueChange(): void {
    const value = this.value;
    this.isFieldFilled = typeof value === 'string' || Array.isArray(value) ? value.length > 0 : !!value;

    // value changes are handled in selectTime method
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(isFocused: boolean): void {
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
    }
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

  /** ngxMask's own empty display: the mask with every slot as its placeholder character. */
  private get maskPlaceholder(): string {
    return this.ngxMask.replace(/\w/g, '_');
  }

  /** The resting display of an empty field for the current `emptyHint`: the format string, or `maskPlaceholder`. */
  private get emptyDisplay(): string {
    return this.emptyHint === 'format' ? (this.unicodeTokenFormat ?? '') : this.maskPlaceholder;
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

    // ensure ngxMask is initialized before applying the value
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
