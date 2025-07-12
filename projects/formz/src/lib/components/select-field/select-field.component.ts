import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  Input,
  QueryList,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import {
  EMPTY_FIELD_OPTION,
  FieldDecoratorLayout,
  FORMZ_FIELD,
  FORMZ_FIELD_OPTION,
  FORMZ_OPTION_FIELD,
  IFormzFieldOption,
  IFormzSelectField
} from '../../form-model';

@Component({
  selector: 'formz-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzField
    {
      provide: FORMZ_FIELD,
      useExisting: SelectFieldComponent
    },
    // required to provide this component as IFormzOptionField
    {
      provide: FORMZ_OPTION_FIELD,
      useExisting: SelectFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectFieldComponent implements AfterContentInit, ControlValueAccessor, IFormzSelectField {
  @ViewChild('selectRef', { static: true }) selectRef!: ElementRef<HTMLInputElement>;

  private id = uuid();
  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  ngAfterContentInit(): void {
    this.updateOptions();
  }

  protected onChangeChange(): void {
    const value = this.value;
    this.valueChangeSubject$.next(value);
    this.onChange(value); // notify ControlValueAccessor of the change
  }

  protected onFocusChange(isFocused: boolean): void {
    this.focusChangeSubject$.next(isFocused);

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
    const found = this.options$.value.find((opt) => opt.value === value);

    this.selectedOption = found ? { ...found } : undefined;

    // write to wrapped select element
    this.selectRef.nativeElement.value = found ? found.value : '';
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

  //#region IFormzSelectField

  @Input() name = '';
  @Input() disabled = false;
  @Input() required = false;

  //#endregion

  //#region IFormzField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  get fieldId(): string {
    return this.id;
  }

  get value(): string {
    return this.selectedOption?.value ?? '';
  }

  readonly isLabelFloating = false;

  get elementRef(): ElementRef<HTMLElement> {
    return this.selectRef as ElementRef<HTMLElement>;
  }

  decoratorLayout?: FieldDecoratorLayout = 'single';

  //#endregion

  //#region IFormzOptionField

  @Input() options?: IFormzFieldOption[] = [];
  @Input() emptyOption: IFormzFieldOption = EMPTY_FIELD_OPTION;

  @ContentChildren(FORMZ_FIELD_OPTION)
  optionComponents?: QueryList<IFormzFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormzFieldOption[]>([]);

  private selectedOption?: IFormzFieldOption;

  public selectOption(_option: IFormzFieldOption): void {
    // not used in select field, but required by IFormzOptionField interface
    // <option> is selected by the user through the native <select> element
  }

  private updateOptions(): void {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    this.options$.next([...inlineOptions, ...projectedOptions]);
  }

  //#endregion
}
