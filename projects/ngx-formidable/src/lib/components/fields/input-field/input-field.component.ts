import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgxMaskConfig, NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
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
 * A single-line text input, optionally masked — a phone number, an IBAN. `textarea-field` is the multi-line
 * one.
 *
 * `minLength` and `maxLength` are the native attributes and do not validate on their own; a rule in the
 * connected validator does that. Setting either alongside a `mask` that cannot satisfy it logs a warning.
 */
@Component({
  selector: 'formidable-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxMaskDirective],
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
  ]
})
export class InputFieldComponent extends BaseFieldDirective implements IFormidableInputField, AfterViewInit, OnChanges {
  private maskPipe = inject(NgxMaskPipe);
  private maskDefaults = inject<Partial<NgxMaskConfig>>(FORMIDABLE_MASK_DEFAULTS, { optional: true });

  @ViewChild('inputRef', { static: false }) inputRef!: ElementRef<HTMLInputElement>;

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    this.warnIfMaskConflictsWithMinMax();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mask'] || changes['maskConfig'] || changes['minLength'] || changes['maxLength']) {
      this.warnIfMaskConflictsWithMinMax();

      if (changes['mask'] || changes['maskConfig']) {
        // re-apply formatting if the mask changed
        queueMicrotask(() => this.doWriteValue(this.value ?? ''));
      }
    }
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string): void {
    const newValue = value ?? '';

    if (this.mask) {
      // Waits for the ngxMask directive to initialize on the control, which it does across a full
      // task — a microtask would land before it and the value would be written unmasked.
      setTimeout(() => {
        const maskedValue = this.maskPipe.transform(newValue, this.mask!, this.mergedMaskConfig);
        this.inputRef.nativeElement.value = maskedValue;
        setCaretPositionToEnd(this.inputRef.nativeElement);

        // notify the form control again (since usually done in base directive)
        if (newValue) {
          this.runSilently('correction', () => this.onValueChange());
        }
      });
    } else {
      this.inputRef.nativeElement.value = newValue;
      setCaretPositionToEnd(this.inputRef.nativeElement);
    }
  }

  // #endregion

  // #region IFormidableField

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

  get fieldRef(): ElementRef<HTMLElement> {
    return this.inputRef as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region IFormidableInputField

  /** The native autofill hint. Off by default, so a form does not leak values a consumer did not ask for. */
  @Input() autocomplete: AutoFill = 'off';

  /** The native attribute. Reported to the browser and used to sanity-check a `mask`; it does not validate. */
  @Input() minLength = -1;

  /** The native attribute, which does cap what can be typed. `-1` for no cap. */
  @Input() maxLength = -1;

  // #endregion

  // #region IFormidableMaskField

  /** An ngx-mask pattern. Setting one changes what the model receives — see `dropSpecialCharacters`. */
  @Input() mask?: string = undefined;

  /** Per-field ngx-mask overrides, layered over `FORMIDABLE_MASK_DEFAULTS` and the library's own defaults. */
  @Input() maskConfig?: Partial<NgxMaskConfig>;

  protected override get showsEmptyValueHint(): boolean {
    // Only a mask that renders its slots while empty occupies the value area.
    return !!this.mask && this.mergedMaskConfig.showMaskTyped;
  }

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

  /** The mask config actually in force: the library's defaults, then `FORMIDABLE_MASK_DEFAULTS`, then `maskConfig`. */
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

  // #endregion
}
