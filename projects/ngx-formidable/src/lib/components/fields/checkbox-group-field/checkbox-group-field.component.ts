import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { scrollHighlightedOptionIntoView } from '../../../helpers/position.helpers';
import {
  EMPTY_FIELD_OPTION,
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_FIELD_OPTION,
  FORMIDABLE_OPTION_FIELD,
  IFormidableCheckboxGroupField,
  IFormidableFieldOption
} from '../../../models/formidable.model';
import { FieldOptionComponent } from '../../field-option/field-option.component';
import { BaseFieldDirective } from '../base-field.component';

@Component({
  selector: 'formidable-checkbox-group-field',
  templateUrl: './checkbox-group-field.component.html',
  styleUrls: ['./checkbox-group-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxGroupFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: CheckboxGroupFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: CheckboxGroupFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckboxGroupFieldComponent
  extends BaseFieldDirective<string[]>
  implements IFormidableCheckboxGroupField, OnInit, AfterContentInit, OnDestroy
{
  @ViewChild('checkboxGroupRef', { static: true }) checkboxGroupRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('optionRef') optionRefs?: QueryList<FieldOptionComponent>;

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys = ['ArrowDown', 'ArrowUp', 'Enter'];

  private _value: string[] = [];

  ngAfterContentInit(): void {
    this.updateOptions();
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  private handleKeydown(event: KeyboardEvent): void {
    const options = this.options$.value;
    const count = options.length;

    switch (event.key) {
      case 'ArrowDown':
        if (count > 0) {
          this.setHighlightedIndex((this.highlightedOptionIndex$.value + 1) % count);
        }
        break;
      case 'ArrowUp':
        if (count > 0) {
          this.setHighlightedIndex((this.highlightedOptionIndex$.value - 1 + count) % count);
        }
        break;
      case 'Enter':
        if (this.optionsState?.[this.highlightedOptionIndex$.value]) {
          const option = this.optionsState[this.highlightedOptionIndex$.value]!;
          this.selectOption(option);
        }
        break;
    }
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string[]): void {
    // TODO use this.selectedOption to set the value?
    this._value = value;
    const values: string[] = Array.isArray(value) ? value : [];

    this.optionsState = this.options$.value.map((opt) => ({
      ...opt,
      selected: values.includes(opt.value)
    }));
  }

  //#endregion

  //#region IFormidableCheckboxGroupField

  @Input() name = '';
  @Input() required = false;

  //#endregion

  //#region IFormidableField

  get value(): string[] {
    return this.optionsState?.filter((opt) => opt.selected).map((opt) => opt.value) || [];
  }

  readonly isLabelFloating = false;

  get fieldRef(): ElementRef<HTMLElement> {
    return this.checkboxGroupRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'group';

  //#endregion

  //#region IFormidableOptionField

  @Input() options?: IFormidableFieldOption[] = [];
  @Input() emptyOption: IFormidableFieldOption = EMPTY_FIELD_OPTION;
  @Input() sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number;

  @ContentChildren(FORMIDABLE_FIELD_OPTION)
  optionComponents?: QueryList<IFormidableFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormidableFieldOption[]>([]);
  protected readonly highlightedOptionIndex$ = new BehaviorSubject<number>(-1);

  private optionsState?: IFormidableFieldOption[] = undefined;

  public selectOption(option: IFormidableFieldOption): void {
    if (option.disabled) return;

    const newOption: IFormidableFieldOption = {
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

      let combined = [...inlineOptions, ...projectedOptions];

      if (this.sortFn) {
        combined = combined.sort(this.sortFn);
      }

      this.options$.next(combined);

      this.writeValue(this._value);
    });
  }

  protected isChecked(value: string): boolean {
    return this.value?.includes(value);
  }

  //#endregion

  private setHighlightedIndex(index: number): void {
    this.highlightedOptionIndex$.next(index);

    setTimeout(() => scrollHighlightedOptionIntoView(index, this.optionRefs));
  }
}
