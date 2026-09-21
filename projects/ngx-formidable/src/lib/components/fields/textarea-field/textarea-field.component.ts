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
import { keepClickedCaret, placeCaretAtNextSlot, replaceText } from '../../../helpers/input.helpers';
import {
  analyzeMaskDisplayLength,
  DEFAULT_PATTERNS,
  DEFAULT_SPECIAL_CHARACTERS,
  MaskConfigSubset
} from '../../../helpers/mask.helpers';
import { onSignalChange } from '../../../helpers/utility.helpers';
import {
  FieldDecoratorLayout,
  FieldValueAlignment,
  FORMIDABLE_FIELD,
  FORMIDABLE_MASK_DEFAULTS,
  IFormidableTextareaField
} from '../../../models/formidable.model';
import { BaseFieldDirective } from '../base-field.directive';

/**
 * A multi-line text input, optionally masked, that can grow with its content (`enableAutosize`) and show a
 * character count against `maxLength` (`showLengthIndicator`). `input-field` is the single-line one.
 *
 * Its box grows downward, so it top-aligns its value and a projected prefix follows that rather than
 * centring.
 */
@Component({
  selector: 'formidable-textarea-field',
  templateUrl: './textarea-field.component.html',
  styleUrls: ['./textarea-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxMaskDirective],
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
export class TextareaFieldComponent extends BaseFieldDirective implements IFormidableTextareaField, AfterViewInit {
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
    this.warnIfMaskConflictsWithMinMax();
  }

  constructor() {
    super();

    onSignalChange(
      () => [this.mask(), this.maskConfig(), this.minLength(), this.maxLength()],
      () => this.warnIfMaskConflictsWithMinMax()
    );

    // Re-applies the formatting the new mask asks for, and resizes to whatever it produced. Separate, so a
    // `minLength` change does not rewrite the value the user is in the middle of typing:
    // ngxMask initialises across a full task, so the value written before that has to be formatted, and measured, again once it has.
    let isFirstPass = true;

    effect(() => {
      this.mask();
      this.maskConfig();

      const firstPass = isFirstPass;
      isFirstPass = false;

      untracked(() =>
        queueMicrotask(() => {
          this.doWriteValue(this.valueToReapply(firstPass));
          this.adjustLayout();
          this.autoResize();
        })
      );
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
    this.autoResize();
  }

  // A masked field takes the caret at the slot the next character fills, so tabbing in lands where typing
  // continues. A pointer overrides it: the browser places the caret from the click after this, and
  // `onMouseUp` is what holds it there.
  protected doOnFocusChange(isFocused: boolean): void {
    const el = this.textareaElement;

    if (isFocused && this.mask() && el) placeCaretAtNextSlot(el);
  }

  /** Keeps the caret where the pointer put it, which ngx-mask pulls back to the end of the typed text. */
  protected onMouseUp(): void {
    const el = this.textareaElement;

    if (el) keepClickedCaret(el, !!this.value);
  }

  // #region ControlValueAccessor

  /** The last value the form wrote in, which the mask effect needs while the element cannot yet hold it. */
  private lastWrittenValue = '';

  protected doWriteValue(value: string): void {
    const newValue = value ?? '';
    const el = this.textareaElement;
    if (!el) return;

    this.lastWrittenValue = newValue;

    if (this.mask()) {
      // Waits for the ngxMask directive to initialize on the control, which it does across a full
      // task — a microtask would land before it and the value would be written unmasked.
      setTimeout(() => {
        const maskedValue = this.maskPipe.transform(newValue, this.mask()!, this.mergedMaskConfig);
        replaceText(el, maskedValue);

        // notify the form control again (since usually done in base directive)
        if (newValue) {
          this.runSilently('correction', () => this.onValueChange());
        }
      });
    } else {
      replaceText(el, newValue);
    }
  }

  // #endregion

  // #region IFormidableField

  get value(): string | null {
    const el = this.textareaElement;
    if (!el) return null;
    const textareaValue = el.value;

    if (this.mask()) {
      // remove mask characters if mask is applied
      const valueNoMaskTyped = this.maskPipe.transform(textareaValue, this.mask()!, {
        ...this.mergedMaskConfig,
        showMaskTyped: false
      });

      return valueNoMaskTyped || null;
    } else {
      return textareaValue || null;
    }
  }

  get fieldRef(): ElementRef<HTMLElement> {
    return (this.mask() ? this.maskedTextareaRef()! : this.plainTextareaRef()!) as ElementRef<HTMLElement>;
  }

  decoratorLayout: FieldDecoratorLayout = 'horizontal';

  // A textarea top-aligns its value and grows as the value does, so a projected prefix/suffix sits on the
  // first line rather than drifting down with the box's middle.
  valueAlignment: FieldValueAlignment = 'top';

  // #endregion

  // #region IFormidableTextareaField

  /** The native autofill hint. Off by default, so a form does not leak values a consumer did not ask for. */
  public readonly autocomplete = input<AutoFill>('off');

  /** The native attribute. Reported to the browser and used to sanity-check a `mask`; it does not validate. */
  public readonly minLength = input(-1);

  /** The native attribute, which does cap what can be typed. `-1` for no cap. */
  public readonly maxLength = input(-1);

  /** Grows the box with the content instead of scrolling it. */
  public readonly enableAutosize = input(true);

  /** Shows the character count below the value, against `maxLength` when there is one. */
  public readonly showLengthIndicator = input(false);

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

  private warnIfMaskConflictsWithMinMax(): void {
    const mask = this.mask();
    if (!mask) return;

    const { prefix, suffix } = this.mergedMaskConfig;
    const { min, max, variable } = analyzeMaskDisplayLength(mask, { prefix, suffix });
    const name = this.name() || 'textarea';

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
    // scheduler, so the timer is not queued behind a pass: `ngAfterViewInit` runs inside one, and the mask
    // effect's microtask reads padding off DOM `doWriteValue` wrote directly. A timer is what clears both.
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
