import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MARKUP_NOTE_LABELS, MarkupParseResult, parseMarkup } from '../../export/markup-parser';
import { serializeDefinition } from '../../export/markup-serializer';
import { FormDefinitionStore } from '../../state/form-definition.store';

/**
 * The template the configuration produces, and a way to read one back.
 *
 * An Angular production build contains no template compiler, so pasted markup cannot become live
 * components. The configuration is the source of truth: this is derived from it, read-only, and an import
 * is parsed back into it.
 */
@Component({
  selector: 'portal-markup-panel',
  templateUrl: './markup-panel.component.html',
  styleUrl: './markup-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarkupPanelComponent {
  protected readonly store = inject(FormDefinitionStore);
  protected readonly noteLabels = MARKUP_NOTE_LABELS;

  protected readonly importText = signal('');
  protected readonly importResult = signal<MarkupParseResult | null>(null);
  protected readonly justCopied = signal(false);

  protected readonly markup = computed(() => serializeDefinition(this.store.definition()));

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.markup());
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 1600);
    } catch {
      // The markup is on screen to select.
    }
  }

  /** Replaces the whole form. Sections come from the comments the serializer writes above each run. */
  protected runImport(): void {
    const result = parseMarkup(this.importText());

    this.importResult.set(result);

    if (result.fields.length) {
      this.store.replaceForm(result.sections, result.fields);
    }
  }
}
