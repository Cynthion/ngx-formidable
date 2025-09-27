import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { addDays, format, isEqual, parse } from 'date-fns';
import { NgxMaskConfig, NgxMaskDirective } from 'ngx-mask';
import Pikaday, { PikadayI18nConfig, PikadayOptions } from 'pikaday';
import {
  formatToDateTokenMask,
  isValidDateObject,
  normalizeTimePart,
  UNICODE_DATE_TOKENS,
  validateUnicodeDateTokenFormat
} from '../../../helpers/format.helpers';
import { setCaretPositionToEnd } from '../../../helpers/input.helpers';
import { scrollIntoView, updatePanelPosition } from '../../../helpers/position.helpers';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FormidablePanelPosition,
  IFormidableDateField
} from '../../../models/formidable.model';
import { calendarArrowDown, calendarArrowUp } from '../../../models/icons';
import { IconComponent } from '../../icon/icon.component';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * An input field for selecting dates via masked text entry or a Pikaday calendar popup.
 * Provides:
 * - Masked input (ngx-mask) according to a Unicode date format (e.g. "yyyy-MM-dd").
 * - Automatic parsing/formatting.
 * - Simple keyboard handling.
 * - Pikaday calendar panel (with customizable options: minDate, maxDate, firstDay, i18n labels, yearRange, etc.).
 *
 * @input unicodeTokenFormat?: string
 *   Unicode date format mask (defaults to "yyyy-MM-dd").
 *
 * @input toggleIconClosed?: string
 * @input toggleIconOpen?: string
 *   Icons for open/closed calendar toggle (SVG path data).
 *
 * @input ariaLabel?: string
 * @input defaultDate?: Date
 * @input setDefaultDate?: boolean
 * @input firstDay?: number
 * @input minDate?: Date
 * @input maxDate?: Date
 * @input disableWeekends?: boolean
 * @input disableDayFn?: (date: Date) => boolean
 * @input yearRange?: number | number[]
 * @input i18n?: PikadayI18nConfig
 * @input yearSuffix?: string
 * @input showMonthAfterYear?: boolean
 * @input showDaysInNextAndPreviousMonths?: boolean
 * @input enableSelectionDaysInNextAndPreviousMonths?: boolean
 * @input numberOfMonths?: number
 *   All map to PikadayOptions for calendar behavior.
 *
 * @input isPanelOpen: boolean
 * @input panelPosition?: 'left' | 'right' | 'full'
 *   Controls popup open state and positioning.
 *
 * @output valueChanged: EventEmitter<Date|null>
 * @output focusChanged: EventEmitter<boolean>
 *   Emitted when the date is selected/cleared or focus changes.
 *
 * Example:
 * ```html
 * <formidable-date-field
 *   name="birthdate"
 *   ngModel
 *   [unicodeTokenFormat]="'dd.MM.yyyy'"
 *   [minDate]="minDate"
 *   [maxDate]="maxDate"
 *   [yearRange]="[1900, 2025]"
 * ></formidable-date-field>
 * ```
 */
@Component({
  selector: 'formidable-date-field',
  templateUrl: './date-field.component.html',
  styleUrls: ['./date-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, NgxMaskDirective, IconComponent],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: DateFieldComponent
    }
  ]
})
export class DateFieldComponent
  extends BaseFieldDirective<Date | null>
  implements IFormidableDateField, OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('dateRef', { static: true }) dateRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('pickerRef') pickerRef?: ElementRef<HTMLDivElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'];

  private maskChar = '0';
  private emptyMaskChar = '_';
  private readonly defaultUnicodeTokenFormat = 'yyyy-MM-dd';

  private readonly cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  private readonly staticOptions: PikadayOptions = {
    field: undefined, // not supported
    trigger: undefined, // not supported
    bound: false, // not supported
    position: undefined, // not supported
    reposition: false, // not supported
    container: undefined, // not supported
    showWeekNumber: false, // not supported
    pickWholeWeek: false, // not supported
    isRTL: false, // not supported
    mainCalendar: 'left', // not supported
    events: [], // not supported
    theme: undefined, // not supported
    blurFieldOnSelect: false, // not supported
    formatStrict: false, // not supported
    keyboardInput: false, // not supported
    toString: (date: Date, unicodeTokenFormat: string): string => this.onFormat(date, unicodeTokenFormat),
    parse: (dateString: string, unicodeTokenFormat: string): Date | null =>
      this.onParse(dateString, unicodeTokenFormat),
    onSelect: (date: Date) => this.selectDate(date),
    onDraw: () => this.decoratePikadayControls()
  };

  private readonly defaultOptions: PikadayOptions = {
    ariaLabel: undefined,
    format: this.defaultUnicodeTokenFormat,
    defaultDate: undefined,
    setDefaultDate: true,
    firstDay: 1,
    minDate: undefined,
    maxDate: undefined,
    disableWeekends: false,
    disableDayFn: undefined,
    yearRange: 2,
    i18n: {
      previousMonth: 'Previous Month',
      nextMonth: 'Next Month',
      months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ],
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    },
    yearSuffix: '',
    showMonthAfterYear: false,
    showDaysInNextAndPreviousMonths: true,
    enableSelectionDaysInNextAndPreviousMonths: true,
    numberOfMonths: 1
  };

  private picker?: Pikaday;

  override ngOnInit(): void {
    super.ngOnInit();

    if (!validateUnicodeDateTokenFormat(this.unicodeTokenFormat)) {
      console.warn(
        `[ngx-formidable] Invalid unicodeTokenFormat: "${this.unicodeTokenFormat}". ` +
          `Falling back to default "${this.defaultUnicodeTokenFormat}". Supported tokens: ${UNICODE_DATE_TOKENS.join(', ')}.`
      );

      this.unicodeTokenFormat = this.defaultUnicodeTokenFormat;
    }
  }

  ngAfterViewInit(): void {
    this.updateOptions();
    this.updateMask();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes[0] && !changes[0].firstChange) {
      this.updateOptions();
      this.updateMask();
    }
  }

  /** Override onValueChange to only trigger onChange and valueChanged events when a date is set. */
  protected override onValueChange(): void {
    const value = this.value;
    this.isFieldFilled = typeof value === 'string' || Array.isArray(value) ? value.length > 0 : !!value;

    // value changes are handled in selectDate method
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(isFocused: boolean): void {
    // try set date on blur
    if (!isFocused && !this.ignoreNextBlur) {
      this.trySetDateFromInput(this.inputRef.nativeElement.value);
      this.ignoreNextBlur = false;
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    const date = this.picker?.getDate();

    switch (event.key) {
      case 'Escape':
      case 'Tab':
      case 'Enter':
        if (this.isPanelOpen) {
          this.togglePanel(false);
          const currentDate = this.picker!.getDate();
          this.selectDate(currentDate); // select the current date on close
        } else {
          this.trySetDateFromInput(this.inputRef.nativeElement.value);
        }
        break;
      case 'ArrowDown':
        if (!this.isPanelOpen) {
          this.togglePanel(true);
        } else {
          if (date) {
            const nextDate = addDays(date, 7);
            this.picker?.setDate(nextDate, true); // silent update
          }
        }
        break;
      case 'ArrowUp':
        if (this.isPanelOpen && date) {
          const nextDate = addDays(date, -7);
          this.picker?.setDate(nextDate, true); // silent update
        }
        break;
      case 'ArrowLeft':
        if (this.isPanelOpen && date) {
          const nextDate = addDays(date, -1);
          this.picker?.setDate(nextDate, true); // silent update
        }
        break;
      case 'ArrowRight':
        if (this.isPanelOpen && date) {
          const nextDate = addDays(date, 1);
          this.picker?.setDate(nextDate, true); // silent update
        }
        break;
    }
  }

  private handleExternalClick(): void {
    if (!this.isPanelOpen) return;

    this.togglePanel(false);
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: Date): void {
    this.trySetDateFromInput(value);
  }

  // #endregion

  // #region IFormidableField

  get value(): Date | null {
    return this.selectedDate || null;
  }

  get isLabelFloating(): boolean {
    const blocked = this.disabled || this.readonly;
    return !blocked && !this.isFieldFocused && !this.isFieldFilled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.dateRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  // #endregion

  // #region IFormidableDateField

  @Input() unicodeTokenFormat = this.defaultUnicodeTokenFormat;
  @Input() toggleIconClosed = calendarArrowDown;
  @Input() toggleIconOpen = calendarArrowUp;

  protected ngxMask = formatToDateTokenMask(this.unicodeTokenFormat!, this.maskChar);
  private emptyNgxMask = formatToDateTokenMask(this.unicodeTokenFormat!, this.emptyMaskChar);

  protected ngxMaskConfig: Partial<NgxMaskConfig> = {
    showMaskTyped: true,
    leadZeroDateTime: false, // must be enforced by unicodeTokenFormat, if required
    dropSpecialCharacters: false // keep special characters like '-', '.' or '/' in the input
  };

  private selectedDate: Date | null = null;

  public selectDate(date: Date | null): void {
    // only trigger value changes if there are changes
    // (panel could close without date change)
    if (this.selectedDate === null && date === null) return;
    if (this.selectedDate === undefined && date === undefined) return;
    if (this.selectedDate && date && isEqual(normalizeTimePart(this.selectedDate), normalizeTimePart(date))) return;

    this.selectedDate = date ? normalizeTimePart(date) : null;

    this.valueChangeSubject$.next(this.selectedDate);
    this.valueChanged.emit(this.selectedDate);
    this.isFieldFilled = !!this.selectedDate;
    this.onChange(this.selectedDate); // notify ControlValueAccessor of the change
    this.onTouched();
    this.togglePanel(false);
    setCaretPositionToEnd(this.inputRef.nativeElement);
  }

  // #endregion

  // #region IFormidablePikadayOptions

  @Input() ariaLabel?: string;
  @Input() defaultDate?: Date;
  @Input() setDefaultDate?: boolean;
  @Input() firstDay?: number;
  @Input() minDate?: Date;
  @Input() maxDate?: Date;
  @Input() disableWeekends?: boolean;
  @Input() disableDayFn?: (date: Date) => boolean;
  @Input() yearRange?: number | number[];
  @Input() i18n?: PikadayI18nConfig = undefined;
  @Input() yearSuffix?: string;
  @Input() showMonthAfterYear?: boolean;
  @Input() showDaysInNextAndPreviousMonths?: boolean;
  @Input() enableSelectionDaysInNextAndPreviousMonths?: boolean;
  @Input() numberOfMonths?: number;

  private updateOptions(): void {
    const dynamicOptions: PikadayOptions = {
      ...this.defaultOptions,
      ariaLabel: this.ariaLabel ?? this.defaultOptions.ariaLabel,
      format: this.unicodeTokenFormat ?? this.defaultOptions.format,
      defaultDate: this.getDefaultDate(this.minDate, this.maxDate, this.defaultDate) ?? this.defaultOptions.defaultDate,
      setDefaultDate: this.setDefaultDate ?? this.defaultOptions.setDefaultDate,
      firstDay: this.firstDay ?? this.defaultOptions.firstDay,
      minDate: this.minDate ?? this.defaultOptions.minDate,
      maxDate: this.maxDate ?? this.defaultOptions.maxDate,
      disableWeekends: this.disableWeekends ?? this.defaultOptions.disableWeekends,
      disableDayFn: this.disableDayFn ?? this.defaultOptions.disableDayFn,
      yearRange: this.yearRange ?? this.defaultOptions.yearRange,
      i18n: this.i18n || this.defaultOptions.i18n,
      yearSuffix: this.yearSuffix ?? this.defaultOptions.yearSuffix,
      showMonthAfterYear: this.showMonthAfterYear ?? this.defaultOptions.showMonthAfterYear,
      showDaysInNextAndPreviousMonths:
        this.showDaysInNextAndPreviousMonths ?? this.defaultOptions.showDaysInNextAndPreviousMonths,
      enableSelectionDaysInNextAndPreviousMonths:
        this.enableSelectionDaysInNextAndPreviousMonths ??
        this.defaultOptions.enableSelectionDaysInNextAndPreviousMonths,
      numberOfMonths: this.numberOfMonths ?? this.defaultOptions.numberOfMonths
    };

    const updatedOptions: PikadayOptions = {
      ...this.staticOptions,
      ...dynamicOptions,
      field: this.inputRef.nativeElement, // must be set to use onFormat/onParse
      bound: false,
      container: this.pickerRef?.nativeElement
    };

    if (!this.picker) {
      this.picker = new Pikaday(updatedOptions);
    } else {
      this.picker.config(updatedOptions);
    }
  }

  private updateMask(): void {
    this.ngxMask = formatToDateTokenMask(this.unicodeTokenFormat!, this.maskChar);
    this.emptyNgxMask = formatToDateTokenMask(this.unicodeTokenFormat!, this.emptyMaskChar);
  }

  // #endregion

  // #region IFormidablePanelField

  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  @Input()
  get isPanelOpen(): boolean {
    return this._isPanelOpen;
  }
  set isPanelOpen(val: boolean) {
    this.togglePanel(val);
  }

  @Input() panelPosition: FormidablePanelPosition = 'right';

  private _isPanelOpen = false;
  private ignoreNextBlur = false;

  /** Mousedown is used to prevent sending focusChanged events. */
  protected toggleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.inputRef.nativeElement.focus(); // ensure input remains focused, so keyboard events work
    this.togglePanel(!this.isPanelOpen);
  }

  /**
   * Workaround: Because the <input> element might have regained focus (for keyboard events), the focus needs to be set to the panel first.
   * Otherwise, clicking the nested <select>, etc. would not work as expected.
   */
  protected panelMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    const isFocusable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLButtonElement ||
      target.hasAttribute('tabindex');

    if (isFocusable) {
      this.ignoreNextBlur = true;
      this.panelRef?.nativeElement.focus();
    }
  }

  protected togglePanel(isOpen: boolean): void {
    this._isPanelOpen = isOpen;

    // additional field specific behavior
    setTimeout(() => scrollIntoView(this.dateRef, this.panelRef, isOpen));

    if (isOpen) {
      this.panelRef?.nativeElement.focus();
      updatePanelPosition(this.dateRef, this.panelRef);
    }

    this.cdRef.markForCheck();
  }

  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.dateRef, this.panelRef));
  }

  // #endregion

  // #region Pikaday

  /** Uses the selected Date, formats it and writes the resulting string into the field. */
  private onFormat(date: Date | null, unicodeTokenFormat: string): string {
    const formattedDate = date ? format(date, unicodeTokenFormat) : '';

    return formattedDate;
  }

  /** Uses the entered string, parses it and writes/selects the resulting Date into the picker. */
  private onParse(dateString: string, unicodeTokenFormat: string): Date | null {
    const parsedDate = parse(dateString.trim(), unicodeTokenFormat, new Date());

    if (!isValidDateObject(parsedDate)) {
      return null;
    }

    return parsedDate;
  }

  // #endregion

  private getDefaultDate(minDate?: Date, maxDate?: Date, initialDate: Date = new Date()): Date {
    const initialDateMs = initialDate.getTime();

    if (minDate && minDate.getTime() > initialDateMs) {
      return minDate;
    } else if (maxDate && maxDate.getTime() < initialDateMs) {
      return maxDate;
    }

    return initialDate;
  }

  private trySetDateFromInput(value: Date | null | string): void {
    if (value === null || value === undefined || value === '') {
      this.setDate(null);
      return;
    }

    if (isValidDateObject(value)) {
      this.setDate(value as Date);
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        this.setDate(null);
        return;
      }

      const parsedDate = this.onParse(trimmed, this.unicodeTokenFormat || this.defaultUnicodeTokenFormat);

      if (parsedDate) {
        this.setDate(parsedDate);
        return;
      }
    }

    this.setDate(null);
  }

  private setDate(date: Date | null): void {
    this.selectDate(date);

    // ensure ngxMask is initialized before applying the value
    setTimeout(() => {
      this.picker?.setDate(date, false); // don't silent update to achieve valueChanged/focusChanged events

      // write empty mask until ngxMask re-applies it on focus
      if (date == null) {
        this.inputRef.nativeElement.value = this.emptyNgxMask;
      }
    });
  }

  // #region Pikaday fix

  /**
   * Developer Note:
   * Pikaday’s internal <select> elements for month/year do not include `id` or `name`
   * attributes by default. This triggers Chrome’s "A form field element should have
   * an id or name" warning during audits. While it’s not strictly required for
   * functionality, adding these attributes:
   *   - Removes the Chrome warning.
   *   - Improves accessibility (screen readers can target the controls).
   *   - Produces predictable, unique IDs for easier testing/debugging.
   *
   * We hook into Pikaday’s `onDraw` (and run once on init) to set both `id` and `name`
   * based on the field’s `name`/`fieldId`. A MutationObserver is also attached to catch
   * any DOM rebuilds outside of `onDraw`.
   *
   * This is a cosmetic/accessibility fix — it does not affect Pikaday’s behavior.
   */

  private mo?: MutationObserver;

  private decoratePikadayControls(): void {
    const host = this.pickerRef?.nativeElement;
    if (!host) return;

    const monthSelects = Array.from(host.querySelectorAll<HTMLSelectElement>('select.pika-select-month'));
    const yearSelects = Array.from(host.querySelectorAll<HTMLSelectElement>('select.pika-select-year'));

    // Prefix with field info for uniqueness & readability
    const prefix = `${this.name || 'date'}-${this.fieldId}`;

    monthSelects.forEach((el, i) => {
      const id = `${prefix}-month${monthSelects.length > 1 ? `-${i}` : ''}`;
      el.id = id;
      el.name = id; // name is what Chrome’s warning cares about, too
      el.setAttribute('aria-label', this.i18n?.months ? 'Month' : 'Month');
      el.setAttribute('autocomplete', 'off');
    });

    yearSelects.forEach((el, i) => {
      const id = `${prefix}-year${yearSelects.length > 1 ? `-${i}` : ''}`;
      el.id = id;
      el.name = id;
      el.setAttribute('aria-label', 'Year');
      el.setAttribute('autocomplete', 'off');
    });

    // Optional: observe future redraws if UI mutates outside of onDraw
    if (!this.mo) {
      this.mo = new MutationObserver(() => this.decoratePikadayControls());
      this.mo.observe(host, { subtree: true, childList: true });
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.mo?.disconnect();
  }

  // #endregion
}
