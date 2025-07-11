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
  IFormzRadioGroupField
} from '../../form-model';

@Component({
  selector: 'formz-radio-group-field',
  templateUrl: './radio-group-field.component.html',
  styleUrls: ['./radio-group-field.component.scss'],
  providers: [
    // required to use FormzFieldBase  during injection as a base class for this component
    { provide: FormzFieldBase, useExisting: forwardRef(() => RadioGroupFieldComponent) },
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzOptionField
    {
      provide: FORMZ_OPTION_FIELD,
      useExisting: RadioGroupFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RadioGroupFieldComponent
  extends FormzFieldBase
  implements AfterContentInit, ControlValueAccessor, IFormzRadioGroupField
{
  @ViewChild('radioGroupRef', { static: true }) radioGroupRef!: ElementRef<HTMLDivElement>;

  protected selectedOption?: IFormzFieldOption;

  private id = uuid();

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  // private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  ngAfterContentInit(): void {
    this.updateOptions();
  }

  protected onOptionChangeChange(option: IFormzFieldOption): void {
    console.log('onOptionChangeChange', option);
    this.onChangeChange();
  }

  protected onOptionFocusChange(option: IFormzFieldOption, isFocused: boolean): void {
    console.log('onOptionFocusChange', option, isFocused);
    this.onFocusChange(isFocused);
  }

  private onChangeChange(): void {
    const value = this.value;
    this.valueChangeSubject$.next(value);
    this.onChange(value); // notify ControlValueAccessor of the change
  }

  private onFocusChange(isFocused: boolean): void {
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
    return this.selectedOption?.value || '';
  }

  readonly isLabelFloating = false;

  get elementRef(): ElementRef<HTMLElement> {
    return this.radioGroupRef as ElementRef<HTMLElement>;
  }

  //#endregion

  //#region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: unknown) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    const label = this.combineAllOptions().find((opt) => opt.value === value)?.label ?? '';

    this.selectedOption = {
      ...this.selectedOption,
      value,
      label
    };
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

  //#region IFormzRadioGroupField

  @Input() name = '';
  @Input() disabled = false;
  @Input() readOnly = false;
  @Input() required = false;

  //#endregion

  //#region IFormzOptionField

  @Input() options?: IFormzFieldOption[] = [];
  @Input() emptyOption: IFormzFieldOption = { value: 'empty', label: 'No options available.' };

  @ContentChildren(FORMZ_FIELD_OPTION)
  optionComponents?: QueryList<IFormzFieldOption>;

  protected readonly inlineOptions$ = new BehaviorSubject<IFormzFieldOption[]>([]);
  protected readonly projectedOptions$ = new BehaviorSubject<IFormzFieldOption[]>([]);

  public selectOption(option: IFormzFieldOption): void {
    if (option.disabled) return;

    const newOption: IFormzFieldOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    this.selectedOption = newOption;

    this.valueChangeSubject$.next(this.selectedOption.value);
    this.onChange(this.selectedOption.value); // notify ControlValueAccessor of the change
    this.onTouched();
  }

  private combineAllOptions(): IFormzFieldOption[] {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    return [...inlineOptions, ...projectedOptions];
  }

  private updateOptions(): void {
    // The projected options (option.template) might not be available immediately after content initialization,
    // so we use setTimeout to ensure they are processed after the current change detection cycle.
    setTimeout(() => {
      const inlineOptions = this.options ?? [];
      const projectedOptions = this.optionComponents?.toArray() ?? [];

      this.inlineOptions$.next(inlineOptions);
      this.projectedOptions$.next(projectedOptions);
    });
  }

  //#endregion
}
