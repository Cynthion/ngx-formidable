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
  FormzPanelPosition,
  IFormzDropdownField,
  IFormzFieldOption
} from '../../formz.model';
import { PanelBehavior } from '../../panel.behavior';
import { BaseFieldDirective } from '../base-field.component';

@Component({
  selector: 'formz-dropdown-field',
  templateUrl: './dropdown-field.component.html',
  styleUrls: ['./dropdown-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzField
    {
      provide: FORMZ_FIELD,
      useExisting: DropdownFieldComponent
    },
    // required to provide this component as IFormzOptionField
    {
      provide: FORMZ_OPTION_FIELD,
      useExisting: DropdownFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownFieldComponent extends BaseFieldDirective implements IFormzDropdownField, AfterContentInit {
  @ViewChild('dropdownRef', { static: true }) dropdownRef!: ElementRef<HTMLDivElement>;

  protected registerKeyboard = true;
  protected registerExternalClick = true;
  protected registeredKeys = ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter'];

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
      case 'Escape':
      case 'Tab':
        if (this.isPanelOpen) this.togglePanel(false);
        break;
      case 'ArrowDown':
        if (!this.isPanelOpen) {
          this.togglePanel(true);
        } else if (count > 0) {
          this.setHighlightedIndex((this.highlightedOptionIndex$.value + 1) % count);
        }
        break;
      case 'ArrowUp':
        if (this.isPanelOpen && count > 0) {
          this.setHighlightedIndex((this.highlightedOptionIndex$.value - 1 + count) % count);
        }
        break;
      case 'Enter':
        if (this.isPanelOpen && options[this.highlightedOptionIndex$.value]) {
          const option = options[this.highlightedOptionIndex$.value]!;
          this.selectOption(option);
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
    const found = this.options$.value.find((opt) => opt.value === value);

    this.selectedOption = found ? { ...found } : undefined;
    this.isFieldFilled = found ? !!value : false;
  }

  //#endregion

  //#region IFormzDropdownField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() required = false;

  //#endregion

  //#region IFormzField

  get value(): string {
    return this.selectedOption?.value || '';
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.dropdownRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  //#region IFormzOptionField

  @Input() options?: IFormzFieldOption[] = [];
  @Input() emptyOption: IFormzFieldOption = EMPTY_FIELD_OPTION;

  @ContentChildren(FORMZ_FIELD_OPTION)
  optionComponents?: QueryList<IFormzFieldOption>;

  protected readonly options$ = new BehaviorSubject<IFormzFieldOption[]>([]);
  protected readonly highlightedOptionIndex$ = new BehaviorSubject<number>(-1);

  protected selectedOption?: IFormzFieldOption; // TODO make private, use wrapped input

  public selectOption(option: IFormzFieldOption): void {
    if (option.disabled) return;

    const newOption: IFormzFieldOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    this.selectedOption = newOption;

    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.focusChanged.emit(false);
    this.valueChangeSubject$.next(this.selectedOption.value);
    this.valueChanged.emit(this.selectedOption.value);
    this.isFieldFilled = this.selectedOption.value.length > 0;
    this.onChange(this.selectedOption.value); // notify ControlValueAccessor of the change
    this.onTouched();
    this.togglePanel(false);
  }

  private updateOptions(): void {
    // The projected options (option.template) might not be available immediately after content initialization,
    // but the options are wrapped in a panel which on open renders the options.
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    this.options$.next([...inlineOptions, ...projectedOptions]);
  }

  //#endregion

  //#region IFormzPanelField

  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  @Input()
  get isPanelOpen(): boolean {
    return this.panelBehavior.isPanelOpen;
  }
  set isPanelOpen(val: boolean) {
    this.panelBehavior.togglePanel(val);
  }

  @Input()
  get panelPosition(): FormzPanelPosition {
    return this.panelBehavior.panelPosition;
  }
  set panelPosition(val: FormzPanelPosition) {
    this.panelBehavior.panelPosition = val;
  }

  private panelBehavior = new PanelBehavior(this.dropdownRef, this.panelRef);

  protected togglePanel(isOpen: boolean): void {
    this.panelBehavior.togglePanel(isOpen);

    // additional field specific behavior
    if (isOpen) {
      this.highlightSelectedOption();
      this.cdRef.markForCheck();
    } else {
      this.setHighlightedIndex(-1);
    }
  }

  //#endregion

  private highlightSelectedOption(): void {
    const selectedIndex = this.options$.value.findIndex((opt) => opt.value === this.selectedOption?.value);

    this.setHighlightedIndex(selectedIndex);
  }

  private setHighlightedIndex(index: number): void {
    this.highlightedOptionIndex$.next(index);
  }
}
