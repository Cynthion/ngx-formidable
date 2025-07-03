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
import { BehaviorSubject, debounceTime, distinctUntilChanged, filter, Subject, takeUntil } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FORMZ_OPTION_FIELD, FormzFieldBase, IFormzAutocompleteField, IFormzFieldOption } from '../../form-model';
import { FieldOptionComponent } from '../field-option/field-option.component';

@Component({
  selector: 'formz-autocomplete-field',
  templateUrl: './autocomplete-field.component.html',
  styleUrls: ['./autocomplete-field.component.scss'],
  providers: [
    // required to use FormzFieldBase  during injection as a base class for this component
    { provide: FormzFieldBase, useExisting: forwardRef(() => AutocompleteFieldComponent) },
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutocompleteFieldComponent),
      multi: true
    },
    // required to provide this component as IFormzOptionField
    {
      provide: FORMZ_OPTION_FIELD,
      useExisting: AutocompleteFieldComponent
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutocompleteFieldComponent
  extends FormzFieldBase
  implements OnInit, AfterContentInit, OnDestroy, ControlValueAccessor, IFormzAutocompleteField
{
  @ViewChild('autocompleteRef', { static: true }) autocompleteRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  protected selectedOption?: IFormzFieldOption;
  protected isOpen = false;
  protected highlightedIndex = -1;

  private id = uuid();
  protected isFieldFocused = false;
  private isFieldFilled = false;

  private valueChangeSubject$ = new Subject<string>();
  private focusChangeSubject$ = new Subject<boolean>();
  private destroy$ = new Subject<void>();

  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  private globalClickUnlisten?: () => void;
  private globalKeydownUnlisten?: () => void;

  constructor(private ngZone: NgZone) {
    super();
  }

  ngOnInit(): void {
    this.registerGlobalListeners();
    this.registerAutocomplete();
  }

  ngOnDestroy(): void {
    this.unregisterGlobalListeners();

    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterContentInit(): void {
    this.filteredOptions$.next(this.filteredOptions()); // TODO update after first selection
  }

  private readonly filterValue$ = new BehaviorSubject<string>('');
  protected readonly filteredOptions$ = new BehaviorSubject<IFormzFieldOption[]>([]);

  protected onInputChange(): void {
    const value = this.inputRef.nativeElement.value;

    this.filterValue$.next(value);

    // TODO comment following line to only allow prefedined options (add setting)
    // this.onChange(value); // notify ControlValueAccessor of the change

    this.isFieldFilled = value.length > 0;
  }

  protected onFocusChange(isFocused: boolean): void {
    this.focusChangeSubject$.next(isFocused);
    this.isFieldFocused = isFocused;

    if (!isFocused) {
      this.onTouched(); // on blur, notify ControlValueAccessor that the field was touched
    }

    if (isFocused && !this.isOpen && this.isFieldFilled) {
      this.togglePanel(true); // open the panel on focus
    }
  }

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

    this.isFieldFilled = !!value;

    // write chosen value
    this.inputRef.nativeElement.value = label;
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

  //#region IFormzField

  valueChange$ = this.valueChangeSubject$.asObservable();
  focusChange$ = this.focusChangeSubject$.asObservable();

  get fieldId(): string {
    return this.id;
  }

  get value(): string {
    return this.selectedOption?.value ?? '';
  }

  get isLabelFloating(): boolean {
    return !this.isFieldFocused && !this.isFieldFilled;
  }

  get elementRef(): ElementRef<HTMLElement> {
    return this.autocompleteRef as ElementRef<HTMLElement>;
  }

  //#endregion

  //#region IFormzDropdownField

  @Input() name = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() required = false;

  //#endregion

  //#region IFormzOptionField

  @Input() options?: IFormzFieldOption[] = [];
  @Input() emptyOption: IFormzFieldOption = { value: 'empty', label: 'No options available.' };

  @ContentChildren(forwardRef(() => FieldOptionComponent))
  optionComponents?: QueryList<FieldOptionComponent>;

  get hasOptions(): boolean {
    return (this.options?.length ?? 0) > 0 || (this.optionComponents?.length ?? 0) > 0;
  }

  public selectOption(option: IFormzFieldOption): void {
    if (option.disabled) return;

    this.selectedOption = option;
    this.inputRef.nativeElement.value = option.label ?? ''; // update input value with selected option label

    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.valueChangeSubject$.next(this.selectedOption.value);
    this.isFieldFilled = this.selectedOption.value.length > 0;
    this.onChange(this.selectedOption.value); // notify ControlValueAccessor of the change
    this.onTouched();
    this.togglePanel(false);
  }

  private deselectOption(): void {
    this.setHighlightedIndex(-1);
    this.selectedOption = undefined;
    this.onChange('');
  }

  //#endregion

  togglePanel(isOpen: boolean): void {
    this.isOpen = isOpen;

    if (isOpen) {
      this.highlightSelectedOption();
      this.scrollIntoView();
    } else {
      this.setHighlightedIndex(-1); // reset highlighted index when closing
    }

    this.cdRef.markForCheck();
  }

  private registerGlobalListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const onClick = (event: MouseEvent) => this.handleExternalClick(event);
      const onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);

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

  private handleExternalClick(event: MouseEvent): void {
    if (!this.isOpen) return;

    const clickedInside = this.autocompleteRef.nativeElement.contains(event.target as Node);

    if (!clickedInside) {
      this.ngZone.run(() => this.togglePanel(false));
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isFieldFocused) return;
    if (this.disabled) return;
    if (!['Escape', 'ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) return;

    const filteredOptions = this.filteredOptions();
    const filteredOptionsCount = filteredOptions.length;

    this.ngZone.run(() => {
      switch (event.key) {
        case 'Escape':
        case 'Tab':
          if (this.isOpen) this.togglePanel(false);
          break;
        case 'ArrowDown':
          if (!this.isOpen) {
            this.togglePanel(true);
          } else if (filteredOptionsCount > 0) {
            this.setHighlightedIndex((this.highlightedIndex + 1) % filteredOptionsCount);
          }
          event.preventDefault();
          break;
        case 'ArrowUp':
          if (this.isOpen && filteredOptionsCount > 0) {
            this.setHighlightedIndex((this.highlightedIndex - 1 + filteredOptionsCount) % filteredOptionsCount);
            event.preventDefault();
          }
          break;
        case 'Enter':
          if (this.isOpen && filteredOptions[this.highlightedIndex]) {
            const option = filteredOptions[this.highlightedIndex]!;
            this.selectOption(option);
            event.preventDefault();
          }
          break;
      }
    });
  }

  private highlightSelectedOption(): void {
    const filteredOptions = this.filteredOptions();

    const selectedIndex = filteredOptions.findIndex((opt) => opt.value === this.selectedOption?.value);
    this.setHighlightedIndex(selectedIndex > 0 ? selectedIndex : 0);
  }

  private setHighlightedIndex(index: number): void {
    this.highlightedIndex = index;

    // highlight content projection options
    const inlineOptionCount = this.options?.length ?? 0;
    this.optionComponents?.forEach((comp, i) => {
      comp.setHighlighted(i === this.highlightedIndex - inlineOptionCount);
    });

    this.cdRef.markForCheck();
  }

  private combineAllOptions(): IFormzFieldOption[] {
    const inlineOptions = this.options ?? [];

    const projectedOptions =
      this.optionComponents?.toArray().map((opt) => ({
        value: opt.value,
        label: opt.label || opt.innerTextAsLabel
      })) ?? [];

    return [...inlineOptions, ...projectedOptions];
  }

  private filteredOptions(): IFormzFieldOption[] {
    const filterValue = this.filterValue$.value;

    const allOptions = this.combineAllOptions();

    const filteredOptions = filterValue
      ? allOptions.filter((opt) => opt.label?.toLowerCase().includes(filterValue.toLowerCase()))
      : allOptions;

    const emptyOption = { ...this.emptyOption, disabled: true };
    const filteredOrEmptyOptions = filteredOptions.length > 0 ? filteredOptions : [emptyOption];

    return filteredOrEmptyOptions;
  }

  private scrollIntoView(): void {
    setTimeout(() => {
      const field = this.autocompleteRef?.nativeElement;
      const panel = this.panelRef?.nativeElement;

      if (!field || !panel) return;

      const fieldRect = field.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      const fieldBottomEdge = fieldRect.bottom;
      const fieldTopEdge = fieldRect.top;

      const panelBottomEdge = panelRect.bottom;
      const panelTopEdge = panelRect.top;

      const viewportHeight = window.innerHeight;

      const isFieldOutOfView = fieldBottomEdge > viewportHeight || fieldTopEdge < 0;
      const isPanelOutOfView = panelBottomEdge > viewportHeight || panelTopEdge < 0;

      if (isFieldOutOfView) {
        field.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }

      if (isPanelOutOfView) {
        panel.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    });
  }

  private registerAutocomplete(): void {
    this.filterValue$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        filter(() => this.isFieldFocused),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.deselectOption();

        const filteredOptions = this.filteredOptions();

        this.filteredOptions$.next(filteredOptions);

        if (filteredOptions.length > 0 && !this.isOpen) {
          this.togglePanel(true);
        }

        if (filteredOptions.length === 0 && this.isOpen) {
          this.togglePanel(false);
        }
      });
  }
}
