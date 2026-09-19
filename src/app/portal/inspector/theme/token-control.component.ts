import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { isGradient, toHex } from '../../helpers/color.helpers';
import { ThemeToken } from '../../model/token-manifest.model';
import { ThemeStore } from '../../state/theme.store';

const LENGTH_UNITS = ['px', 'rem', 'em', '%', 'dvh', 'vh', 'vw', 'ch'] as const;
const FONT_WEIGHTS = ['300', '400', '500', '600', '700', '800'] as const;
const EASINGS = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'cubic-bezier(0.4, 0, 0.2, 1)'] as const;

/** A length split into its number and its unit, so the editor can never emit a unitless zero. */
interface Length {
  readonly amount: string;
  readonly unit: string;
}

/**
 * One variable's editor, chosen by the manifest's control type rather than inferred from the value.
 *
 * A derived variable renders as following its base, with a link to it. Editing one pins it, which
 * `user/theming.md` advises against — so the control states the consequence rather than hiding itself.
 */
@Component({
  selector: 'portal-token-control',
  templateUrl: './token-control.component.html',
  styleUrl: './token-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TokenControlComponent {
  protected readonly theme = inject(ThemeStore);

  public readonly token = input.required<ThemeToken>();
  /** Hides the description, for the dense seed lists where the step's own text already says it. */
  public readonly compact = input(false);

  /** Asks the editor to scroll to and highlight the base a derived variable follows. */
  public readonly baseRequested = output<string>();

  protected readonly units = LENGTH_UNITS;
  protected readonly fontWeights = FONT_WEIGHTS;
  protected readonly easings = EASINGS;

  protected readonly value = computed(() => this.theme.valueOf(this.token().name));
  protected readonly changed = computed(() => this.theme.isChanged(this.token().name));

  protected readonly length = computed<Length | null>(() => {
    const match = this.value()
      .trim()
      .match(/^(-?\d*\.?\d+)([a-z%]*)$/i);

    if (!match) return null;

    return { amount: match[1]!, unit: match[2] || 'px' };
  });

  protected readonly hex = computed(() => {
    const resolved = this.theme.resolveColorValue(this.value());

    return resolved ? toHex(resolved) : '#000000';
  });

  /** The last value a colour well refused, so the control can say why it did not take. */
  protected readonly rejected = signal<string | null>(null);

  /** A derived variable that the user has not pinned is still following its base. */
  protected readonly following = computed(() => {
    const base = this.token().derivedFrom;

    return base && !this.changed() ? base : null;
  });

  /**
   * A colour well accepts colours only. A `linear-gradient()` is not a `<color>`, and these values feed
   * `color-mix()` in half a dozen derived variables, so one would invalidate all of them — the control
   * refuses it rather than applying something that half-paints.
   */
  protected set(value: string): void {
    if (this.token().control === 'color' && isGradient(value)) {
      this.rejected.set(value);

      return;
    }

    this.rejected.set(null);
    this.theme.setVariable(this.token().name, value);
  }

  protected setLength(amount: string, unit: string): void {
    const numeric = amount.trim() === '' ? '0' : amount.trim();

    // Units are mandatory: a unitless `0` is a `<number>` in `calc()`, not a `<length>`, and silently
    // invalidates every declaration derived from it.
    this.set(`${numeric}${unit}`);
  }

  /** One press of the stepper. The unit decides the step, so a radius in `rem` does not jump by whole rems. */
  protected step(direction: 1 | -1): void {
    const parts = this.length();
    if (!parts) return;

    const size = parts.unit === 'rem' || parts.unit === 'em' ? 0.125 : 1;
    const next = Math.round((Number(parts.amount) + direction * size) * 1000) / 1000;

    this.setLength(String(next), parts.unit);
  }

  protected reset(): void {
    this.theme.clearVariable(this.token().name);
  }

  protected goToBase(): void {
    const base = this.token().derivedFrom;

    if (base) this.baseRequested.emit(base);
  }
}
