import {
  afterRenderEffect,
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  signal,
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
import {
  FieldDecoratorLayout,
  FieldValueAlignment,
  FORMIDABLE_FIELD,
  FORMIDABLE_MASK_DEFAULTS
} from '../../../models/formidable.model';
import { BaseField } from '../base-field';

/**
 * A multi-line text input, optionally masked, that can grow with its content (`enableAutosize`) and show a
 * character count against `maxLength` (`showLengthIndicator`). `input-field` is the single-line one.
 *
 * Its box grows downward, so it top-aligns its value and a projected prefix follows that rather than
 * centring.
 */
@Component({
  selector: 'formidable-textarea-field',
  templateUrl: './textarea-field.html',
  styleUrls: ['./textarea-field.scss'],
  imports: [NgxMaskDirective],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: TextareaField
    },
    NgxMaskPipe
  ]
})
export class TextareaField extends BaseField<string> implements AfterViewInit {
  private maskPipe = inject(NgxMaskPipe);
  private maskDefaults = inject<Partial<NgxMaskConfig>>(FORMIDABLE_MASK_DEFAULTS, { optional: true });

  readonly maskedTextareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('maskedTextareaRef');
  readonly plainTextareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('plainTextareaRef');
  readonly lengthIndicatorRef = viewChild<ElementRef<HTMLDivElement>>('lengthIndicatorRef');

  protected keyboardCallback = null;
  protected externalClickCallback = null;
  protected windowResizeScrollCallback = null;
  protected registeredKeys: string[] = [];

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    this.adjustLayout();
    this.warnAboutMaskConfig();
  }

  constructor() {
    super();

    onSignalChange(
      () => [this.mask(), this.maskConfig(), this.minLength(), this.maxLength()],
      () => this.warnAboutMaskConfig()
    );

    // A changed mask swaps the element, which the length indicator aligns with.
    onSignalChange(
      () => [this.mask(), this.maskConfig()],
      () => this.adjustLayout()
    );

    // Renders the model, and renders it again under a changed mask — a changed mask also swaps the element.
    // What the element already stands for is left alone, so typing keeps its caret.
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
    this.valueLength.set(this.editorValue.length);
    this.autoResize();
  }

  // A textarea keeps the browser's own focus behaviour — a caret, and no selection. One keystroke wiping
  // a paragraph is not what a multi-line field should offer, and no browser offers it.
  protected doOnFocusChange(): void {
    // No additional actions needed
  }

  private render(value: string): void {
    const el = this.textareaElement;
    if (!el || this.editorValue === value) return;

    if (!this.mask()) {
      this.replaceText(el, value);
      return;
    }

    // Waits for the ngxMask directive to initialize on the control, which it does across a full task — a
    // microtask would land before it and the value would be written unmasked.
    setTimeout(() => {
      this.replaceText(el, this.maskPipe.transform(value, this.mask()!, this.mergedMaskConfig));
      this.adjustLayout();
    });
  }

  private get editorValue(): string {
    const text = this.textareaElement?.value ?? '';

    if (!this.mask()) return text;

    // remove mask characters if mask is applied
    return this.maskPipe.transform(text, this.mask()!, { ...this.mergedMaskConfig, showMaskTyped: false });
  }

  /**
   * What the length indicator counts: the characters shown, which `maxLength` caps — a mask's included. A
   * signal, because a masked render lands in a timer no render owns.
   */
  protected readonly valueLength = signal(0);

  private replaceText(el: HTMLTextAreaElement, text: string): void {
    replaceText(el, text);
    this.valueLength.set(this.editorValue.length);
    this.autoResize();
  }

  // #region FormidableField

  /** The text, unmasked. Empty for no text; a mask decides what else reaches it — see `dropSpecialCharacters`. */
  public readonly value = model('');

  get fieldRef(): ElementRef<HTMLElement> {
    return (this.mask() ? this.maskedTextareaRef()! : this.plainTextareaRef()!) as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // A textarea top-aligns its value and grows as the value does, so a projected prefix/suffix sits on the
  // first line rather than drifting down with the box's middle.
  valueAlignment: FieldValueAlignment = 'top';

  // #endregion

  // #region Textarea

  /** The native autofill hint. Off by default, so a form does not leak values a consumer did not ask for. */
  public readonly autocomplete = input<AutoFill>('off');

  /** The native attribute. Reported to the browser and used to sanity-check a `mask`; it does not validate. */
  public readonly minLength = input<number | undefined>(undefined);

  /** The native attribute, which does cap what can be typed. Unset for no cap. */
  public readonly maxLength = input<number | undefined>(undefined);

  /** Grows the box with the content instead of scrolling it. */
  public readonly enableAutosize = input(true);

  /** Shows the character count below the value, against `maxLength` when there is one. */
  public readonly showLengthIndicator = input(false);

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
        `[ngx-formidable] <${this.name() || 'textarea'}>: placeHolderCharacter "${this.mergedMaskConfig.placeHolderCharacter}" ` +
          `can also appear as content under this mask, so the field cannot tell a filled position from an ` +
          `empty one. Set a placeHolderCharacter the mask cannot produce.`
      );
    }

    const { prefix, suffix } = this.mergedMaskConfig;
    const { min, max, variable } = analyzeMaskDisplayLength(mask, { prefix, suffix });
    const name = this.name() || 'textarea';

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

  private get textareaElement(): HTMLTextAreaElement | null {
    return (this.mask() ? this.maskedTextareaRef()?.nativeElement : this.plainTextareaRef()?.nativeElement) ?? null;
  }

  // #endregion

  private autoResize(): void {
    if (!this.enableAutosize()) return;

    const el = this.textareaElement;
    if (!el) return;

    el.style.height = 'auto'; // reset height to recalculate
    el.style.height = `${el.scrollHeight}px`;
  }

  private adjustLayout(): void {
    // Reads resolved styles, so it has to wait for the suffix to render. Neither caller notifies the
    // scheduler, so the timer is not queued behind a pass: `ngAfterViewInit` runs inside one, and a masked
    // render reads padding off DOM it wrote directly. A timer is what clears both.
    setTimeout(() => {
      // adjust length indicator, so that it also aligns right even if a suffix is set
      const el = this.textareaElement;
      const indicator = this.lengthIndicatorRef()?.nativeElement;
      if (!el || !indicator) return;
      const style = window.getComputedStyle(el);
      indicator.style.right = style.paddingRight;
    });
  }
}
