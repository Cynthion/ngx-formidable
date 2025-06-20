import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { FormFieldDropdownOptionComponent } from '../form-field-dropdown-option/form-field-dropdown-option.component';
import { HasValueAndFocusChange } from '../../model';

@Component({
  selector: 'formz-form-field-dropdown',
  templateUrl: './form-field-dropdown.component.html',
  styleUrls: ['./form-field-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormFieldDropdownComponent),
      multi: true
    }
  ]
})
export class FormFieldDropdownComponent implements OnInit, OnDestroy, ControlValueAccessor, HasValueAndFocusChange {
  @Input() placeholder?: string;

  // TODO move this, onInit, onDestroy and HasValueAndFocusChange to a base class?
  @Output() focusChange = new EventEmitter<boolean>();
  @Output() valueChange = new EventEmitter<string>();

  @ContentChildren(forwardRef(() => FormFieldDropdownOptionComponent))
  options!: QueryList<FormFieldDropdownOptionComponent>;

  protected selectedValue?: string;
  protected selectedLabel?: string;
  protected isOpen = false;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange = (_: unknown) => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched = () => {};

  private readonly destroy$ = new Subject<void>();

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.valueChange$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      this.valueChange.emit(value);
    });
    this.focusChange$.pipe(takeUntil(this.destroy$)).subscribe((isFocused) => {
      this.focusChange.emit(isFocused);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectOption(value: string, label: string) {
    this.selectedValue = value;
    this.selectedLabel = label;
    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.valueChangeSubject$.next(value);
    this.onChange(value);
    this.onTouched();
    this.closeDropdown();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    this.focusChange.emit(this.isOpen);
    this.cdRef.markForCheck();
  }

  closeDropdown() {
    this.isOpen = false;
    this.focusChange.emit(false);
    this.cdRef.markForCheck();
  }

  //#region ControlValueAccessor

  writeValue(value: string): void {
    this.selectedValue = value;
    const selectedOption = this.options?.find((opt) => opt.value === value);
    this.selectedLabel = selectedOption?.label ?? '';
  }

  registerOnChange(fn: never): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: never): void {
    this.onTouched = fn;
  }

  setDisabledState?(_isDisabled: boolean): void {
    // optionally implement
  }

  //#endregion

  //#region HasValueAndFocusChange

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  get value() {
    return this.selectedValue ?? '';
  }

  //#endregion
}
