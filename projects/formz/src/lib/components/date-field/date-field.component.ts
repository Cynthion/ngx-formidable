import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Pikaday, { PikadayI18nConfig, PikadayOptions } from 'pikaday';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FormzFieldBase, IFormzDateField } from '../../form-model';

@Component({
  selector: 'formz-date-field',
  templateUrl: './date-field.component.html',
  styleUrls: ['./date-field.component.scss'],
  providers: [
    // required to use FormzFieldBase  during injection as a base class for this component
    { provide: FormzFieldBase, useExisting: forwardRef(() => DateFieldComponent) },
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateFieldComponent
  extends FormzFieldBase
  implements OnInit, AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor, IFormzDateField
{
  @ViewChild('dateRef', { static: true }) dateRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;
  @ViewChild('pickerRef') pickerRef?: ElementRef<HTMLDivElement>;

  protected selectedDate?: string; // TODO type Date?
  protected isOpen = false;

  private id = uuid();
  protected isFieldFocused = false;
  private isFieldFilled = false;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  private globalClickUnlisten?: () => void;
  private globalKeydownUnlisten?: () => void;

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
    toString: undefined, // not supported
    parse: undefined, // not supported
    keyboardInput: false // not supported
  };

  private readonly defaultOptions: PikadayOptions = {
    ariaLabel: undefined,
    format: 'YYYY-MM-DD', // TODO
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

  constructor(private ngZone: NgZone) {
    super();
  }

  ngOnInit(): void {
    this.registerGlobalListeners();
  }

  ngAfterViewInit(): void {
    this.updateOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes[0] && !changes[0].firstChange) {
      this.updateOptions();
    }
  }

  ngOnDestroy(): void {
    this.unregisterGlobalListeners();
  }

  protected onInputChange(): void {
    const value = this.inputRef.nativeElement.value;

    // this.inputChange$.emit(value);
    // this.filterValue$.next(value);

    this.isFieldFilled = value.length > 0;
  }

  protected onFocusChange(isFocused: boolean): void {
    this.focusChangeSubject$.next(isFocused);
    this.isFieldFocused = isFocused;

    if (!isFocused) {
      this.onTouched(); // on blur, notify ControlValueAccessor that the field was touched
    }
  }

  //#region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: unknown) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.selectedDate = value;

    this.isFieldFilled = !!value;

    // write to wrapped input
    this.inputRef.nativeElement.value = value;
  }

  registerOnChange(fn: never): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: never): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  //#endregion

  //#region IFormzField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  get fieldId(): string {
    return this.id;
  }

  get value(): string {
    return this.selectedDate ?? '';
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.dateRef as ElementRef<HTMLElement>;
  }

  //#endregion

  //#region IFormzDateField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() required = false;

  public selectDate(date: string): void {
    this.selectedDate = date;

    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.valueChangeSubject$.next(this.selectedDate);
    this.isFieldFilled = this.selectDate.length > 0;
    this.onChange(this.selectDate); // notify ControlValueAccessor of the change
    this.onTouched();
    this.togglePanel(false);
  }

  //#endregion

  //#region IFormzPikadayOptions

  @Input() ariaLabel?: string;
  @Input() format?: string;
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
      format: this.format ?? this.defaultOptions.format,
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
      // onSelect: (date: Date) => this.onSelect(this.picker, date),
      // onOpen: () => this.onOpen(),
      // onClose: () => this.onClose(),
      // onDraw: () => this.onDraw(),
    };

    if (!this.picker) {
      this.picker = new Pikaday(updatedOptions);
    } else {
      this.picker.config(updatedOptions);
    }
  }

  //#endregion

  togglePanel(isOpen: boolean): void {
    this.isOpen = isOpen;

    if (isOpen) {
      // TODO highlight selected date?
      // this.highlightSelectedOption();
      this.scrollIntoView();
    } else {
      // this.setHighlightedIndex(-1); // reset highlighted index when closing
    }

    this.cdRef.markForCheck();
  }

  private registerGlobalListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const onClick = (event: MouseEvent) => this.handleExternalClick(event);
      const onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);

      document.addEventListener('click', onClick);
      document.addEventListener('keydown', onKeyDown);

      this.globalClickUnlisten = () => document.removeEventListener('click', onClick);
      this.globalKeydownUnlisten = () => document.removeEventListener('keydown', onKeyDown);
    });
  }

  private unregisterGlobalListeners(): void {
    this.globalClickUnlisten?.();
    this.globalKeydownUnlisten?.();
  }

  private handleExternalClick(event: MouseEvent): void {
    if (!this.isOpen) return;

    const clickedInside = this.dateRef.nativeElement.contains(event.target as Node);

    if (!clickedInside) {
      this.ngZone.run(() => this.togglePanel(false));
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isFieldFocused) return;
    if (this.disabled) return;
    if (!['Escape', 'ArrowDown', 'Tab'].includes(event.key)) return;

    // TODO support selection of date within picker

    this.ngZone.run(() => {
      switch (event.key) {
        case 'Escape':
        case 'Tab':
          if (this.isOpen) this.togglePanel(false);
          break;
        case 'ArrowDown':
          if (!this.isOpen) {
            this.togglePanel(true);
          }
          event.preventDefault();
          break;
      }
    });
  }

  private scrollIntoView(): void {
    setTimeout(() => {
      const field = this.dateRef?.nativeElement;
      const panel = this.panelRef?.nativeElement;

      if (!field || !panel) return;

      const fieldRect = field.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      const fieldBottomEdge = fieldRect.bottom;
      const fieldTopEdge = fieldRect.top;

      const panelBottomEdge = panelRect.bottom;
      const panelTopEdge = panelRect.top;

      const viewportHeight = window.innerHeight;

      const isFieldOutOfView = fieldBottomEdge > viewportHeight || fieldTopEdge < 0;
      const isPanelOutOfView = panelBottomEdge > viewportHeight || panelTopEdge < 0;

      if (isFieldOutOfView) {
        field.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }

      if (isPanelOutOfView) {
        panel.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    });
  }

  //#region Pikaday

  // private onSelect(pikaday: Pikaday, date: Date): void {
  //   this.selectDate(pikaday.toString(date.toString()));
  // }

  // private onOpen(): void {
  //   //
  // }

  // private onClose(): void {
  //   //
  // }

  // private onDraw(): void {
  //   //
  // }

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
}
