import { Component, computed, inject } from '@angular/core';
import { ExportDirection, ExportFile, ImportFile, InspectorStore } from '../../state/inspector.store';
import { SubTab, SubTabs } from '../sub-tabs/sub-tabs';
import { ExportPanel } from './export-panel';
import { ImportPanel } from './import-panel';

/** One tab of the file strip, and the sentence under it saying what that file is. */
export interface FileTab<T extends ExportFile> extends SubTab {
  readonly id: T;
  readonly help: string;
}

const DIRECTIONS: readonly SubTab[] = [
  { id: 'export', label: 'Export' },
  { id: 'import', label: 'Import' }
];

const STRAPLINES: Readonly<Record<ExportDirection, string>> = {
  export: 'Generated from the Studio, read-only: change it here, then copy again.',
  import: 'What you exported earlier, read back into the Studio.'
};

const EXPORT_FILES: readonly FileTab<ExportFile>[] = [
  {
    id: 'theme',
    label: 'Theme',
    help: 'The block to paste into your own :root. Only what differs from the library’s defaults is in it; Explicit Defaults states the rest too, so the block stands on its own wherever it lands.'
  },
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
    help: 'my-form.form.ts. The model’s type, its initial value, and the form’s rules, always: each field’s state, limits and condition, then the checks, written by the validator chosen on Form ▸ Settings ▸ The Form.'
  },
  {
    id: 'config',
    label: 'App Config',
    help: 'app.config.ts. The app defaults from Settings ▸ App Defaults. The template leaves out whatever these supply, so take both. Not read back in: it belongs to the app, not the form.'
  }
];

const IMPORT_FILES: readonly FileTab<ImportFile>[] = [
  {
    id: 'theme',
    label: 'Theme',
    help: 'A block exported here, read back in. Onto The Defaults reproduces the theme it came from; off, the block merges into the theme on screen. Variables the library does not declare are listed, not applied.'
  },
  {
    id: 'template',
    label: 'Template',
    help: 'A template exported here, read back in. It replaces the form on the stage, sections included. Paste the schema exported with it too, and each field keeps its state, limits, required marker and condition; without it they stay at their defaults. The form’s settings and its checks stay as the Studio has them. What else the Studio cannot read — bindings to expressions, control flow, presets — is listed, not silently dropped.'
  }
];

/**
 * What you leave with, and the way back in.
 *
 * Direction first, then the file: the sub-tab strip is the same control in the same place on all three
 * areas, and the files are a second strip under it, one on screen at a time.
 *
 * Which direction and which file are showing live in the inspector store rather than here: App Defaults'
 * export link and Structure's third way to start both open a file, and neither is in a position to reach
 * into this component.
 */
@Component({
  selector: 'portal-export-tab',
  templateUrl: './export-tab.html',
  styleUrl: './export-tab.scss',
  imports: [SubTabs, ExportPanel, ImportPanel]
})
export class ExportTab {
  protected readonly inspector = inject(InspectorStore);
  protected readonly directions = DIRECTIONS;
  protected readonly straplines = STRAPLINES;

  protected readonly exported = computed(() => EXPORT_FILES.find((file) => file.id === this.inspector.exportFile())!);
  protected readonly imported = computed(() => IMPORT_FILES.find((file) => file.id === this.inspector.importFile())!);

  protected readonly isExport = computed(() => this.inspector.exportDirection() === 'export');
  protected readonly files = computed(() => (this.isExport() ? EXPORT_FILES : IMPORT_FILES));
  protected readonly shown = computed(() => (this.isExport() ? this.exported() : this.imported()));

  protected selectDirection(id: string): void {
    this.inspector.exportDirection.set(id as ExportDirection);
  }

  protected selectFile(id: ExportFile): void {
    if (this.isExport()) this.inspector.exportFile.set(id);
    else this.inspector.importFile.set(id as ImportFile);
  }
}
