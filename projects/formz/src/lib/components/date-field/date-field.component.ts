import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR, NgControl, NgModel } from '@angular/forms';
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

  protected registerKeyboard = true;
  protected registerExternalClick = true;
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

  private readonly injector: Injector = inject(Injector);

  control!: FormControl; // initialized in ngOnInit

  override ngOnInit(): void {
    super.ngOnInit();

    const ngControl = this.injector.get(NgControl, null, { self: true, optional: true });

    this.control = this.getFormControlFromNgControlDirective(ngControl);
    this.control.setErrors({ errors: ['Wrong date format.'] }); // TODO remove, just for testing
  }

  private getFormControlFromNgControlDirective(ngControl: NgControl | null): FormControl {
    // ngModel directive (for Template-Driven Forms)
    if (ngControl instanceof NgModel) {
      return ngControl.control;
    }

    // no directive set
    return new FormControl();
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
    const value = this.inputRef.nativeElement.value; // TODO use this.value instead?

    // this.inputChange$.emit(value);
    // this.filterValue$.next(value);

    this.validateDate(value); // TODO add validator outside?
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  protected doHandleKeyDown(event: KeyboardEvent): void {
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

  protected doHandleExternalClick(): void {
    if (!this.isPanelOpen) return;

    this.togglePanel(false);
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    this.selectedDate = value;

    this.isFieldFilled = !!value;

    // write to wrapped input
    this.inputRef.nativeElement.value = value;
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
  @Input() maskFormat = 'DD.MM.YYYY';

  protected ngxMask = '0000-00-00';

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

  private updateMask(): void {
    // TODO add/control supported mask formats
    switch (this.maskFormat) {
      case 'DD.MM.YYYY':
        this.ngxMask = '00.00.0000';
        break;
      case 'MM/DD/YYYY':
        this.ngxMask = '00/00/0000';
        break;
      case 'DD/MM/YY':
        this.ngxMask = '00/00/00';
        break;
      case 'YYYY-MM-DD':
      default:
        this.ngxMask = '0000-00-00';
        break;
    }
  }

  private checkValidDate(value: string): boolean {
    if (!value) return false;

    return false; // TODO input function, based on format
  }

  private validateDate(value: string): void {
    const isValid = this.checkValidDate(value);

    console.log('Date validation result:', isValid);

    // TODO validate
    // const control = this.ngControl.control;
    // if (control) {
    //   if (isValid) {
    //     control.setErrors({ invalidDate: true });
    //   } else {
    //     control.setErrors(null);
    //   }
    // }
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

  //#region IFormzPanelField

  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  @Input()
  get isPanelOpen(): boolean {
    return this._isPanelOpen;
  }
  set isPanelOpen(val: boolean) {
    this.togglePanel(val);
  }

  @Input() panelPosition: FormzPanelPosition = 'full';

  private _isPanelOpen = false;

  protected togglePanel(isOpen: boolean): void {
    this._isPanelOpen = isOpen;

    // additional field specific behavior
    if (isOpen) {
      // this.highlightSelectedOption();
      setTimeout(() => {
        updatePanelPosition(this.dateRef, this.panelRef);
        scrollIntoView(this.dateRef, this.panelRef);
      });
      // this.cdRef.markForCheck();
    } else {
      // this.setHighlightedIndex(-1);
    }
  }

  //#endregion

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
