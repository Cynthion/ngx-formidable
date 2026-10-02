import { Component, computed, inject, input, signal } from '@angular/core';
import { serializeComponent } from '../../export/component-serializer';
import { serializeAppConfig } from '../../export/config-serializer';
import { serializeDefinition } from '../../export/markup-serializer';
import { serializeSchema } from '../../export/schema-serializer';
import { ThemeExportFormat } from '../../export/theme-export';
import { copyText } from '../../helpers/clipboard.helpers';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { ExportFile } from '../../state/inspector.store';
import { ThemeStore } from '../../state/theme.store';
import type { FileTab } from './export-tab';

/**
 * One file the Studio produces, read-only, and its copy: the theme as the block a consumer pastes, or one of
 * the four files the form is.
 *
 * An Angular production build contains no template compiler, so the configuration is the source of truth:
 * every file is derived from the stores, and none can disagree with what is on the stage. The top bar's copy
 * button copies the same theme text with no intermediate dialog; this is where its options live.
 */
@Component({
  selector: 'portal-export-panel',
  templateUrl: './export-panel.html',
  styleUrl: './export-panel.scss'
})
export class ExportPanel {
  /** The file on screen. */
  public readonly file = input.required<FileTab<ExportFile>>();

  protected readonly theme = inject(ThemeStore);
  private readonly store = inject(FormDefinitionStore);

  protected readonly justCopied = signal(false);

  /** Only the file on screen is serialized: the others are a function of the same stores, on demand. */
  protected readonly text = computed(() => {
    switch (this.file().id) {
      case 'theme':
        return this.theme.exportText();
      case 'component':
        return serializeComponent(this.store.definition());
      case 'schema':
        return serializeSchema(this.store.definition());
      case 'config':
        return serializeAppConfig(this.store.appDefaults());
      default:
        return serializeDefinition(this.store.definition());
    }
  });

  protected setFormat(format: string): void {
    this.theme.exportOptions.update((options) => ({ ...options, format: format as ThemeExportFormat }));
  }

  protected setIncludePageSurface(on: boolean): void {
    this.theme.exportOptions.update((options) => ({ ...options, includePageSurface: on }));
  }

  protected setIncludeComments(on: boolean): void {
    this.theme.exportOptions.update((options) => ({ ...options, includeComments: on }));
  }

  protected setIncludeDefaults(on: boolean): void {
    this.theme.exportOptions.update((options) => ({ ...options, includeDefaults: on }));
  }

  protected copy(): Promise<void> {
    return copyText(this.text(), this.justCopied);
  }
}
