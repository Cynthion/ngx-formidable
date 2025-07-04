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
import {
  FORMZ_FIELD_OPTION,
  FORMZ_OPTION_FIELD,
  FormzFieldBase,
  IFormzAutocompleteField,
  IFormzFieldOption
} from '../../form-model';

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
    this.updateFilteredOptions();
  }

  protected onInputChange(): void {
    const value = this.inputRef.nativeElement.value;

    this.filterValue$.next(value);

    this.isFieldFilled = value.length > 0;
  }

  protected onFocusChange(isFocused: boolean): void {
    this.focusChangeSubject$.next(isFocused);
    this.isFieldFocused = isFocused;

    if (!isFocused) {
      this.onTouched(); // on blur, notify ControlValueAccessor that the field was touched
    }

    // if (isFocused && !this.isOpen && this.isFieldFilled) {
    //   this.togglePanel(true); // open the panel on focus
    // }
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

  @ContentChildren(FORMZ_FIELD_OPTION)
  optionComponents?: QueryList<IFormzFieldOption>;

  private readonly filterValue$ = new BehaviorSubject<string>('');
  protected readonly filteredInlineOptions$ = new BehaviorSubject<IFormzFieldOption[]>([]);
  protected readonly filteredProjectedOptions$ = new BehaviorSubject<IFormzFieldOption[]>([]);

  public selectOption(option: IFormzFieldOption): void {
    if (option.disabled) return;

    const newOption: IFormzFieldOption = {
      value: option.value,
      label: option.label || option.value, // value as fallback for optional label
      disabled: option.disabled
    };

    this.selectedOption = newOption;
    this.inputRef.nativeElement.value = this.selectedOption.label!; // update input value with selected option label

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

    const options = this.getFilteredOptions();
    const count = options.length;

    this.ngZone.run(() => {
      switch (event.key) {
        case 'Escape':
        case 'Tab':
          if (this.isOpen) this.togglePanel(false);
          break;
        case 'ArrowDown':
          if (!this.isOpen) {
            this.togglePanel(true);
          } else if (count > 0) {
            this.setHighlightedIndex((this.highlightedIndex + 1) % count);
          }
          event.preventDefault();
          break;
        case 'ArrowUp':
          if (this.isOpen && count > 0) {
            this.setHighlightedIndex((this.highlightedIndex - 1 + count) % count);
            event.preventDefault();
          }
          break;
        case 'Enter':
          if (this.isOpen && options[this.highlightedIndex]) {
            const option = options[this.highlightedIndex]!;
            this.selectOption(option);
            event.preventDefault();
          }
          break;
      }
    });
  }

  private highlightSelectedOption(): void {
    const options = this.getFilteredOptions();

    const selectedIndex = options.findIndex((opt) => opt.value === this.selectedOption?.value);

    this.setHighlightedIndex(selectedIndex);
  }

  private setHighlightedIndex(index: number): void {
    this.highlightedIndex = index;

    this.cdRef.markForCheck();
  }

  private combineAllOptions(): IFormzFieldOption[] {
    const inlineOptions = this.options ?? [];
    const projectedOptions = this.optionComponents?.toArray() ?? [];

    return [...inlineOptions, ...projectedOptions];
  }

  private getFilteredOptions(): IFormzFieldOption[] {
    return [...this.filteredInlineOptions$.value, ...this.filteredProjectedOptions$.value];
  }

  private updateFilteredOptions(): void {
    const filterValue = this.filterValue$.value;

    // inline options
    const inlineOptions = this.options ?? [];
    const filteredInlineOptions = filterValue
      ? inlineOptions.filter((opt) =>
          opt.match ? opt.match(filterValue) : opt.label?.toLowerCase().includes(filterValue.toLowerCase())
        )
      : inlineOptions;

    this.filteredInlineOptions$.next(filteredInlineOptions);

    // projected options
    const projectedOptions = this.optionComponents?.toArray() ?? [];
    const filteredProjectedOptions = filterValue
      ? projectedOptions.filter((opt) =>
          opt.match ? opt.match(filterValue) : opt.label?.toLowerCase().includes(filterValue.toLowerCase())
        )
      : projectedOptions;

    this.filteredProjectedOptions$.next(filteredProjectedOptions);
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
        this.updateFilteredOptions();

        if (!this.isOpen) {
          this.togglePanel(true);
        }
      });
  }
}
