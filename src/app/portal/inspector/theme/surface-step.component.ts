import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { contrastRatio, formatRatio, toHex } from '../../helpers/color.helpers';
import { ThemeStore } from '../../state/theme.store';

/**
 * Step 4: the page behind the form.
 *
 * The library styles fields and never the surface they sit on, so this is the consumer's and is exported as a
 * separately commented block — the distinction between what the library styles and what the consumer styles
 * is the most confusable thing on the page.
 */
@Component({
  selector: 'portal-surface-step',
  templateUrl: './surface-step.component.html',
  styleUrl: './surface-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SurfaceStepComponent {
  protected readonly theme = inject(ThemeStore);

  protected readonly backgroundHex = computed(() => this.hexOf(this.theme.page().background));
  protected readonly textHex = computed(() => this.hexOf(this.theme.page().text));

  /** The page's own text against the page's own fill, which no library variable covers. */
  protected readonly pageContrast = computed(() => {
    const background = this.theme.resolveColorValue(this.theme.page().background);
    const text = this.theme.resolveColorValue(this.theme.page().text);

    if (!background || !text) return null;

    const ratio = contrastRatio(text, background);

    return { ratio: formatRatio(ratio), passes: ratio >= 4.5 };
  });

  protected setBackground(value: string): void {
    this.theme.page.update((page) => ({ ...page, background: value }));
  }

  protected setText(value: string): void {
    this.theme.page.update((page) => ({ ...page, text: value }));
  }

  /** A page a shade away from the field fill, which is what most consumer pages actually are. */
  protected matchTheFieldFill(): void {
    const fill = this.theme.resolvedRgb('--formidable-color-field-background');
    const text = this.theme.resolvedRgb('--formidable-color-field-text');

    if (fill) this.setBackground(toHex(fill));
    if (text) this.setText(toHex(text));
  }

  private hexOf(value: string): string {
    const resolved = this.theme.resolveColorValue(value);

    return resolved ? toHex(resolved) : '#ffffff';
  }
}
