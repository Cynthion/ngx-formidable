import {
  AfterViewInit,
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
import { isEqual, parse } from 'date-fns';
import { NgxMaskConfig } from 'ngx-mask';
import {
  formatToTimeTokenMask,
  isValidDateObject,
  normalizeDatePart,
  UNICODE_TIME_TOKENS,
  validateUnicodeTimeTokenFormat
} from '../../../helpers/format.helpers';
import { setCaretPositionToEnd } from '../../../helpers/input.helpers';
import { FieldDecoratorLayout, FORMZ_FIELD, IFormzTimeField } from '../../../models/formz.model';
import { BaseFieldDirective } from '../base-field.component';

/**
 * A masked time-only input field using Unicode formatting.
 *
 * Provides a form-compatible field for entering time values like:
 * - `'HH.mm'` (e.g. 13.45)
 * - `'HH:mm:ss'`
 * - `'hh:mm a'` (12-hour with AM/PM)
 *
 * ## Features
 * - Unicode time format input (via `unicodeTokenFormat`)
 * - Masked input with `ngx-mask`
 * - Emits normalized `Date` values (with date set to `1970-01-01`)
 *
 * ## Normalization Behavior
 * All emitted or compared values are normalized to remove the **date** portion:
 * ```ts
 * normalizeDatePart(date: Date): Date // date => 1970-01-01
 * ```
 * This allows consistent time-only comparison even though `Date` is used.
 *
 * ## Inputs
 * - `name`: Field name
 * - `placeholder`: Input placeholder text
 * - `required`: Whether the field is required
 * - `unicodeTokenFormat`: Time format string (default: `'HH.mm'`)
 *
 * ## Outputs
 * - `valueChanged: EventEmitter<Date | null>`
 *
 * ## Usage Example:
 * ```html
 * <formz-time-field
 *   name="startTime"
 *   placeholder="Enter time"
 *   [unicodeTokenFormat]="'HH:mm'"
 *   [(ngModel)]="form.startTime">
 * </formz-time-field>
 * ```
 */
@Component({
  selector: 'formz-time-field',
  templateUrl: './time-field.component.html',
  styleUrls: ['./time-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzField
    {
      provide: FORMZ_FIELD,
      useExisting: TimeFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeFieldComponent
  extends BaseFieldDirective<Date | null>
  implements IFormzTimeField, OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('timeRef', { static: true }) timeRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['Enter'];

  private maskChar = '0';
  private emptyMaskChar = '_';
  private readonly defaultUnicodeTokenFormat = 'HH.mm';

  override ngOnInit(): void {
    super.ngOnInit();

    if (!validateUnicodeTimeTokenFormat(this.unicodeTokenFormat)) {
      console.warn(
        `Invalid unicodeTokenFormat: "${this.unicodeTokenFormat}". ` +
          `Falling back to default "${this.defaultUnicodeTokenFormat}". Supported tokens: ${UNICODE_TIME_TOKENS.join(', ')}.`
      );

      this.unicodeTokenFormat = this.defaultUnicodeTokenFormat;
    }
  }

  ngAfterViewInit(): void {
    this.updateMask();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unicodeTokenFormat'] && !changes['unicodeTokenFormat'].firstChange) {
      this.updateMask();
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
    // try set date on blur
    if (!isFocused) {
      this.trySetTimeFromInput(this.inputRef.nativeElement.value);
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        this.trySetTimeFromInput(this.inputRef.nativeElement.value);
        break;
    }
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: Date): void {
    this.trySetTimeFromInput(value);
  }

  //#endregion

  //#region IFormzField

  get value(): Date {
    return this.selectedTime || new Date();
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.timeRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  //#region IFormzTimeField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() unicodeTokenFormat = this.defaultUnicodeTokenFormat;

  protected ngxMask = formatToTimeTokenMask(this.unicodeTokenFormat!, this.maskChar);
  private emptyNgxMask = formatToTimeTokenMask(this.unicodeTokenFormat!, this.emptyMaskChar);

  protected ngxMaskConfig: Partial<NgxMaskConfig> = {
    showMaskTyped: true,
    leadZeroDateTime: false, // must be enforced by unicodeTokenFormat, if required
    dropSpecialCharacters: false // keep special characters like '-', '.' or '/' in the input
  };

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
    setCaretPositionToEnd(this.inputRef.nativeElement);
  }

  //#endregion

  //#region Time

  /** Uses the entered string, parses it and returns the resulting Date. */
  private onParse(dateString: string, unicodeTokenFormat: string): Date | null {
    const parsedDate = parse(dateString.trim(), unicodeTokenFormat, new Date());

    if (!isValidDateObject(parsedDate)) {
      return null;
    }

    return parsedDate;
  }

  //#endregion

  private updateMask(): void {
    this.ngxMask = formatToTimeTokenMask(this.unicodeTokenFormat!, this.maskChar);
    this.emptyNgxMask = formatToTimeTokenMask(this.unicodeTokenFormat!, this.emptyMaskChar);
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
      // write empty mask until ngxMask re-applies it on focus
      if (time == null) {
        this.inputRef.nativeElement.value = this.emptyNgxMask;
      }
    });
  }
}
