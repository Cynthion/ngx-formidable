import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FONT_FAMILY_TOKEN, FONT_OPTIONS } from '../../model/presets';
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
 * Step 5: the family, size, weight and line height.
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

  protected readonly familyToken = THEME_TOKENS_BY_NAME.get(FONT_FAMILY_TOKEN)!;

  protected readonly typeTokens = computed<ThemeToken[]>(() =>
    TYPE_TOKENS.map((name) => THEME_TOKENS_BY_NAME.get(name)).filter((token): token is ThemeToken => !!token)
  );

  protected readonly activeKey = computed(() => {
    const current = this.theme.valueOf(FONT_FAMILY_TOKEN);

    return this.fonts.find((font) => font.stack === current)?.key ?? null;
  });

  protected setFamily(stack: string): void {
    this.theme.setVariable(FONT_FAMILY_TOKEN, stack);
  }
}
