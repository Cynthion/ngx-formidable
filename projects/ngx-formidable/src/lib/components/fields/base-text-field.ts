import {
  afterRenderEffect,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  untracked,
  viewChild
} from '@angular/core';
import { NgxMaskConfig, NgxMaskPipe } from 'ngx-mask';
import { replaceText } from '../../helpers/input.helpers';
import {
  analyzeMaskDisplayLength,
  DEFAULT_PATTERNS,
  DEFAULT_PLACEHOLDER_CHARACTER,
  DEFAULT_SPECIAL_CHARACTERS,
  isPlaceholderAmbiguous,
  MaskConfigSubset
} from '../../helpers/mask.helpers';
import { FieldDecoratorLayout, FORMIDABLE_MASK_DEFAULTS } from '../../models/formidable.model';
import { BaseField } from './base-field';

const LIBRARY_MASK_DEFAULTS: Required<MaskConfigSubset> = {
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

/**
 * The base class behind `input-field` and `textarea-field`: free text, optionally masked through ngx-mask,
 * with the native length and autofill attributes. The two differ only in their editor.
 */
@Directive()
export abstract class BaseTextField extends BaseField<string> {
  private readonly maskPipe = inject(NgxMaskPipe);
  private readonly maskDefaults = inject<Partial<NgxMaskConfig>>(FORMIDABLE_MASK_DEFAULTS, { optional: true });

  // Names an unnamed field in a warning after its element, `formidable-input-field` say.
  private readonly tagName: string = inject(ElementRef).nativeElement.localName;

  // The `input` or `textarea`, from whichever of the template's two branches renders: masked or not.
  readonly editorRef = viewChild.required<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('editorRef');

  protected keyboardCallback = null;
  protected registeredKeys: string[] = [];

  constructor() {
    super();

    effect(() => this.warnAboutMaskConfig());

    // Renders the model, and renders it again under a changed mask — a changed mask also swaps the element.
    // What the element already stands for is left alone, so typing keeps its caret.
    afterRenderEffect(() => {
      const value = this.value() ?? '';

      this.mask();
      this.mergedMaskConfig();

      untracked(() => this.render(value));
    });
  }

  /** The model, as the user edits it: what the element shows, with the mask's characters taken out. */
  protected onInput(): void {
    this.setValue(this.editorValue);
    this.onTextChanged();
  }

  // Runs after every change to the editor's text, the user's or the field's own. A masked render lands in
  // a timer no render owns, so this is the one point that sees it.
  protected onTextChanged(): void {
    // Nothing by default.
  }

  private render(value: string): void {
    if (this.editorValue === value) return;

    if (!this.mask()) {
      this.replaceText(value);
      return;
    }

    // Waits for the ngxMask directive to initialize on the control, which it does across a full task — a
    // microtask would land before it and the value would be written unmasked.
    setTimeout(() => this.replaceText(this.maskPipe.transform(value, this.mask()!, this.mergedMaskConfig())));
  }

  private replaceText(text: string): void {
    replaceText(this.editorRef().nativeElement, text);
    this.onTextChanged();
  }

  protected get editorValue(): string {
    const text = this.editorRef().nativeElement.value;

    if (!this.mask()) return text;

    // remove mask characters if mask is applied
    return this.maskPipe.transform(text, this.mask()!, { ...this.mergedMaskConfig(), showMaskTyped: false });
  }

  // #region FormidableField

  /** The text, unmasked. Empty for no text; a mask decides what else reaches it — see `dropSpecialCharacters`. */
  public readonly value = model('');

  get fieldRef(): ElementRef<HTMLElement> {
    return this.editorRef();
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

  // The mask config in force: the library's defaults, then `FORMIDABLE_MASK_DEFAULTS`, then `maskConfig`.
  protected readonly mergedMaskConfig = computed(
    () =>
      ({
        ...LIBRARY_MASK_DEFAULTS,
        ...(this.maskDefaults ?? {}),
        ...(this.maskConfig() ?? {})
      }) as Required<MaskConfigSubset>
  );

  // Only a mask that renders its slots while empty occupies the value area.
  protected override readonly showsEmptyValueHint = computed(
    () => !!this.mask() && this.mergedMaskConfig().showMaskTyped
  );

  protected override get maskPlaceholderCharacter(): string {
    return this.mergedMaskConfig().placeHolderCharacter;
  }

  private warnAboutMaskConfig(): void {
    const mask = this.mask();
    if (!mask) return;

    const config = this.mergedMaskConfig();
    const name = this.name() || this.tagName;

    if (isPlaceholderAmbiguous(mask, config)) {
      console.warn(
        `[ngx-formidable] <${name}>: placeHolderCharacter "${config.placeHolderCharacter}" ` +
          `can also appear as content under this mask, so the field cannot tell a filled position from an ` +
          `empty one. Set a placeHolderCharacter the mask cannot produce.`
      );
    }

    const { prefix, suffix } = config;
    const { min, max, variable } = analyzeMaskDisplayLength(mask, { prefix, suffix });

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
