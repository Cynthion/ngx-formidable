import { Component, computed, inject, input, signal } from '@angular/core';
import { ExampleIcon } from '../../../example-icon/example-icon';
import { COPIED_SVG, COPY_SVG } from '../../docs/doc-icons';
import { serializeComponent } from '../../export/component-serializer';
import { serializeAppConfig } from '../../export/config-serializer';
import { serializeDefinition } from '../../export/markup-serializer';
import { serializeSchema } from '../../export/schema-serializer';
import { ThemeExportFormat } from '../../export/theme-export';
import { copyText } from '../../helpers/clipboard.helpers';
import { highlightCode } from '../../helpers/highlight.helpers';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { ExportFile } from '../../state/inspector.store';
import { ThemeStore } from '../../state/theme.store';
import type { FileTab } from './export-tab';

/** What each file is called in the consumer's project, as the help under its tab names it. */
const FILE_NAMES: Readonly<Record<Exclude<ExportFile, 'theme'>, string>> = {
  template: 'example-form.html',
  component: 'example-form.ts',
  schema: 'example.form.ts',
  config: 'app.config.ts'
};

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
  styleUrl: './export-panel.scss',
  imports: [ExampleIcon]
})
export class ExportPanel {
  /** The file on screen. */
  public readonly file = input.required<FileTab<ExportFile>>();

  protected readonly theme = inject(ThemeStore);
  private readonly store = inject(FormDefinitionStore);

  protected readonly justCopied = signal(false);
  protected readonly copySvg = COPY_SVG;
  protected readonly copiedSvg = COPIED_SVG;

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

  /** The theme lands in whichever global stylesheet the project keeps; Angular's own is `styles`. */
  protected readonly fileName = computed(() => {
    const id = this.file().id;

    return id === 'theme' ? `styles.${this.theme.exportOptions().format}` : FILE_NAMES[id];
  });

  /** `scss` reads the CSS block too; the template is HTML, and every other file is TypeScript. */
  protected readonly highlighted = computed(() => {
    const id = this.file().id;

    return highlightCode(this.text(), id === 'theme' ? 'scss' : id === 'template' ? 'xml' : 'typescript');
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
