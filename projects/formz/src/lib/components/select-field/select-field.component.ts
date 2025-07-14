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
  FORMZ_FIELD,
  FORMZ_FIELD_OPTION,
  FORMZ_OPTION_FIELD,
  IFormzFieldOption,
  IFormzSelectField
} from '../../formz.model';
import { BaseFieldDirective } from '../base-field.component';

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
export class SelectFieldComponent extends BaseFieldDirective implements IFormzSelectField, AfterContentInit {
  @ViewChild('selectRef', { static: true }) selectRef!: ElementRef<HTMLInputElement>;

  protected registerKeyboard = false;
  protected registerExternalClick = false;
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

  protected doHandleKeyDown(_event: KeyboardEvent): void {
    // No additional actions needed
  }

  protected doHandleExternalClick(): void {
    // No additional actions needed
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    const found = this.options$.value.find((opt) => opt.value === value);

    // write to wrapped element
    this.selectRef.nativeElement.value = found ? found.value : '';
  }

  //#endregion

  //#region IFormzSelectField

  @Input() name = '';
  @Input() required = false;

  //#endregion

  //#region IFormzField

  get value(): string {
    return this.selectRef.nativeElement.value;
  }

  readonly isLabelFloating = false;

  get elementRef(): ElementRef<HTMLElement> {
    return this.selectRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  //#region IFormzOptionField

  @Input() options?: IFormzFieldOption[] = [];
  @Input() emptyOption: IFormzFieldOption = EMPTY_FIELD_OPTION;

  @ContentChildren(FORMZ_FIELD_OPTION)
  optionComponents?: QueryList<IFormzFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormzFieldOption[]>([]);

  public selectOption(_option: IFormzFieldOption): void {
    // Not used in select field, but required by IFormzOptionField interface.
    // An <option> is selected by the user through the native <select> element.
  }

  private updateOptions(): void {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    this.options$.next([...inlineOptions, ...projectedOptions]);
  }

  //#endregion
}
