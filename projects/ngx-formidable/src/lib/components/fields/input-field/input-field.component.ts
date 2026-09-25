import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  untracked,
  viewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgxMaskConfig, NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { replaceText } from '../../../helpers/input.helpers';
import {
  analyzeMaskDisplayLength,
  DEFAULT_PATTERNS,
  DEFAULT_PLACEHOLDER_CHARACTER,
  DEFAULT_SPECIAL_CHARACTERS,
  isPlaceholderAmbiguous,
  MaskConfigSubset
} from '../../../helpers/mask.helpers';
import { onSignalChange } from '../../../helpers/utility.helpers';
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
export class InputFieldComponent extends BaseFieldDirective implements IFormidableInputField, AfterViewInit {
  private maskPipe = inject(NgxMaskPipe);
  private maskDefaults = inject<Partial<NgxMaskConfig>>(FORMIDABLE_MASK_DEFAULTS, { optional: true });

  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputRef');

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  private isViewReady = false;

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    this.isViewReady = true;
    this.warnAboutMaskConfig();
  }

  constructor() {
    super();

    onSignalChange(
      () => [this.mask(), this.maskConfig(), this.minLength(), this.maxLength()],
      () => this.warnAboutMaskConfig()
    );

    // Re-applies the formatting the new mask asks for. Separate, so a `minLength` change does not rewrite
    // the value the user is in the middle of typing — and it runs on the first pass too:
    // ngxMask initialises across a full task, so the value written before that has to be formatted again once it has.
    let isFirstPass = true;

    effect(() => {
      this.mask();
      this.maskConfig();

      const firstPass = isFirstPass;
      isFirstPass = false;

      untracked(() => queueMicrotask(() => this.doWriteValue(this.valueToReapply(firstPass))));
    });
  }

  /**
   * What the mask effect re-formats. On the first pass the element is not the source: ngxMask has not
   * initialised, so a value written before this point is still sitting in `lastWrittenValue` while the
   * element reads back empty — re-formatting the element would then erase it. Afterwards the element is
   * authoritative, so a mask changed while the user is typing re-formats what they typed.
   */
  private valueToReapply(isFirstPass: boolean): string {
    if (isFirstPass && this.lastWrittenValue) return this.lastWrittenValue;

    return this.value ?? '';
  }

  protected doOnValueChange(): void {
    // No additional actions needed
  }

  protected doOnFocusChange(isFocused: boolean): void {
    if (isFocused) this.selectOnKeyboardFocus(this.inputRef().nativeElement, !!this.mask());
  }

  // #region ControlValueAccessor

  /** The last value the form wrote in, which the mask effect needs while the element cannot yet hold it. */
  private lastWrittenValue = '';

  protected doWriteValue(value: string): void {
    const newValue = value ?? '';

    this.lastWrittenValue = newValue;

    // A standalone `ngModel`, one outside a `<form>`, writes from its own `ngOnChanges`, before the view
    // exists. The mask effect's first pass writes `lastWrittenValue` once it does.
    if (!this.isViewReady) return;

    if (this.mask()) {
      // Waits for the ngxMask directive to initialize on the control, which it does across a full
      // task — a microtask would land before it and the value would be written unmasked.
      setTimeout(() => {
        const maskedValue = this.maskPipe.transform(newValue, this.mask()!, this.mergedMaskConfig);
        replaceText(this.inputRef().nativeElement, maskedValue);

        // notify the form control again (since usually done in base directive)
        if (newValue) {
          this.runSilently('correction', () => this.onValueChange());
        }
      });
    } else {
      replaceText(this.inputRef().nativeElement, newValue);
    }
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    const inputValue = this.inputRef().nativeElement.value;

    if (this.mask()) {
      // remove mask characters if mask is applied
      const valueNoMaskTyped = this.maskPipe.transform(inputValue, this.mask()!, {
        ...this.mergedMaskConfig,
        showMaskTyped: false
      });

      return valueNoMaskTyped || null;
    } else {
      return inputValue || null;
    }
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return this.inputRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region IFormidableInputField

  /** The native autofill hint. Off by default, so a form does not leak values a consumer did not ask for. */
  public readonly autocomplete = input<AutoFill>('off');

  /** The native attribute. Reported to the browser and used to sanity-check a `mask`; it does not validate. */
  public readonly minLength = input(-1);

  /** The native attribute, which does cap what can be typed. `-1` for no cap. */
  public readonly maxLength = input(-1);

  // #endregion

  // #region IFormidableMaskField

  /** An ngx-mask pattern. Setting one changes what the model receives — see `dropSpecialCharacters`. */
  public readonly mask = input<string | undefined>(undefined);

  /** Per-field ngx-mask overrides, layered over `FORMIDABLE_MASK_DEFAULTS` and the library's own defaults. */
  public readonly maskConfig = input<Partial<NgxMaskConfig> | undefined>(undefined);

  // Only a mask that renders its slots while empty occupies the value area.
  protected override readonly showsEmptyValueHint = computed(
    () => !!this.mask() && this.mergedMaskConfig.showMaskTyped
  );

  private readonly LOCAL_MASK_DEFAULTS: Required<MaskConfigSubset> = {
    validation: true,
    showMaskTyped: false,
    placeHolderCharacter: DEFAULT_PLACEHOLDER_CHARACTER,
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
      ...(this.maskConfig() ?? {})
    } as Required<MaskConfigSubset>;
  }

  protected override get maskPlaceholderCharacter(): string {
    return this.mergedMaskConfig.placeHolderCharacter;
  }

  private warnAboutMaskConfig(): void {
    const mask = this.mask();
    if (!mask) return;

    if (isPlaceholderAmbiguous(mask, this.mergedMaskConfig)) {
      console.warn(
        `[ngx-formidable] <${this.name() || 'input'}>: placeHolderCharacter "${this.mergedMaskConfig.placeHolderCharacter}" ` +
          `can also appear as content under this mask, so the field cannot tell a filled position from an ` +
          `empty one. Set a placeHolderCharacter the mask cannot produce.`
      );
    }

    const { prefix, suffix } = this.mergedMaskConfig;
    const { min, max, variable } = analyzeMaskDisplayLength(mask, { prefix, suffix });
    const name = this.name() || 'input';

    // Only emit hard errors when we have a deterministic range
    if (!variable) {
      if (this.minLength() > -1 && this.minLength() > max) {
        console.error(
          `[ngx-formidable] <${name}>: minlength=${this.minLength()} exceeds mask's max display length=${max} (mask="${mask}", prefix="${prefix ?? ''}", suffix="${suffix ?? ''}").`
        );
      }
      if (this.maxLength() > -1 && this.maxLength() < min) {
        console.error(
          `[ngx-formidable] <${name}>: maxlength=${this.maxLength()} is below mask's min display length=${min} (mask="${mask}", prefix="${prefix ?? ''}", suffix="${suffix ?? ''}").`
        );
      }
    } else {
      // Optional: gentle heads-up for variable masks
      if (this.minLength() > -1 || this.maxLength() > -1) {
        console.warn(
          `[ngx-formidable] <${name}>: mask "${mask}" has variable length; exact comparison with minlength/maxlength is not deterministic.`
        );
      }
    }
  }

  // #endregion
}
