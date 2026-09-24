import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { BORDERLESS_COMPANIONS, SHAPE_SEEDS } from '../../model/schemes';
import { THEME_TOKENS_BY_NAME } from '../../model/token-manifest';
import { ThemeToken } from '../../model/token-manifest.model';
import { ThemeStore } from '../../state/theme.store';
import { TokenControlComponent } from './token-control.component';

const CORNERS: readonly string[] = [
  '--formidable-field-border-start-start-radius',
  '--formidable-field-border-start-end-radius',
  '--formidable-field-border-end-end-radius',
  '--formidable-field-border-end-start-radius'
];

/**
 * Step 3: the four lengths that reshape the field, plus the per-corner radii the asymmetric shapes need.
 *
 * Dropping the field border to `0px` also erases five lengths that are not the field's border at all, so the
 * notice names them and restores them rather than leaving the user to find the missing chrome.
 */
@Component({
  selector: 'portal-shape-step',
  templateUrl: './shape-step.component.html',
  styleUrl: './shape-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TokenControlComponent]
})
export class ShapeStepComponent {
  protected readonly theme = inject(ThemeStore);

  public readonly baseRequested = output<string>();

  protected readonly shape = computed(() => this.tokensOf(SHAPE_SEEDS));
  protected readonly corners = computed(() => this.tokensOf(CORNERS));
  protected readonly companions = computed(() => this.tokensOf(BORDERLESS_COMPANIONS));

  protected readonly companionsRestored = computed(() =>
    BORDERLESS_COMPANIONS.every((name) => this.theme.isChanged(name))
  );

  /** `44px` is the floor for the inside label positions — below it the field overflows its own box. */
  protected readonly belowHeightFloor = computed(() => {
    const height = parseFloat(this.theme.valueOf('--formidable-field-height'));

    return Number.isFinite(height) && height < 44;
  });

  protected restoreCompanions(): void {
    this.theme.setVariables(Object.fromEntries(BORDERLESS_COMPANIONS.map((name) => [name, '1px'])));
  }

  private tokensOf(names: readonly string[]): ThemeToken[] {
    return names.map((name) => THEME_TOKENS_BY_NAME.get(name)).filter((token): token is ThemeToken => !!token);
  }
}
