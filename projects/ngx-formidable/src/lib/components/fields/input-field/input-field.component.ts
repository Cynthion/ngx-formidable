import {
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
import { DEFAULT_PATTERNS, DEFAULT_SPECIAL_CHARACTERS, MaskConfigSubset } from '../../../helpers/mask.helpers';
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
export class InputFieldComponent extends BaseFieldDirective implements IFormidableInputField, OnChanges {
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mask'] || changes['maskConfig']) {
      this.doWriteValue(this.value ?? ''); // reapply mask if mask or maskConfig changed
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
        const masked = this.maskPipe.transform(newValue, this.mask!, this.mergedMaskConfig);
        this.inputRef.nativeElement.value = masked;

        // notify the form control again (since usually done in base directive)
        this.onValueChange();
      });
    } else {
      this.inputRef.nativeElement.value = newValue;
    }

    setCaretPositionToEnd(this.inputRef.nativeElement);
  }

  //#endregion

  //#region IFormidableField

  get value(): string | null {
    return this.inputRef.nativeElement.value || null;
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

  //#endregion
}
