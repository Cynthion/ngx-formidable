import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FormzFieldBase, IFormzDropdownField, IFormzFieldOption } from '../../form-model';

@Component({
  selector: 'formz-dropdown-field',
  templateUrl: './dropdown-field.component.html',
  styleUrls: ['./dropdown-field.component.scss'],
  providers: [
    // required to use FormzFieldBase  during injection as a base class for this component
    { provide: FormzFieldBase, useExisting: forwardRef(() => DropdownFieldComponent) },
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownFieldComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownFieldComponent
  extends FormzFieldBase
  implements OnInit, OnDestroy, ControlValueAccessor, IFormzDropdownField
{
  @ViewChild('dropdownRef') dropdownRef!: ElementRef<HTMLDivElement>;

  @Input() enableBackdrop = false;

  protected selectedValue?: string;
  protected selectedLabel?: string;
  protected isOpen = false;

  private id = uuid();
  private isFieldFocused = false;
  private isFieldFilled = false;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();

  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  private globalClickUnlisten?: () => void;
  private globalKeydownUnlisten?: () => void;

  constructor(private ngZone: NgZone) {
    super();
  }

  ngOnInit(): void {
    this.registerGlobalListeners();
  }

  ngOnDestroy(): void {
    this.unregisterGlobalListeners();
  }

  public selectOption(value: string, label: string): void {
    this.selectedValue = value;
    this.selectedLabel = label;
    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.valueChangeSubject$.next(value);
    this.isFieldFilled = value.length > 0;
    this.onChange(value); // notify ControlValueAccessor of the change
    this.onTouched();
    this.toggleDropdownPanel(false); // close the dropdown panel after selection
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

  get value(): string {
    return this.selectedValue ?? '';
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.dropdownRef as ElementRef<HTMLElement>;
  }

  //#endregion

  //#region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: unknown) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.selectedValue = value;
    this.selectedLabel = this.options?.find((opt) => opt.value === value)?.label ?? '';
    this.isFieldFilled = !!value;
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

  //#region IFormzDropdownField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() options?: IFormzFieldOption[] = [];

  // @ContentChildren(forwardRef(() => FieldOptionComponent))
  // optionComponents?: QueryList<FieldOptionComponent>;

  //#endregion

  toggleDropdownPanel(isOpen: boolean): void {
    this.isOpen = isOpen;
    this.focusChangeSubject$.next(isOpen);
    this.isFieldFocused = isOpen;

    this.cdRef.markForCheck();
  }

  private registerGlobalListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const onClick = (event: MouseEvent) => {
        if (this.isOpen && this.dropdownRef && !this.dropdownRef.nativeElement.contains(event.target as Node)) {
          this.ngZone.run(() => this.toggleDropdownPanel(false));
        }
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (this.isOpen && event.key === 'Escape') {
          this.ngZone.run(() => this.toggleDropdownPanel(false));
        }
      };

      document.addEventListener('click', onClick);
      document.addEventListener('keydown', onKeyDown);

      this.globalClickUnlisten = () => document.removeEventListener('click', onClick);
      this.globalKeydownUnlisten = () => document.removeEventListener('keydown', onKeyDown);
    });
  }

  private unregisterGlobalListeners(): void {
    this.globalClickUnlisten?.();
    this.globalKeydownUnlisten?.();
  }
}
