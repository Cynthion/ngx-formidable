import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ThemeExportFormat } from '../../export/theme-export';
import { IMPORT_SKIP_LABELS, ThemeImportResult } from '../../export/theme-import';
import { ThemeStore } from '../../state/theme.store';

/**
 * The theme, as the block a consumer pastes. The copy button in the top bar copies the same text with no
 * intermediate dialog; this is where its options live and where a pasted block comes back in.
 */
@Component({
  selector: 'portal-theme-panel',
  templateUrl: './theme-panel.component.html',
  styleUrl: './theme-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemePanelComponent {
  protected readonly theme = inject(ThemeStore);
  protected readonly skipLabels = IMPORT_SKIP_LABELS;

  protected readonly importText = signal('');
  protected readonly importResult = signal<ThemeImportResult | null>(null);
  protected readonly justCopied = signal(false);

  protected setFormat(format: string): void {
    this.theme.exportOptions.update((options) => ({ ...options, format: format as ThemeExportFormat }));
  }

  protected setIncludePageSurface(on: boolean): void {
    this.theme.exportOptions.update((options) => ({ ...options, includePageSurface: on }));
  }

  protected setIncludeComments(on: boolean): void {
    this.theme.exportOptions.update((options) => ({ ...options, includeComments: on }));
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.theme.exportText());
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 1600);
    } catch {
      // The text is on screen to select; a denied clipboard needs no dialog.
    }
  }

  protected runImport(): void {
    this.importResult.set(this.theme.importFrom(this.importText()));
  }

  protected countOf(result: ThemeImportResult): number {
    return Object.keys(result.vars).length;
  }
}
