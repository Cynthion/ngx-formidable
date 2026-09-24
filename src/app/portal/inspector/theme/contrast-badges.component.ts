import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatRatio } from '../../helpers/color.helpers';
import { ThemeStore } from '../../state/theme.store';

/**
 * The live ratio of each seed that carries a documented contrast obligation, against the current fill.
 *
 * Part of the theme editor rather than the accessibility view, because it is here that it prevents an
 * inaccessible theme from being exported at all.
 */
@Component({
  selector: 'portal-contrast-badges',
  templateUrl: './contrast-badges.component.html',
  styleUrl: './contrast-badges.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContrastBadgesComponent {
  protected readonly theme = inject(ThemeStore);
  protected readonly format = formatRatio;
}
