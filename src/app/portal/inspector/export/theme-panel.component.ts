import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AccordionComponent } from '../../chrome/accordion/accordion.component';
import { ThemeExportFormat } from '../../export/theme-export';
import { IMPORT_SKIP_LABELS, ThemeImportResult } from '../../export/theme-import';
import { copyText } from '../../helpers/clipboard.helpers';
import { ExportDirection, InspectorStore } from '../../state/inspector.store';
import { ThemeStore } from '../../state/theme.store';

/**
 * The theme, as the block a consumer pastes. The copy button in the top bar copies the same text with no
 * intermediate dialog; this is where its options live and where a pasted block comes back in.
 *
 * Out and back in are an accordion each, the same two the markup half has, so the area reads the same
 * whichever half is showing. Which is open lives in the inspector store, because the structure editor opens
 * the markup half at its import and a panel's own state is not something it can reach.
 */
@Component({
  selector: 'portal-theme-panel',
  templateUrl: './theme-panel.component.html',
  styleUrl: './theme-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionComponent]
})
export class ThemePanelComponent {
  protected readonly theme = inject(ThemeStore);
  private readonly inspector = inject(InspectorStore);
  protected readonly skipLabels = IMPORT_SKIP_LABELS;

  protected isOpen(direction: ExportDirection): boolean {
    return this.inspector.exportDirection() === direction;
  }

  protected toggle(direction: ExportDirection): void {
    this.inspector.exportDirection.update((current) => (current === direction ? null : direction));
  }

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

  protected copy(): Promise<void> {
    return copyText(this.theme.exportText(), this.justCopied);
  }

  protected runImport(): void {
    this.importResult.set(this.theme.importFrom(this.importText()));
  }

  protected countOf(result: ThemeImportResult): number {
    return Object.keys(result.vars).length;
  }
}
