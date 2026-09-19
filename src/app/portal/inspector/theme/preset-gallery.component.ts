import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FieldDecoratorComponent, FieldLabelDirective, InputFieldComponent } from '@cynthion/ngx-formidable';
import { ThemeScopeDirective } from '../../chrome/theme-scope.directive';
import { FONT_OPTIONS, THEME_PRESETS, ThemePreset } from '../../model/presets';
import {
  COLOR_SCHEME_META,
  COLOR_SCHEMES,
  ColorKey,
  GEOMETRY_SCHEME_META,
  GEOMETRY_SCHEMES,
  GeometryKey
} from '../../model/schemes';
import { ThemeStore } from '../../state/theme.store';

/**
 * The named looks a cold visitor clicks first, each a live miniature of a real field — the fastest evidence
 * that the library is not a one-colour library.
 *
 * The two axes the presets are built from stay selectable on their own behind a disclosure: a preset is a
 * starting point, not a mode.
 */
@Component({
  selector: 'portal-preset-gallery',
  templateUrl: './preset-gallery.component.html',
  styleUrl: './preset-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThemeScopeDirective, FieldDecoratorComponent, FieldLabelDirective, InputFieldComponent]
})
export class PresetGalleryComponent {
  protected readonly theme = inject(ThemeStore);

  protected readonly presets = THEME_PRESETS;
  protected readonly geometries = GEOMETRY_SCHEME_META;
  protected readonly colors = COLOR_SCHEME_META;

  protected readonly axesOpen = signal(false);

  protected readonly thumbnails = computed(() =>
    this.presets.map((preset) => ({
      preset,
      vars: { ...GEOMETRY_SCHEMES[preset.geometry], ...COLOR_SCHEMES[preset.color] }
    }))
  );

  protected apply(preset: ThemePreset): void {
    this.theme.applyPreset(preset);
  }

  protected setGeometry(key: string): void {
    this.theme.setGeometry(key as GeometryKey);
  }

  protected setColor(key: string): void {
    this.theme.setColor(key as ColorKey);
  }

  /**
   * A starting point nobody would have picked. The two axes are independent, so any pair is valid — which is
   * the claim the presets make, made testable by the visitor in one click.
   */
  protected randomize(): void {
    const geometry = pick(this.geometries).key;
    const color = pick(this.colors).key;
    const font = pick(FONT_OPTIONS);

    this.theme.randomize(geometry, color, font.stack);
  }
}

function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)]!;
}
