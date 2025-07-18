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
import { FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { format, parse } from 'date-fns';
import { NgxMaskConfig, NgxMaskPipe } from 'ngx-mask';
import Pikaday, { PikadayI18nConfig, PikadayOptions } from 'pikaday';
import { FieldDecoratorLayout, FORMZ_FIELD, FormzPanelPosition } from '../../formz.model';
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
export class DateFieldComponent extends BaseFieldDirective implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('dateRef', { static: true }) dateRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('pickerRef') pickerRef?: ElementRef<HTMLDivElement>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = () => this.handleExternalClick();
  protected windowResizeScrollCallback = () => this.updatePanelPosition();
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown'];

  // private readonly cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

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
    onSelect: (date: Date) => this.onSelect(date)
    // onOpen: () => this.onOpen(),
    // onClose: () => this.onClose(),
    // onDraw: () => this.onDraw(),
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

  control!: FormControl; // initialized in ngOnInit

  constructor(private maskPipe: NgxMaskPipe) {
    super();
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

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  private handleKeydown(event: KeyboardEvent): void {
    // TODO support selection of date within picker
    switch (event.key) {
      case 'Escape':
      case 'Tab':
        if (this.isPanelOpen) this.togglePanel(false);
        break;
      case 'ArrowDown':
        if (!this.isPanelOpen) {
          this.togglePanel(true);
        }
        break;
    }
  }

  private handleExternalClick(): void {
    if (!this.isPanelOpen) return;

    this.togglePanel(false);
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    this.selectedDate = value;

    this.isFieldFilled = !!value;

    // write to wrapped input
    console.log('doWriteValue:', value);
    // this.inputRef.nativeElement.value = value;
  }

  //#endregion

  //#region IFormzField

  get value(): string {
    return this.selectedDate ?? '';
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
  // @Input() ngxMask = '0000-00-00'; // TODO not required anymore, auto-generated // dD, mM, s, m, Hh are reserved for date/time formatting
  @Input() unicodeTokenFormat = this.defaultOptions.format; // yyyy-MM-dd

  protected ngxMask = this.formatToMask(this.unicodeTokenFormat!);

  // TODO provide by interface, update on changes?
  protected ngxMaskConfig: Partial<NgxMaskConfig> = {
    showMaskTyped: true,
    leadZeroDateTime: false // must be enforced by unicodeTokenFormat, if required
  };

  private selectedDate?: string; // TODO type Date?

  public selectDate(date: string): void {
    this.selectedDate = date;

    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.focusChanged.emit(false);
    this.valueChangeSubject$.next(this.selectedDate);
    this.valueChanged.emit(this.selectedDate);
    this.isFieldFilled = this.selectDate.length > 0;
    this.onChange(this.selectDate); // notify ControlValueAccessor of the change
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
      field: this.inputRef.nativeElement,
      container: this.pickerRef?.nativeElement
    };

    if (!this.picker) {
      this.picker = new Pikaday(updatedOptions);
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

  protected togglePanel(isOpen: boolean): void {
    this._isPanelOpen = isOpen;

    // additional field specific behavior
    if (isOpen) {
      // this.highlightSelectedOption();
      setTimeout(() => scrollIntoView(this.dateRef, this.panelRef));
      updatePanelPosition(this.dateRef, this.panelRef);
      // this.cdRef.markForCheck();
    } else {
      // this.setHighlightedIndex(-1);
    }
  }

  private updatePanelPosition(): void {
    setTimeout(() => updatePanelPosition(this.dateRef, this.panelRef));
  }

  //#endregion

  //#region Pikaday

  private onFormat(date: Date, unicodeTokenFormat: string): string {
    console.log('onFormat called with date:', date, 'and format:', unicodeTokenFormat);

    const formattedDate = format(date, unicodeTokenFormat);
    const maskedDate = this.maskPipe.transform(formattedDate, this.ngxMask, this.ngxMaskConfig);

    return maskedDate;
  }

  private onParse(dateString: string, unicodeTokenFormat: string): Date | null {
    console.log('onParse called with dateString:', dateString, 'and format:', unicodeTokenFormat);

    const maskedDate = dateString.trim();

    if (maskedDate.includes('_')) {
      return null;
    }

    const parsedDate = parse(maskedDate, unicodeTokenFormat, new Date());

    if (isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  private onSelect(date: Date): void {
    // this.selectDate(pikaday.toString(date.toString()));
    console.log('onSelect called with date:', date);
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
    // Replace each run of letters with the same number of zeros
    return unicodeTokenFormat.replace(/[a-zA-Z]+/g, (match) => '0'.repeat(match.length));
  }
}
