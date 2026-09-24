import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { COLOR_SCHEMES, COLOR_SEEDS, DARK_FILL_COMPANIONS } from '../../model/schemes';
import { THEME_TOKENS_BY_NAME } from '../../model/token-manifest';
import { ThemeToken } from '../../model/token-manifest.model';
import { ThemeStore } from '../../state/theme.store';
import { ContrastBadgesComponent } from './contrast-badges.component';
import { TokenControlComponent } from './token-control.component';

/**
 * Step 2: the eight colour seeds. Set these and the rest of the library follows, which is the
 * "override the base, not the derivative" rule made operable.
 */
@Component({
  selector: 'portal-seeds-step',
  templateUrl: './seeds-step.component.html',
  styleUrl: './seeds-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TokenControlComponent, ContrastBadgesComponent]
})
export class SeedsStepComponent {
  protected readonly theme = inject(ThemeStore);

  public readonly baseRequested = output<string>();

  protected readonly seeds = computed<ThemeToken[]>(() =>
    COLOR_SEEDS.map((name) => THEME_TOKENS_BY_NAME.get(name)).filter((token): token is ThemeToken => !!token)
  );

  protected readonly companions = computed<ThemeToken[]>(() =>
    DARK_FILL_COMPANIONS.map((name) => THEME_TOKENS_BY_NAME.get(name)).filter((token): token is ThemeToken => !!token)
  );

  protected readonly companionsPinned = computed(() =>
    DARK_FILL_COMPANIONS.every((name) => this.theme.isChanged(name))
  );

  /** Takes the four values the seeds cannot derive from the shipped dark scheme, which already states them. */
  protected applyDarkCompanions(): void {
    const dark = COLOR_SCHEMES.midnight;

    this.theme.setVariables(
      Object.fromEntries(DARK_FILL_COMPANIONS.map((name) => [name, dark[name] ?? this.theme.valueOf(name)]))
    );
  }
}
