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
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Pikaday, { PikadayOptions } from 'pikaday';
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
  implements OnInit, AfterViewInit, OnDestroy, ControlValueAccessor, IFormzDateField
{
  @ViewChild('dateRef', { static: true }) dateRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

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

  private pikadayOptions: PikadayOptions = {
    format: 'YYYY-MM-DD' // or any other format you prefer
    // bound: false,
    // ariaLabel: '',
    // position: 'bottom right',
    // reposition: true,
    // container: undefined,
    // defaultDate: undefined,
    // setDefaultDate: false,
    // firstDay: 1, // Monday
    // minDate: undefined,
    // maxDate: undefined,
    // disableWeekends: false,
    // disableDayFn: undefined,
    // yearRange: 10,
    // showWeekNumber: false,
    // pickWholeWeek: false,
    // isRTL: false,
    // i18n: undefined,
    // yearSuffix: '',
    // showMonthAfterYear: false,
    // showDaysInNextAndPreviousMonths: true,
    // enableSelectionDaysInNextAndPreviousMonths: true,
    // numberOfMonths: 1,
    // mainCalendar: 'left',
    // events: undefined,
    // theme: undefined,
    // blurFieldOnSelect: false, // TODO use?
    // formatStrict: false,
    // toString: undefined,
    // parse: undefined,
    // keyboardInput: true
  };

  private picker = new Pikaday(this.pikadayOptions);

  constructor(private ngZone: NgZone) {
    super();
  }

  ngOnInit(): void {
    this.registerGlobalListeners();
  }

  ngAfterViewInit(): void {
    // Initialize Pikaday after the view is initialized
    this.picker = new Pikaday({
      ...this.pikadayOptions,
      field: this.inputRef.nativeElement,
      trigger: this.inputRef.nativeElement,
      onSelect: (date: Date) => this.onSelect(this.picker, date),
      onOpen: () => this.onOpen(),
      onClose: () => this.onClose(),
      onDraw: () => this.onDraw()
    });
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

  private onSelect(pikaday: Pikaday, date: Date): void {
    this.selectDate(pikaday.toString(date.toString()));
  }

  private onOpen(): void {
    //
  }

  private onClose(): void {
    //
  }

  private onDraw(): void {
    //
  }

  //#endregion
}
