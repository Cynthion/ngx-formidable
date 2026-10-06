import { Component, inject, input, signal } from '@angular/core';
import { MARKUP_NOTE_LABELS, MarkupParseResult, parseMarkup } from '../../export/markup-parser';
import { IMPORT_SKIP_LABELS, ThemeImportResult } from '../../export/theme-import';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { ImportFile } from '../../state/inspector.store';
import { ThemeStore } from '../../state/theme.store';
import type { FileTab } from './export-tab';

/**
 * A file exported here, read back in: the theme's block, or the form's template with its schema beside it.
 *
 * What the component holds is reported as left behind, and the app config is the app's rather than the
 * form's. Each file keeps its own boxes and report, so switching between the two loses neither.
 */
@Component({
  selector: 'portal-import-panel',
  templateUrl: './import-panel.html',
  styleUrl: './import-panel.scss'
})
export class ImportPanel {
  /** The file on screen. */
  public readonly file = input.required<FileTab<ImportFile>>();

  private readonly theme = inject(ThemeStore);
  private readonly store = inject(FormDefinitionStore);
  protected readonly skipLabels = IMPORT_SKIP_LABELS;
  protected readonly noteLabels = MARKUP_NOTE_LABELS;

  protected readonly themeText = signal('');
  protected readonly themeResult = signal<ThemeImportResult | null>(null);

  /**
   * On, because the export states the delta: read back onto the library's own defaults, a block reproduces
   * the theme it came from. Off is for merging a snippet into the theme on screen.
   */
  protected readonly applyDefaults = signal(true);

  protected readonly templateText = signal('');
  /** Optional: without it, each field comes back without what `[formField]` owns. */
  protected readonly schemaText = signal('');
  protected readonly templateResult = signal<MarkupParseResult | null>(null);

  protected importTheme(): void {
    this.themeResult.set(this.theme.importFrom(this.themeText(), this.applyDefaults()));
  }

  /**
   * Replaces the whole form. Sections come from the comments the serializer writes above each run, and each
   * field's state, limits, required marker and condition from the schema.
   */
  protected importTemplate(): void {
    const result = parseMarkup(this.templateText(), this.schemaText());

    this.templateResult.set(result);

    if (result.fields.length) {
      this.store.replaceForm(result.sections, result.fields);
    }
  }

  protected countOf(result: ThemeImportResult): number {
    return Object.keys(result.vars).length;
  }
}
