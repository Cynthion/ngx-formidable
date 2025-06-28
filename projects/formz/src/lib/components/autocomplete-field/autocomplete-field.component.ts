import {
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
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { FormzFieldBase, IFormzDropdownField, IFormzFieldOption } from '../../form-model';
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
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutocompleteFieldComponent
  extends FormzFieldBase
  implements OnInit, OnDestroy, ControlValueAccessor, IFormzDropdownField
{
  @ViewChild('autocompleteRef', { static: true }) autocompleteRef!: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('panelRef') panelRef?: ElementRef<HTMLDivElement>;

  @Input() enableBackdrop = false;

  protected selectedValue?: string;
  protected selectedLabel?: string;
  protected isOpen = false;
  protected highlightedIndex = -1;

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

  public selectOption(value: string, label?: string): void {
    this.selectedValue = value;
    this.selectedLabel = label;
    this.focusChangeSubject$.next(false); // simulate blur on selection
    this.valueChangeSubject$.next(value);
    this.isFieldFilled = value.length > 0;
    this.onChange(value); // notify ControlValueAccessor of the change
    this.onTouched();
    this.togglePanel(false); // close the dropdown panel after selection
  }

  protected onInputChange(): void {
    // TODO implement
    // this.selectedValue = value;
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
    return this.autocompleteRef as ElementRef<HTMLElement>;
  }

  //#endregion

  //#region ControlValueAccessor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: unknown) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.selectedValue = value;
    this.selectedLabel = this.combineAllOptions().find((opt) => opt.value === value)?.label ?? '';
    this.isFieldFilled = !!value;

    // write chosen value
    this.inputRef.nativeElement.value = this.selectedLabel;
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

  @ContentChildren(forwardRef(() => FieldOptionComponent))
  optionComponents?: QueryList<FieldOptionComponent>;

  //#endregion

  togglePanel(isOpen: boolean): void {
    this.isOpen = isOpen;
    this.focusChangeSubject$.next(isOpen);

    if (isOpen) {
      this.setHightlightedOption();
      this.scrollIntoView();
    } else {
      this.highlightedIndex = -1; // reset highlighted index when closing
    }

    this.cdRef.markForCheck();
  }

  private registerGlobalListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const onClick = (event: MouseEvent) => this.handleDocumentClick(event);
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

  private handleDocumentClick(event: MouseEvent): void {
    if (!this.isOpen || !this.autocompleteRef) return;

    const clickedInside = this.autocompleteRef.nativeElement.contains(event.target as Node);
    if (!clickedInside) {
      this.ngZone.run(() => this.togglePanel(false));
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isFieldFocused) return;
    if (this.disabled) return;

    if (['Escape', 'ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      const allOptions = this.combineAllOptions();
      const allOptionsCount = allOptions.length;

      this.ngZone.run(() => {
        switch (event.key) {
          case 'Escape':
            if (this.isOpen) this.togglePanel(false);
            break;
          case 'ArrowDown':
            if (!this.isOpen) {
              this.togglePanel(true);
            } else if (allOptionsCount > 0) {
              this.setHighlightedIndex((this.highlightedIndex + 1) % allOptionsCount);
            }
            event.preventDefault();
            break;
          case 'ArrowUp':
            if (this.isOpen && allOptionsCount > 0) {
              this.setHighlightedIndex((this.highlightedIndex - 1 + allOptionsCount) % allOptionsCount);
              event.preventDefault();
            }
            break;
          case 'Enter':
            if (this.isOpen && allOptions[this.highlightedIndex]) {
              const opt = allOptions[this.highlightedIndex]!;
              this.selectOption(opt.value, opt.label);
              event.preventDefault();
            }
            break;
        }
      });
    } else {
      this.ngZone.run(() => this.togglePanel(false));
    }
  }

  private setHightlightedOption(): void {
    const allOptions = this.combineAllOptions();

    const selectedIndex = allOptions.findIndex((opt) => opt.value === this.selectedValue);
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
}
