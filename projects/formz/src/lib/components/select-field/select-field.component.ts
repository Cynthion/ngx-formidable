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
  FORMZ_FIELD_OPTION,
  FORMZ_OPTION_FIELD,
  FormzFieldBase,
  IFormzFieldOption,
  IFormzSelectField
} from '../../form-model';

@Component({
  selector: 'formz-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
  providers: [
    // required to use FormzFieldBase  during injection as a base class for this component
    { provide: FormzFieldBase, useExisting: forwardRef(() => SelectFieldComponent) },
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzOptionField
    {
      provide: FORMZ_OPTION_FIELD,
      useExisting: SelectFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectFieldComponent
  extends FormzFieldBase
  implements AfterContentInit, ControlValueAccessor, IFormzSelectField
{
  @ViewChild('selectRef', { static: true }) selectRef!: ElementRef<HTMLInputElement>;

  protected selectedOption?: IFormzFieldOption;

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

  //#region IFormzField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  get fieldId(): string {
    return this.id;
  }

  get value(): string {
    return this.selectRef?.nativeElement.value || '';
  }

  readonly isLabelFloating = false;

  get elementRef(): ElementRef<HTMLElement> {
    return this.selectRef as ElementRef<HTMLElement>;
  }

  //#endregion

  //#region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: unknown) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.selectRef.nativeElement.value = value ?? '';
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

  //#region IFormzOptionField

  @Input() options?: IFormzFieldOption[] = [];
  @Input() emptyOption: IFormzFieldOption = { value: 'empty', label: 'No options available.' };

  @ContentChildren(FORMZ_FIELD_OPTION)
  optionComponents?: QueryList<IFormzFieldOption>;

  protected readonly inlineOptions$ = new BehaviorSubject<IFormzFieldOption[]>([]);
  protected readonly projectedOptions$ = new BehaviorSubject<IFormzFieldOption[]>([]);

  public selectOption(_option: IFormzFieldOption): void {
    // not used in select field, but required by IFormzOptionField interface
    // <option> is selected by the user through the native <select> element
  }

  private updateOptions(): void {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    this.inlineOptions$.next(inlineOptions);
    this.projectedOptions$.next(projectedOptions);
  }

  //#endregion
}
