import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  Inject,
  Input,
  OnChanges,
  Optional,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgxMaskConfig, NgxMaskPipe } from 'ngx-mask';
import { setCaretPositionToEnd } from '../../../helpers/input.helpers';
import {
  analyzeMaskDisplayLength,
  DEFAULT_PATTERNS,
  DEFAULT_SPECIAL_CHARACTERS,
  MaskConfigSubset
} from '../../../helpers/mask.helpers';
import {
  FieldDecoratorLayout,
  FORMIDABLE_FIELD,
  FORMIDABLE_MASK_DEFAULTS,
  IFormidableInputField
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A configurable single-line text input.
 * Supports:
 * - `name`, `placeholder`, `readonly`, `disabled`
 * - `autocomplete` (`'off'|'on'|'given-name'|…`)
 * - `minLength`, `maxLength`
 *
 * @example
 * ```html
 * <formidable-input-field
 *   name="firstName"
 *   ngModel
 *   placeholder="First Name"
 *   [minLength]="2"
 * ></formidable-input-field>
 * ```
 */
@Component({
  selector: 'formidable-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: InputFieldComponent
    },
    NgxMaskPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputFieldComponent extends BaseFieldDirective implements IFormidableInputField, AfterViewInit, OnChanges {
  @ViewChild('inputRef', { static: true }) inputRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  constructor(
    private maskPipe: NgxMaskPipe,
    @Optional() @Inject(FORMIDABLE_MASK_DEFAULTS) private maskDefaults?: Partial<NgxMaskConfig>
  ) {
    super();
  }

  ngAfterViewInit(): void {
    this.warnIfMaskConflictsWithMinMax();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mask'] || changes['maskConfig'] || changes['minLength'] || changes['maxLength']) {
      this.warnIfMaskConflictsWithMinMax();
      if (changes['mask'] || changes['maskConfig']) {
        // re-apply formatting if the mask changed
        this.doWriteValue(this.value ?? '');
      }
    }
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  //#region ControlValueAccessor

  protected doWriteValue(value: string): void {
    const newValue = value ?? '';

    if (this.mask) {
      // Ensure the mask is loaded before setting the value
      setTimeout(() => {
        const maskedValue = this.maskPipe.transform(newValue, this.mask!, this.mergedMaskConfig);
        this.inputRef.nativeElement.value = maskedValue;

        // notify the form control again (since usually done in base directive)
        if (newValue) {
          this.onValueChange();
        }
      });
    } else {
      this.inputRef.nativeElement.value = newValue;
    }

    setCaretPositionToEnd(this.inputRef.nativeElement);
  }

  //#endregion

  //#region IFormidableField

  get value(): string | null {
    const inputValue = this.inputRef.nativeElement.value;

    if (this.mask) {
      // remove mask characters if mask is applied
      const valueNoMaskTyped = this.maskPipe.transform(inputValue, this.mask!, {
        ...this.mergedMaskConfig,
        showMaskTyped: false
      });

      return valueNoMaskTyped || null;
    } else {
      return inputValue || null;
    }
  }

  get isLabelFloating(): boolean {
    const blocked = this.disabled || this.readonly;
    return !blocked && !this.isFieldFocused && !this.isFieldFilled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.inputRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  //#endregion

  //#region IFormidableInputField

  @Input() autocomplete: AutoFill = 'off';
  @Input() minLength = -1;
  @Input() maxLength = -1;

  //#endregion

  //#region IFormidableMaskField

  @Input() mask?: string = undefined;
  @Input() maskConfig?: Partial<NgxMaskConfig>;

  private readonly LOCAL_MASK_DEFAULTS: Required<MaskConfigSubset> = {
    validation: true,
    showMaskTyped: false,
    dropSpecialCharacters: true,
    specialCharacters: DEFAULT_SPECIAL_CHARACTERS,
    thousandSeparator: ' ', // ngx-mask default is a space
    decimalMarker: '.', // can be string | string[]; default to '.'
    prefix: '',
    suffix: '',
    allowNegativeNumbers: false,
    leadZeroDateTime: false,
    patterns: DEFAULT_PATTERNS,
    clearIfNotMatch: false
  };

  /** Merged mask config (local defaults <- global defaults <- per-field) */
  get mergedMaskConfig(): Required<MaskConfigSubset> {
    return {
      ...this.LOCAL_MASK_DEFAULTS,
      ...(this.maskDefaults ?? {}),
      ...(this.maskConfig ?? {})
    } as Required<MaskConfigSubset>;
  }

  private warnIfMaskConflictsWithMinMax(): void {
    if (!this.mask) return;

    const { prefix, suffix } = this.mergedMaskConfig;
    const { min, max, variable } = analyzeMaskDisplayLength(this.mask, { prefix, suffix });

    // Only emit hard errors when we have a deterministic range
    if (!variable) {
      if (this.minLength > -1 && this.minLength > max) {
        console.error(
          `[ngx-formidable] <${this.name || 'input'}>: minlength=${this.minLength} exceeds mask's max display length=${max} (mask="${this.mask}", prefix="${prefix ?? ''}", suffix="${suffix ?? ''}").`
        );
      }
      if (this.maxLength > -1 && this.maxLength < min) {
        console.error(
          `[ngx-formidable] <${this.name || 'input'}>: maxlength=${this.maxLength} is below mask's min display length=${min} (mask="${this.mask}", prefix="${prefix ?? ''}", suffix="${suffix ?? ''}").`
        );
      }
    } else {
      // Optional: gentle heads-up for variable masks
      if (this.minLength > -1 || this.maxLength > -1) {
        console.warn(
          `[ngx-formidable] <${this.name || 'input'}>: mask "${this.mask}" has variable length; exact comparison with minlength/maxlength is not deterministic.`
        );
      }
    }
  }

  //#endregion
}
