import { Component, computed, inject, signal } from '@angular/core';
import { Accordion } from '../../chrome/accordion/accordion';
import { MARKUP_NOTE_LABELS, MarkupParseResult, parseMarkup } from '../../export/markup-parser';
import { serializeComponent } from '../../export/component-serializer';
import { serializeAppConfig } from '../../export/config-serializer';
import { serializeDefinition } from '../../export/markup-serializer';
import { serializeSchema } from '../../export/schema-serializer';
import { copyText } from '../../helpers/clipboard.helpers';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { ExportDirection, InspectorStore } from '../../state/inspector.store';

/** The four files the form half generates. */
type Output = 'template' | 'component' | 'schema' | 'config';

const OUTPUTS: readonly { id: Output; label: string; help: string }[] = [
  {
    id: 'template',
    label: 'Template',
    help: 'my-form.html. Every field, bound by [formField] to the form that Component holds.'
  },
  {
    id: 'component',
    label: 'Component',
    help: 'my-form.ts. The model, the form over it, and the handlers the template binds.'
  },
  {
    id: 'schema',
    label: 'Schema',
    help: 'my-form.form.ts. The model’s type, its initial value, and the rules: each field’s state, limits and condition, and your validation.'
  },
  {
    id: 'config',
    label: 'App Config',
    help: 'app.config.ts. The app defaults from Settings ▸ App Defaults. The template leaves out whatever these supply, so take both. Not read back in: it belongs to the app, not the form.'
  }
];

/**
 * The Form half: the template the configuration produces, the component and the schema it binds to, the
 * app config whose defaults the template leaves out, and a way to read a template back.
 *
 * An Angular production build contains no template compiler, so pasted markup cannot become live
 * components. The configuration is the source of truth: all four are derived from it, read-only, and an
 * import is parsed back into it. Only the template is read back — what the component and the schema hold
 * is reported as left behind, and the app config is the app's rather than the form's.
 *
 * The four are tabs, one showing at a time: stacked, they were screens of code with the import below all
 * of them. Out and back in are an accordion each, the same two the theme half has, so the area
 * reads the same whichever half is showing.
 */
@Component({
  selector: 'portal-markup-panel',
  templateUrl: './markup-panel.html',
  styleUrl: './markup-panel.scss',
  imports: [Accordion]
})
export class MarkupPanel {
  private readonly store = inject(FormDefinitionStore);
  private readonly inspector = inject(InspectorStore);
  protected readonly noteLabels = MARKUP_NOTE_LABELS;
  protected readonly outputs = OUTPUTS;

  protected readonly output = signal<Output>('template');
  protected readonly current = computed(() => OUTPUTS.find((entry) => entry.id === this.output())!);

  protected readonly importText = signal('');
  protected readonly importResult = signal<MarkupParseResult | null>(null);
  protected readonly justCopied = signal(false);

  /** Only the file on screen is serialized: the others are a function of the same stores, on demand. */
  protected readonly text = computed(() => {
    switch (this.output()) {
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

  protected readonly fieldCount = computed(() => this.store.fields().length);

  protected isOpen(direction: ExportDirection): boolean {
    return this.inspector.exportDirection() === direction;
  }

  protected toggle(direction: ExportDirection): void {
    this.inspector.exportDirection.update((current) => (current === direction ? null : direction));
  }

  protected copy(): Promise<void> {
    return copyText(this.text(), this.justCopied);
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
