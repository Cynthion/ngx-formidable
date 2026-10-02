import { inject, Injectable, signal } from '@angular/core';
import { LayoutStore } from './layout.store';

/** The sidebar's three areas: how the fields look, what the form is, and what you leave with. */
export type InspectorTab = 'theme' | 'form' | 'export';

/** The Theme area's own two halves — the ladder, and the whole variable surface behind it. */
export type ThemeSubTab = 'design' | 'variables';

/** The Form area's own two halves — which fields there are, and what everything is set to. */
export type FormSubTab = 'structure' | 'settings';

/**
 * How far a control in the Settings half reaches.
 *
 * The three are the three kinds of state there are: the app's defaults, the form's own options, and one
 * field's specification. Scope is a control rather than the wording of three headings, so the answer to "how
 * much does this change?" is on screen and selected.
 */
export type FieldScope = 'app' | 'form' | 'field';

/** The Export & Import area's own two halves — what goes out of the Studio, and what comes back in. */
export type ExportDirection = 'export' | 'import';

/** What goes out: the theme, and the four files the form is. */
export type ExportFile = 'theme' | 'template' | 'component' | 'schema' | 'config';

/** What comes back in. The component and the schema are what the template binds, and the app config is the app's. */
export type ImportFile = 'theme' | 'template';

/**
 * Which area of the sidebar is showing, and whether it is collapsed.
 *
 * It is a store rather than component state because three things outside the inspector move it: a field
 * chip in the preview opens the Fields sub-tab, Structure's third way to start opens Export & Import, and a
 * derived variable's link opens Variables. An output chain through the stage would only move the coupling somewhere
 * less obvious.
 */
@Injectable({ providedIn: 'root' })
export class InspectorStore {
  /**
   * Whether the panel is showing belongs to the workspace, not to which area of it is open — so every
   * `open*` below reaches for the layout's flag rather than keeping one of its own. A second flag here
   * would be written by these methods and read by nobody, which is what it was.
   */
  private readonly layout = inject(LayoutStore);

  public readonly tab = signal<InspectorTab>('theme');
  public readonly themeTab = signal<ThemeSubTab>('design');
  public readonly formTab = signal<FormSubTab>('structure');
  public readonly fieldScope = signal<FieldScope>('field');
  /** Never null: it is a sub-tab, and one of the two halves is always the one showing. */
  public readonly exportDirection = signal<ExportDirection>('export');
  /** One per direction, because only two of the five come back in. */
  public readonly exportFile = signal<ExportFile>('theme');
  public readonly importFile = signal<ImportFile>('theme');

  /** What a field chip asks for: the field it names, open for editing — so at that field's own scope. */
  public openFieldSettings(): void {
    this.tab.set('form');
    this.formTab.set('settings');
    this.fieldScope.set('field');
    this.reveal();
  }

  /** What App Defaults' export link asks for: the file it names, ready to copy. */
  public openExport(file: ExportFile): void {
    this.tab.set('export');
    this.exportDirection.set('export');
    this.exportFile.set(file);
    this.reveal();
  }

  /** What Structure's third way to start asks for: the box a template is pasted into. */
  public openImport(file: ImportFile): void {
    this.tab.set('export');
    this.exportDirection.set('import');
    this.importFile.set(file);
    this.reveal();
  }

  /** What a derived variable's link asks for: the base it follows, in the full list. */
  public openVariables(): void {
    this.tab.set('theme');
    this.themeTab.set('variables');
    this.reveal();
  }

  /** Moving to an area is pointless behind a collapsed panel, so every move opens it. */
  private reveal(): void {
    this.layout.inspectorCollapsed.set(false);
  }
}
