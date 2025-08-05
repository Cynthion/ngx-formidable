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
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import {
  EMPTY_FIELD_OPTION,
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_FIELD_OPTION,
  FORMIDABLE_OPTION_FIELD,
  IFormidableFieldOption,
  IFormidableSelectField
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.component';

@Component({
  selector: 'formidable-select-field',
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: SelectFieldComponent
    },
    // required to provide this component as IFormidableOptionField
    {
      provide: FORMIDABLE_OPTION_FIELD,
      useExisting: SelectFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectFieldComponent extends BaseFieldDirective implements IFormidableSelectField, AfterContentInit {
  @ViewChild('selectRef', { static: true }) selectRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  ngAfterContentInit(): void {
    this.updateOptions();
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    const found = this.options$.value.find((opt) => opt.value === value);

    // write to wrapped element
    this.selectRef.nativeElement.value = found ? found.value : '';
  }

  //#endregion

  //#region IFormidableSelectField

  @Input() name = '';
  @Input() required = false;

  //#endregion

  //#region IFormidableField

  get value(): string | null {
    return this.selectRef.nativeElement.value || null;
  }

  readonly isLabelFloating = false;

  get fieldRef(): ElementRef<HTMLElement> {
    return this.selectRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  //#region IFormidableOptionField

  @Input() options?: IFormidableFieldOption[] = [];
  @Input() emptyOption: IFormidableFieldOption = EMPTY_FIELD_OPTION;
  @Input() sortFn?: (a: IFormidableFieldOption, b: IFormidableFieldOption) => number;

  @ContentChildren(FORMIDABLE_FIELD_OPTION)
  optionComponents?: QueryList<IFormidableFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormidableFieldOption[]>([]);

  public selectOption(_option: IFormidableFieldOption): void {
    // Not used in select field, but required by IFormidableOptionField interface.
    // An <option> is selected by the user through the native <select> element.
  }

  private updateOptions(): void {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    let combined = [...inlineOptions, ...projectedOptions];

    if (this.sortFn) {
      combined = combined.sort(this.sortFn);
    }

    this.options$.next(combined);
  }

  //#endregion
}
