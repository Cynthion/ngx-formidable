import { CommonModule } from '@angular/common';
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
  IFormidableTextareaField
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A configurable multi-line textarea with optional autosizing and length indicator.
 * Supports:
 * - `name`, `placeholder`, `readonly`, `disabled`
 * - `autocomplete` (`'off'|'on'|'given-name'|…`)
 * - `minLength`, `maxLength`
 * - `enableAutosize` (auto height)
 * - `showLengthIndicator` (character count)
 *
 * @example
 * ```html
 * <formidable-textarea-field
 *   name="bio"
 *   ngModel
 *   [maxLength]="200"
 *   [enableAutosize]="true"
 *   [showLengthIndicator]="true"
 * ></formidable-textarea-field>
 * ```
 */
@Component({
  selector: 'formidable-textarea-field',
  templateUrl: './textarea-field.component.html',
  styleUrls: ['./textarea-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, NgxMaskDirective],
  providers: [
    // required for ControlValueAccessor to work with Angular forms
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaFieldComponent),
      multi: true
    },
    // required to provide this component as IFormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: TextareaFieldComponent
    },
    NgxMaskPipe
  ]
})
export class TextareaFieldComponent
  extends BaseFieldDirective
  implements IFormidableTextareaField, AfterViewInit, OnChanges
{
  // @ViewChild('textareaRef', { static: false }) textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('maskedTextareaRef', { static: false }) maskedTextareaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('plainTextareaRef', { static: false }) plainTextareaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lengthIndicatorRef') lengthIndicatorRef?: ElementRef<HTMLDivElement>;

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
    this.adjustLayout();
    this.warnIfMaskConflictsWithMinMax();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mask'] || changes['maskConfig'] || changes['minLength'] || changes['maxLength']) {
      this.warnIfMaskConflictsWithMinMax();

      if (changes['mask'] || changes['maskConfig']) {
        // re-apply formatting if the mask changed
        queueMicrotask(() => {
          this.doWriteValue(this.value ?? '');
          this.adjustLayout();
          this.autoResize();
        });
      }
    }
  }

  protected doOnValueChange(): void {
    this.autoResize();
  }

  protected doOnFocusChange(_isFocused: boolean): void {
    // No additional actions needed
  }

  // #region ControlValueAccessor

  protected doWriteValue(value: string): void {
    const newValue = value ?? '';
    const el = this.textareaElement;
    if (!el) return;

    if (this.mask) {
      // Ensure the mask is loaded before setting the value
      setTimeout(() => {
        const maskedValue = this.maskPipe.transform(newValue, this.mask!, this.mergedMaskConfig);
        el.value = maskedValue;
        setCaretPositionToEnd(el);

        // notify the form control again (since usually done in base directive)
        if (newValue) {
          this.onValueChange();
        }
      });
    } else {
      el.value = newValue;
      setCaretPositionToEnd(el);
    }
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    const el = this.textareaElement;
    if (!el) return null;
    const textareaValue = el.value;

    if (this.mask) {
      // remove mask characters if mask is applied
      const valueNoMaskTyped = this.maskPipe.transform(textareaValue, this.mask!, {
        ...this.mergedMaskConfig,
        showMaskTyped: false
      });

      return valueNoMaskTyped || null;
    } else {
      return textareaValue || null;
    }
  }

  get isLabelFloating(): boolean {
    const blocked = this.disabled || this.readonly;
    return !blocked && !this.isFieldFocused && !this.isFieldFilled;
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return (this.mask ? this.maskedTextareaRef! : this.plainTextareaRef!) as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'single';

  // #endregion

  // #region IFormidableTextareaField

  @Input() autocomplete: AutoFill = 'off';
  @Input() minLength = -1;
  @Input() maxLength = -1;
  @Input() enableAutosize = true;
  @Input() showLengthIndicator = false;

  // #endregion

  // #region IFormidableMaskField

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
          `[ngx-formidable] <${this.name || 'textarea'}>: minlength=${this.minLength} exceeds mask's max display length=${max} (mask="${this.mask}", prefix="${prefix ?? ''}", suffix="${suffix ?? ''}").`
        );
      }
      if (this.maxLength > -1 && this.maxLength < min) {
        console.error(
          `[ngx-formidable] <${this.name || 'textarea'}>: maxlength=${this.maxLength} is below mask's min display length=${min} (mask="${this.mask}", prefix="${prefix ?? ''}", suffix="${suffix ?? ''}").`
        );
      }
    } else {
      // Optional: gentle heads-up for variable masks
      if (this.minLength > -1 || this.maxLength > -1) {
        console.warn(
          `[ngx-formidable] <${this.name || 'textarea'}>: mask "${this.mask}" has variable length; exact comparison with minlength/maxlength is not deterministic.`
        );
      }
    }
  }

  private get textareaElement(): HTMLTextAreaElement | null {
    return (this.mask ? this.maskedTextareaRef?.nativeElement : this.plainTextareaRef?.nativeElement) ?? null;
  }

  // #endregion

  private autoResize(): void {
    if (!this.enableAutosize) return;

    const el = this.textareaElement;
    if (!el) return;

    el.style.height = 'auto'; // reset height to recalculate
    el.style.height = `${el.scrollHeight}px`;
  }

  private adjustLayout(): void {
    setTimeout(() => {
      // adjust length indicator, so that it also aligns right even if a suffix is set
      const el = this.textareaElement;
      const indicator = this.lengthIndicatorRef?.nativeElement;
      if (!el || !indicator) return;
      const style = window.getComputedStyle(el);
      indicator.style.right = style.paddingRight;
    });
  }
}
