import {
  afterRenderEffect,
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  untracked,
  viewChild
} from '@angular/core';
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
import { FieldDecoratorLayout, FORMIDABLE_FIELD, FORMIDABLE_MASK_DEFAULTS } from '../../../models/formidable.model';
import { BaseField } from '../base-field';

/**
 * A single-line text input, optionally masked — a phone number, an IBAN. `textarea-field` is the multi-line
 * one.
 *
 * `minLength` and `maxLength` are the native attributes and do not validate on their own; a rule in the
 * connected validator does that. Setting either alongside a `mask` that cannot satisfy it logs a warning.
 */
@Component({
  selector: 'formidable-input-field',
  templateUrl: './input-field.html',
  styleUrls: ['./input-field.scss'],
  imports: [NgxMaskDirective],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: InputField
    },
    NgxMaskPipe
  ]
})
export class InputField extends BaseField<string> implements AfterViewInit {
  private maskPipe = inject(NgxMaskPipe);
  private maskDefaults = inject<Partial<NgxMaskConfig>>(FORMIDABLE_MASK_DEFAULTS, { optional: true });

  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputRef');

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    this.warnAboutMaskConfig();
  }

  constructor() {
    super();

    onSignalChange(
      () => [this.mask(), this.maskConfig(), this.minLength(), this.maxLength()],
      () => this.warnAboutMaskConfig()
    );

    // Renders the model, and renders it again under a changed mask — a changed mask may also swap the
    // element. What the element already stands for is left alone, so typing keeps its caret.
    afterRenderEffect(() => {
      const value = this.value() ?? '';

      this.mask();
      this.maskConfig();

      untracked(() => this.render(value));
    });
  }

  /** The model, as the user edits it: what the element shows, with the mask's characters taken out. */
  protected onInput(): void {
    this.setValue(this.editorValue);
  }

  protected doOnFocusChange(isFocused: boolean): void {
    if (isFocused) this.selectOnKeyboardFocus(this.inputRef().nativeElement, !!this.mask());
  }

  private render(value: string): void {
    if (this.editorValue === value) return;

    if (!this.mask()) {
      replaceText(this.inputRef().nativeElement, value);
      return;
    }

    // Waits for the ngxMask directive to initialize on the control, which it does across a full task — a
    // microtask would land before it and the value would be written unmasked.
    setTimeout(() => {
      replaceText(this.inputRef().nativeElement, this.maskPipe.transform(value, this.mask()!, this.mergedMaskConfig));
    });
  }

  private get editorValue(): string {
    const text = this.inputRef().nativeElement.value;

    if (!this.mask()) return text;

    // remove mask characters if mask is applied
    return this.maskPipe.transform(text, this.mask()!, { ...this.mergedMaskConfig, showMaskTyped: false });
  }

  // #region FormidableField

  /** The text, unmasked. Empty for no text; a mask decides what else reaches it — see `dropSpecialCharacters`. */
  public readonly value = model('');

  get fieldRef(): ElementRef<HTMLElement> {
    return this.inputRef() as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // #endregion

  // #region Input

  /** The native autofill hint. Off by default, so a form does not leak values a consumer did not ask for. */
  public readonly autocomplete = input<AutoFill>('off');

  /** The native attribute. Reported to the browser and used to sanity-check a `mask`; it does not validate. */
  public readonly minLength = input<number | undefined>(undefined);

  /** The native attribute, which does cap what can be typed. Unset for no cap. */
  public readonly maxLength = input<number | undefined>(undefined);

  // #endregion

  // #region Mask

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
      if ((this.minLength() ?? 0) > max) {
        console.error(
          `[ngx-formidable] <${name}>: minlength=${this.minLength()} exceeds mask's max display length=${max} (mask="${mask}", prefix="${prefix ?? ''}", suffix="${suffix ?? ''}").`
        );
      }
      if ((this.maxLength() ?? Infinity) < min) {
        console.error(
          `[ngx-formidable] <${name}>: maxlength=${this.maxLength()} is below mask's min display length=${min} (mask="${mask}", prefix="${prefix ?? ''}", suffix="${suffix ?? ''}").`
        );
      }
    } else {
      // Optional: gentle heads-up for variable masks
      if (this.minLength() !== undefined || this.maxLength() !== undefined) {
        console.warn(
          `[ngx-formidable] <${name}>: mask "${mask}" has variable length; exact comparison with minlength/maxlength is not deterministic.`
        );
      }
    }
  }

  // #endregion
}
