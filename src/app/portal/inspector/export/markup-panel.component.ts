import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AccordionComponent } from '../../chrome/accordion/accordion.component';
import { MARKUP_NOTE_LABELS, MarkupParseResult, parseMarkup } from '../../export/markup-parser';
import { serializeComponent } from '../../export/component-serializer';
import { serializeAppConfig } from '../../export/config-serializer';
import { serializeDefinition } from '../../export/markup-serializer';
import { copyText } from '../../helpers/clipboard.helpers';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { ExportDirection, InspectorStore } from '../../state/inspector.store';

/**
 * The Form half: the template the configuration produces, a component for it to bind to, the app config
 * whose defaults the template leaves out, and a way to read a template back.
 *
 * An Angular production build contains no template compiler, so pasted markup cannot become live
 * components. The configuration is the source of truth: both are derived from it, read-only, and an import
 * is parsed back into it. Only the template is read back — the component holds nothing the Studio configures,
 * and the app config is the app's rather than the form's.
 *
 * Out and back in are an accordion each, the same two the theme half has, so the area reads the same
 * whichever half is showing.
 */
@Component({
  selector: 'portal-markup-panel',
  templateUrl: './markup-panel.component.html',
  styleUrl: './markup-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionComponent]
})
export class MarkupPanelComponent {
  protected readonly store = inject(FormDefinitionStore);
  private readonly inspector = inject(InspectorStore);
  protected readonly noteLabels = MARKUP_NOTE_LABELS;

  protected readonly importText = signal('');
  protected readonly importResult = signal<MarkupParseResult | null>(null);
  protected readonly justCopied = signal(false);
  protected readonly justCopiedComponent = signal(false);
  protected readonly justCopiedConfig = signal(false);

  protected readonly markup = computed(() => serializeDefinition(this.store.definition()));
  protected readonly component = computed(() => serializeComponent(this.store.definition()));
  protected readonly appConfig = computed(() => serializeAppConfig(this.store.appDefaults()));
  protected readonly fieldCount = computed(() => this.store.fields().length);

  protected isOpen(direction: ExportDirection): boolean {
    return this.inspector.exportDirection() === direction;
  }

  protected toggle(direction: ExportDirection): void {
    this.inspector.exportDirection.update((current) => (current === direction ? null : direction));
  }

  protected copy(): Promise<void> {
    return copyText(this.markup(), this.justCopied);
  }

  protected copyComponent(): Promise<void> {
    return copyText(this.component(), this.justCopiedComponent);
  }

  protected copyConfig(): Promise<void> {
    return copyText(this.appConfig(), this.justCopiedConfig);
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
