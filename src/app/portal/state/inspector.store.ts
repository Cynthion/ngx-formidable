import { inject, Injectable, signal } from '@angular/core';
import { LayoutStore } from './layout.store';

/** The sidebar's three areas: how the fields look, what the form is, and what you leave with. */
export type InspectorTab = 'theme' | 'form' | 'export';

/** The Theme area's own two halves — the ladder, and the whole variable surface behind it. */
export type ThemeSubTab = 'design' | 'variables';

/** The Form area's own two halves — which fields there are, and what each one is. */
export type FormSubTab = 'structure' | 'fields';

/** The Import & Export area's own two halves — one round trip each. */
export type ExportSection = 'theme' | 'form';

/** Which way round a half is being used. Both halves offer both, as the area's name says. */
export type ExportDirection = 'export' | 'import';

/**
 * Which area of the sidebar is showing, and whether it is collapsed.
 *
 * It is a store rather than component state because three things outside the inspector move it: a field
 * chip in the preview opens the Fields sub-tab, the copy button's count opens Export, and a derived
 * variable's link opens Variables. An output chain through the stage would only move the coupling somewhere
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
  /** Never null: it is a sub-tab, and one of the two halves is always the one showing. */
  public readonly exportSection = signal<ExportSection>('theme');

  /**
   * Which accordion is open inside whichever half is showing, or neither. Here rather than in the panels
   * because Structure's third way to start asks for the form half open at its **import**, and a panel's
   * own state is not something the structure editor can reach.
   */
  public readonly exportDirection = signal<ExportDirection | null>('export');

  /** What a field chip asks for: the field it names, open for editing. */
  public openFields(): void {
    this.tab.set('form');
    this.formTab.set('fields');
    this.reveal();
  }

  /**
   * What each of the top bar's two export controls asks for, and what Structure's third way to start asks
   * for: the half holding the round trip it names, which is the block to read before copying and the box to
   * paste one back into.
   */
  public openExport(section: ExportSection, direction: ExportDirection = 'export'): void {
    this.tab.set('export');
    this.exportSection.set(section);
    this.exportDirection.set(direction);
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
