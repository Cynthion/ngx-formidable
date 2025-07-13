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
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import {
  EMPTY_FIELD_OPTION,
  FieldDecoratorLayout,
  FORMZ_FIELD,
  FORMZ_FIELD_OPTION,
  FORMZ_OPTION_FIELD,
  IFormzCheckboxGroupField,
  IFormzFieldOption
} from '../../form-model';
import { BaseFieldDirective } from '../base-field.component';

@Component({
  selector: 'formz-checkbox-group-field',
  templateUrl: './checkbox-group-field.component.html',
  styleUrls: ['./checkbox-group-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxGroupFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzField
    {
      provide: FORMZ_FIELD,
      useExisting: CheckboxGroupFieldComponent
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
  extends BaseFieldDirective<string[]>
  implements IFormzCheckboxGroupField, OnInit, AfterContentInit, OnDestroy
{
  @ViewChild('checkboxGroupRef', { static: true }) checkboxGroupRef!: ElementRef<HTMLDivElement>;

  protected registerKeyboard = true;
  protected registerExternalClick = false;
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter'];

  protected highlightedIndex = -1;

  private _value: string[] = [];

  private readonly cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  ngAfterContentInit(): void {
    this.updateOptions();
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  protected doHandleKeyDown(event: KeyboardEvent): void {
    const options = this.options$.value;
    const count = options.length;

    switch (event.key) {
      case 'ArrowDown':
        if (count > 0) {
          this.setHighlightedIndex((this.highlightedIndex + 1) % count);
        }
        break;
      case 'ArrowUp':
        if (count > 0) {
          this.setHighlightedIndex((this.highlightedIndex - 1 + count) % count);
        }
        break;
      case 'Enter':
        if (this.optionsState?.[this.highlightedIndex]) {
          const option = this.optionsState[this.highlightedIndex]!;
          this.selectOption(option);
        }
        break;
    }
  }

  protected doHandleExternalClick(): void {
    // No additional actions needed
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string[]): void {
    this._value = value;
    const values: string[] = Array.isArray(value) ? value : [];

    this.optionsState = this.options$.value.map((opt) => ({
      ...opt,
      selected: values.includes(opt.value)
    }));
  }

  //#endregion

  //#region IFormzCheckboxGroupField

  @Input() name = '';
  @Input() required = false;

  //#endregion

  //#region IFormzField

  get value(): string[] {
    return this.optionsState?.filter((opt) => opt.selected).map((opt) => opt.value) || [];
  }

  readonly isLabelFloating = false;

  get elementRef(): ElementRef<HTMLElement> {
    return this.checkboxGroupRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'group';

  //#endregion

  //#region IFormzOptionField

  @Input() options?: IFormzFieldOption[] = [];
  @Input() emptyOption: IFormzFieldOption = EMPTY_FIELD_OPTION;

  @ContentChildren(FORMZ_FIELD_OPTION)
  optionComponents?: QueryList<IFormzFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormzFieldOption[]>([]);

  private optionsState?: IFormzFieldOption[];

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

    const newValue = this.value;

    this.valueChangeSubject$.next(newValue);
    this.valueChanged.emit(newValue);
    this.onChange(newValue); // notify ControlValueAccessor of the change
    this.onTouched();
  }

  private updateOptions(): void {
    // The projected options (option.template) might not be available immediately after content initialization,
    // so we use setTimeout to ensure they are processed after the current change detection cycle.
    setTimeout(() => {
      const inlineOptions = this.options ?? [];
      const projectedOptions = this.optionComponents?.toArray() ?? [];

      this.options$.next([...inlineOptions, ...projectedOptions]);

      this.writeValue(this._value);
    });
  }

  protected isChecked(value: string): boolean {
    return this.value.includes(value);
  }

  //#endregion

  private setHighlightedIndex(index: number): void {
    this.highlightedIndex = index;

    this.cdRef.markForCheck();
  }
}
