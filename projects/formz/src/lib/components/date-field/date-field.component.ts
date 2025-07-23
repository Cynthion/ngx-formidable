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
import { NgxMaskConfig } from 'ngx-mask';
import Pikaday, { PikadayI18nConfig, PikadayOptions } from 'pikaday';
import { FieldDecoratorLayout, FORMZ_FIELD, FormzPanelPosition } from '../../formz.model';
import { calendarArrowDown, calendarArrowUp } from '../../icons';
import { scrollIntoView, updatePanelPosition } from '../../panel.behavior';
import { BaseFieldDirective } from '../base-field.component';

@Component({
  selector: 'formz-date-field',
  templateUrl: './date-field.component.html',
  styleUrls: ['./date-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzField
    {
      provide: FORMZ_FIELD,
      useExisting: DateFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateFieldComponent
  extends BaseFieldDirective<Date | undefined>
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('dateRef', { static: true }) dateRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('pickerRef') pickerRef?: ElementRef<HTMLDivElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter'];

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
    // onSelect: (date: Date) => this.selectDate(date) // TODO use this
    onSelect: (date: Date) => this.onSelect(date)
  };

  private readonly defaultOptions: PikadayOptions = {
    ariaLabel: undefined,
    format: 'yyyy-MM-dd',
    defaultDate: undefined,
    setDefaultDate: true,
    firstDay: 1,
    minDate: undefined,
    maxDate: undefined,
    disableWeekends: false,
    disableDayFn: undefined,
    yearRange: 2,
    // i18n: undefined, // TODO
    yearSuffix: '',
    showMonthAfterYear: false,
    showDaysInNextAndPreviousMonths: true,
    enableSelectionDaysInNextAndPreviousMonths: true,
    numberOfMonths: 1
  };

  private picker?: Pikaday;

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
    // Only here to satisfy the abstract method
  }

  protected doOnFocusChange(isFocused: boolean): void {
    // try set date on blur
    if (!isFocused) {
      this.trySetDateFromInput();
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

  //#region ControlValueAccessor

  protected doWriteValue(value: Date): void {
    if (value && this.isValidDate(value)) {
      this.selectedDate = value;

      this.isFieldFilled = !!value;

      // ensure ngxMask is initialized before applying the value
      // don't silent update to achieve valueChanged/focusChanged events
      setTimeout(() => this.picker?.setDate(value, false));
    }
  }

  //#endregion

  //#region IFormzField

  get value(): Date {
    return this.selectedDate || new Date();
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.dateRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  //#region IFormzDateField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() unicodeTokenFormat = this.defaultOptions.format; // yyyy-MM-dd

  protected ngxMask = this.formatToMask(this.unicodeTokenFormat!);

  protected toggleIconClosed = calendarArrowDown;
  protected toggleIconOpen = calendarArrowUp;

  protected ngxMaskConfig: Partial<NgxMaskConfig> = {
    showMaskTyped: true,
    leadZeroDateTime: false, // must be enforced by unicodeTokenFormat, if required
    dropSpecialCharacters: false // keep special characters like '-', '.' or '/' in the input
  };

  private selectedDate?: Date;

  public selectDate(date: Date | null): void {
    // only trigger value changes if there are changes
    // (panel could close without date change)
    if (this.selectedDate === null && date === null) return;
    if (this.selectedDate === undefined && date === undefined) return;
    if (this.selectedDate && date && isEqual(this.selectedDate, date)) return;

    this.selectedDate = date ? date : undefined;

    this.valueChangeSubject$.next(this.selectedDate);
    this.valueChanged.emit(this.selectedDate);
    this.isFieldFilled = !!this.selectedDate;
    this.onChange(this.selectedDate); // notify ControlValueAccessor of the change
    this.onTouched();
    this.togglePanel(false);
  }

  //#endregion

  //#region IFormzPikadayOptions

  @Input() ariaLabel?: string;
  @Input() defaultDate?: Date;
  @Input() setDefaultDate?: boolean;
  @Input() firstDay?: number;
  @Input() minDate?: Date;
  @Input() maxDate?: Date;
  @Input() disableWeekends?: boolean;
  @Input() disableDayFn?: (date: Date) => boolean;
  @Input() yearRange?: number | number[];
  @Input() i18n?: PikadayI18nConfig;
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
      // i18n: this.i18n ?? this.defaultOptions.i18n,
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

      // This is a Pikaday library fix that allows to use "field: undefined" and still show the container.
      // if (!updatedOptions.field && updatedOptions.container) {
      //   updatedOptions.container.appendChild(this.picker.el);
      // }
    } else {
      this.picker.config(updatedOptions);
    }
  }

  private updateMask(): void {
    this.ngxMask = this.formatToMask(this.unicodeTokenFormat!);
  }

  //#endregion

  //#region IFormzPanelField

  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  @Input()
  get isPanelOpen(): boolean {
    return this._isPanelOpen;
  }
  set isPanelOpen(val: boolean) {
    this.togglePanel(val);
  }

  @Input() panelPosition: FormzPanelPosition = 'right';

  private _isPanelOpen = false;

  protected toggleClick(event: MouseEvent): void {
    event.preventDefault(); // prevent input from losing focus
    this.inputRef.nativeElement.focus(); // ensure input remains focused
    this.togglePanel(!this.isPanelOpen);
  }

  protected togglePanel(isOpen: boolean): void {
    this._isPanelOpen = isOpen;

    // additional field specific behavior
    if (isOpen) {
      setTimeout(() => scrollIntoView(this.dateRef, this.panelRef));
      updatePanelPosition(this.dateRef, this.panelRef);
    }

    this.cdRef.markForCheck(); // TODO check if other field panels need this also for when open/closing with keys
  }

  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.dateRef, this.panelRef));
  }

  //#endregion

  //#region Pikaday

  /** Uses the selected Date, formats it and writes the resulting string into the field. */
  private onFormat(date: Date | null, unicodeTokenFormat: string): string {
    const formattedDate = date ? format(date, unicodeTokenFormat) : '';

    return formattedDate;
  }

  /** Uses the entered string, parses it and writes/selects the resulting Date into the picker. */
  private onParse(dateString: string, unicodeTokenFormat: string): Date | null {
    const maskedDate = dateString.trim();

    if (maskedDate.includes('_')) {
      return null;
    }

    const parsedDate = parse(maskedDate, unicodeTokenFormat, new Date());

    if (!this.isValidDate(parsedDate)) {
      return null; // TODO reset or set selectedDate to null?
    }

    return parsedDate;
  }

  private onSelect(date: Date): void {
    console.log('onSelect called with date:', date);
    this.selectDate(date);
  }

  //#endregion

  private getDefaultDate(minDate?: Date, maxDate?: Date, initialDate: Date = new Date()): Date {
    const initialDateMs = initialDate.getTime();

    if (minDate && minDate.getTime() > initialDateMs) {
      return minDate;
    } else if (maxDate && maxDate.getTime() < initialDateMs) {
      return maxDate;
    }

    return initialDate;
  }

  private formatToMask(unicodeTokenFormat: string): string {
    // TODO ensure only valid date/time tokens are provided to unicodeTokenFormat
    // TODO check possibility: AM/PM, named months/days (MMM, EEEE, etc.) can't be mapped to mask (0) and require alphabetic masks (A), but ngx-mask isn't intended for that.
    return unicodeTokenFormat.replace(/[a-zA-Z]+/g, (match) => '0'.repeat(match.length));
  }

  private isValidDate(date: Date): boolean {
    const result = date instanceof Date && !isNaN(date.getTime());

    if (!result) {
      console.error('Invalid date provided to DateFieldComponent:', date);
    }

    return result;
  }

  private trySetDateFromInput(): void {
    const parsedDate = this.onParse(
      this.inputRef.nativeElement.value,
      this.unicodeTokenFormat || this.defaultOptions.format!
    );

    if (parsedDate) {
      this.setDate(parsedDate);
    } else {
      this.resetDate();
    }
  }

  private setDate(date: Date): void {
    this.picker?.setDate(date, false);
    this.selectDate(date);
  }

  private resetDate(): void {
    this.picker?.setDate(null, false);
    this.selectDate(null);
    const emptyMask = this.onFormat(null, this.unicodeTokenFormat || this.defaultOptions.format!);
    this.inputRef.nativeElement.value = emptyMask;
  }
}
