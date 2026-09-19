import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ExportSection, InspectorStore } from '../../state/inspector.store';
import { SubTab, SubTabsComponent } from '../sub-tabs/sub-tabs.component';
import { MarkupPanelComponent } from './markup-panel.component';
import { ThemePanelComponent } from './theme-panel.component';

/** The two things there are to take away, named after the inspector tabs that make them. */
const SUB_TABS: readonly SubTab[] = [
  { id: 'theme', label: 'Theme' },
  { id: 'form', label: 'Form' }
];

// Short, because each half's two accordions carry the explanation of what goes out and what comes back in.
const STRAPLINES: Readonly<Record<ExportSection, string>> = {
  theme: 'The CSS your theme is, out and back in.',
  form: 'The template and component your form is, out and back in.'
};

/**
 * What you leave with, and the way back in.
 *
 * Two halves rather than two accordions, so the area is navigated the way its siblings are: the sub-tab
 * strip is the same control in the same place on all three, and each half is a whole panel rather than a
 * body that has to be opened before it can be read.
 *
 * Which half is showing lives in the inspector store rather than here: each of the top bar's two export
 * controls opens the one it belongs to, Structure's third way to start opens the form half, and none of
 * them is in a position to reach into this component.
 */
@Component({
  selector: 'portal-export-tab',
  templateUrl: './export-tab.component.html',
  styleUrl: './export-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SubTabsComponent, ThemePanelComponent, MarkupPanelComponent]
})
export class ExportTabComponent {
  protected readonly inspector = inject(InspectorStore);
  protected readonly subTabs = SUB_TABS;
  protected readonly straplines = STRAPLINES;

  protected select(id: string): void {
    this.inspector.exportSection.set(id as ExportSection);
  }
}
