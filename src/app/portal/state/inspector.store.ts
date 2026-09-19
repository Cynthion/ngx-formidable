import { Injectable, signal } from '@angular/core';

/** The sidebar's three areas: how the fields look, what the form is, and what you leave with. */
export type InspectorTab = 'theme' | 'form' | 'export';

/** The Theme area's own two halves — the ladder, and the whole variable surface behind it. */
export type ThemeSubTab = 'design' | 'variables';

/** The Form area's own two halves — which fields there are, and what each one is. */
export type FormSubTab = 'structure' | 'fields';

/** The Import & Export area's two round trips. */
export type ExportSection = 'theme' | 'markup';

/**
 * Which area of the sidebar is showing, and whether it is collapsed.
 *
 * It is a store rather than component state because three things outside the inspector move it: a caption
 * chip in the preview opens the Fields sub-tab, the copy button's count opens Export, and a derived
 * variable's link opens Variables. An output chain through the stage would only move the coupling somewhere
 * less obvious.
 */
@Injectable({ providedIn: 'root' })
export class InspectorStore {
  public readonly tab = signal<InspectorTab>('theme');
  public readonly themeTab = signal<ThemeSubTab>('design');
  public readonly formTab = signal<FormSubTab>('structure');
  public readonly exportSection = signal<ExportSection | null>('theme');
  public readonly collapsed = signal(false);

  /** What a caption chip asks for: the field it names, open for editing. */
  public openFields(): void {
    this.tab.set('form');
    this.formTab.set('fields');
    this.collapsed.set(false);
  }

  /** What the copy button's count asks for: the block that would be copied, in full. */
  public openExport(): void {
    this.tab.set('export');
    this.exportSection.set('theme');
    this.collapsed.set(false);
  }

  /** What Structure's third way to start asks for: the box a whole form is pasted into. */
  public openMarkupImport(): void {
    this.tab.set('export');
    this.exportSection.set('markup');
    this.collapsed.set(false);
  }

  /** What a derived variable's link asks for: the base it follows, in the full list. */
  public openVariables(): void {
    this.tab.set('theme');
    this.themeTab.set('variables');
    this.collapsed.set(false);
  }
}
