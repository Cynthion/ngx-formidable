import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
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
  IFormzCheckboxGroupField,
  IFormzFieldOption
} from '../../form-model';

@Component({
  selector: 'formz-checkbox-group-field',
  templateUrl: './checkbox-group-field.component.html',
  styleUrls: ['./checkbox-group-field.component.scss'],
  providers: [
    // required to use FormzFieldBase  during injection as a base class for this component
    { provide: FormzFieldBase, useExisting: forwardRef(() => CheckboxGroupFieldComponent) },
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxGroupFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzOptionField
    {
      provide: FORMZ_OPTION_FIELD,
      useExisting: CheckboxGroupFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckboxGroupFieldComponent
  extends FormzFieldBase<string[]>
  implements OnInit, AfterContentInit, OnDestroy, ControlValueAccessor, IFormzCheckboxGroupField
{
  @ViewChild('checkboxGroupRef', { static: true }) checkboxGroupRef!: ElementRef<HTMLDivElement>;

  protected optionsState?: IFormzFieldOption[];
  protected highlightedIndex = -1;

  private id = uuid();
  private isFieldFocused = false;

  private valueChangeSubject$ = new Subject<string[]>();
  private focusChangeSubject$ = new Subject<boolean>();

  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  private globalKeydownUnlisten?: () => void;

  constructor(private ngZone: NgZone) {
    super();
  }

  ngOnInit(): void {
    this.registerGlobalListeners();
  }

  ngAfterContentInit(): void {
    this.updateOptions();
  }

  ngOnDestroy(): void {
    this.unregisterGlobalListeners();
  }

  protected onFocusChange(isFocused: boolean): void {
    this.focusChangeSubject$.next(isFocused);
    this.isFieldFocused = isFocused;

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

  get value(): string[] {
    return this.optionsState?.filter((opt) => opt.selected).map((opt) => opt.value) || [];
  }

  readonly isLabelFloating = false;

  get elementRef(): ElementRef<HTMLElement> {
    return this.checkboxGroupRef as ElementRef<HTMLElement>;
  }

  //#endregion

  //#region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: unknown) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string[]): void {
    const values: string[] = Array.isArray(value) ? value : [];

    const allOptions = this.combineAllOptions();

    this.optionsState = allOptions.map((opt) => ({
      ...opt,
      checked: values.includes(opt.value)
    }));
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

  //#region IFormzCheckboxGroupField

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

  public selectOption(option: IFormzFieldOption): void {
    if (option.disabled) return;

    const newOption: IFormzFieldOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled,
      selected: !option.selected // toggle the selected state
    };

    this.optionsState =
      this.optionsState?.map((opt) => (opt.value === option.value ? { ...opt, ...newOption } : opt)) || [];

    const newValue = this.optionsState.map((opt) => opt.value);

    this.valueChangeSubject$.next(newValue);
    this.onChange(newValue); // notify ControlValueAccessor of the change
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

  protected isChecked(value: string): boolean {
    return this.optionsState?.some((opt) => opt.value === value && opt.selected) || false;
  }

  //#endregion

  private registerGlobalListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);

      document.addEventListener('keydown', onKeyDown);

      this.globalKeydownUnlisten = () => document.removeEventListener('keydown', onKeyDown);
    });
  }

  private unregisterGlobalListeners(): void {
    this.globalKeydownUnlisten?.();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isFieldFocused) return;
    if (this.disabled) return;
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;

    const options = this.combineAllOptions();
    const count = options.length;

    this.ngZone.run(() => {
      switch (event.key) {
        case 'ArrowDown':
          if (count > 0) {
            this.setHighlightedIndex((this.highlightedIndex + 1) % count);
          }
          event.preventDefault();
          break;
        case 'ArrowUp':
          if (count > 0) {
            this.setHighlightedIndex((this.highlightedIndex - 1 + count) % count);
          }
          event.preventDefault();
          break;
        case 'Enter':
          if (options[this.highlightedIndex]) {
            const option = options[this.highlightedIndex]!;
            this.selectOption(option);
            event.preventDefault();
          }
          break;
      }
    });
  }

  private setHighlightedIndex(index: number): void {
    this.highlightedIndex = index;

    this.cdRef.markForCheck();
  }
}
