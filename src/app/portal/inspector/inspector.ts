import { Component, DOCUMENT, inject } from '@angular/core';
import { ResizeHandle } from '../chrome/resize-handle';
import { InspectorStore, InspectorTab } from '../state/inspector.store';
import { LayoutStore } from '../state/layout.store';
import { ExportTab } from './export/export-tab';
import { FormTab } from './form/form-tab';
import { ThemeTab } from './theme/theme-tab';

const TABS: readonly { id: InspectorTab; label: string; title: string }[] = [
  { id: 'theme', label: 'Theme', title: 'How the fields look' },
  { id: 'form', label: 'Form', title: 'What the fields are, and which of them exist' },
  // Both directions in one name: the tab has always held a paste-back beside each copy-out.
  { id: 'export', label: 'Import & Export', title: 'The CSS and the template, out of the Studio and back in' }
];

/**
 * The right column. Tabs are simultaneous views of one live object, so they are not routes — routing them
 * would hide either the preview or the editor.
 *
 * Three areas, in the order the work happens: make it look right, say what it is, take it away. The model
 * is not one of them — it belongs to the stage column, so the inspector keeps its full height.
 */
@Component({
  selector: 'portal-inspector',
  templateUrl: './inspector.html',
  styleUrl: './inspector.scss',
  imports: [ResizeHandle, ThemeTab, FormTab, ExportTab],
  host: {
    'class': 'portal-chrome',
    '[class.is-collapsed]': 'layout.inspectorCollapsed()',
    '[style.width.px]': 'layout.inspectorCollapsed() ? null : layout.inspectorWidth()'
  }
})
export class Inspector {
  private readonly doc = inject(DOCUMENT);

  protected readonly store = inject(InspectorStore);
  protected readonly layout = inject(LayoutStore);
  protected readonly tabs = TABS;

  protected toggle(): void {
    this.layout.inspectorCollapsed.update((value) => !value);
  }

  /** The divider sits on the inspector's left edge, so the width is what is left of the viewport. */
  protected onDividerMoved(clientX: number): void {
    const viewport = this.doc.defaultView?.innerWidth ?? 0;

    this.layout.setInspectorWidth(viewport - clientX);
  }

  protected onDividerNudged(delta: number): void {
    this.layout.setInspectorWidth(this.layout.inspectorWidth() - delta);
  }
}
