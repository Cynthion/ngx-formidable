import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FONT_OPTIONS } from '../../model/presets';
import { THEME_TOKENS_BY_NAME } from '../../model/token-manifest';
import { ThemeToken } from '../../model/token-manifest.model';
import { ThemeStore } from '../../state/theme.store';
import { TokenControlComponent } from './token-control.component';

const TYPE_TOKENS: readonly string[] = [
  '--formidable-field-font-size',
  '--formidable-field-font-weight',
  '--formidable-field-line-height',
  '--formidable-label-floating-font-size',
  '--formidable-field-hint-font-size',
  '--formidable-field-validation-error-font-size'
];

/**
 * Step 5: the family, and the size, weight and line height the library does expose.
 *
 * The library exposes no font-family token — every field takes the host page's family through
 * `font: inherit` — so the portal writes `font-family` to `:root` beside the tokens and exports it as an
 * ordinary declaration. Adding a family token is a public API change and is filed in `impl/backlog.md`.
 *
 * The families are stacks over faces the platform already has, not fetched or bundled files: the deploy is
 * static and must work offline and behind a proxy, and a fetched family adds a third-party origin and a flash
 * of unstyled text that undoes the instant repaint the presets exist to demonstrate.
 */
@Component({
  selector: 'portal-fonts-step',
  templateUrl: './fonts-step.component.html',
  styleUrl: './fonts-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TokenControlComponent]
})
export class FontsStepComponent {
  protected readonly theme = inject(ThemeStore);

  protected readonly fonts = FONT_OPTIONS;

  protected readonly typeTokens = computed<ThemeToken[]>(() =>
    TYPE_TOKENS.map((name) => THEME_TOKENS_BY_NAME.get(name)).filter((token): token is ThemeToken => !!token)
  );

  protected readonly activeKey = computed(() => {
    const current = this.theme.fontFamily();

    return this.fonts.find((font) => font.stack === current)?.key ?? null;
  });

  protected setFamily(stack: string): void {
    this.theme.fontFamily.set(stack);
  }
}
