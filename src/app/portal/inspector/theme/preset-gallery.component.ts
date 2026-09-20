import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FieldDecoratorComponent, FieldLabelDirective, InputFieldComponent } from '@cynthion/ngx-formidable';
import { SelectedValueDirective } from '../../chrome/selected-value.directive';
import { ThemeScopeDirective } from '../../chrome/theme-scope.directive';
import { FONT_OPTIONS, THEME_PRESETS, ThemePreset } from '../../model/presets';
import {
  COLOR_SCHEME_META,
  COLOR_SCHEMES,
  ColorKey,
  GEOMETRY_SCHEME_META,
  GEOMETRY_SCHEMES,
  GeometryKey,
  USE_SITE_VARS
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
  imports: [
    ThemeScopeDirective,
    FieldDecoratorComponent,
    FieldLabelDirective,
    InputFieldComponent,
    SelectedValueDirective
  ]
})
export class PresetGalleryComponent {
  protected readonly theme = inject(ThemeStore);

  protected readonly presets = THEME_PRESETS;
  protected readonly geometries = GEOMETRY_SCHEME_META;
  protected readonly colors = COLOR_SCHEME_META;

  protected readonly axesOpen = signal(false);

  /**
   * A thumbnail states its theme in full, including the variables it does *not* want. The ones the library
   * declares nowhere are inherited from the `:root` theme the user is editing, so a thumbnail that stays
   * silent about them repaints whenever another preset is applied. `initial` is the guaranteed-invalid
   * value: the use site falls back to what it would have used had nobody set the variable at all.
   */
  protected readonly thumbnails = this.presets.map((preset) => ({
    preset,
    vars: {
      ...Object.fromEntries(USE_SITE_VARS.map((name) => [name, 'initial'])),
      ...GEOMETRY_SCHEMES[preset.geometry],
      ...COLOR_SCHEMES[preset.color]
    }
  }));

  protected apply(preset: ThemePreset): void {
    this.theme.applyPreset(preset);
  }

  protected setGeometry(key: string): void {
    this.theme.setGeometry(key as GeometryKey);
  }

  protected setColor(key: string): void {
    this.theme.setColor(key as ColorKey);
  }

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
