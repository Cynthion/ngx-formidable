import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HasValueAndFocusChange } from '../../model';

@Component({
  selector: 'cmp-ui-form-field-radio-group',
  templateUrl: './form-field-radio-group.component.html',
  styleUrls: ['./form-field-radio-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormFieldRadioGroupComponent),
      multi: true
    }
  ]
})
export class FormFieldRadioGroupComponent implements OnInit, OnDestroy, ControlValueAccessor, HasValueAndFocusChange {
  @Input({ required: true }) name!: string;

  // TODO are the needed on this level?
  @Output() focusChange = new EventEmitter<boolean>();
  @Output() valueChange = new EventEmitter<string>();

  protected selectedValue?: string;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange = (_: unknown) => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched = () => {};

  private readonly destroy$ = new Subject<void>();

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

  selectOption(value: string) {
    this.selectedValue = value;
    this.valueChangeSubject$.next(value);
    this.onChange(value);
    this.onTouched();
  }

  emitFocus(isFocused: boolean) {
    this.focusChangeSubject$.next(isFocused);
  }

  //#region ControlValueAccessor

  writeValue(value: string): void {
    this.selectedValue = value;
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
