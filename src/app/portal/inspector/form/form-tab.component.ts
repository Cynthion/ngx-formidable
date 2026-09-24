import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormSubTab, InspectorStore } from '../../state/inspector.store';
import { SettingsTabComponent } from '../settings/settings-tab.component';
import { StructureTabComponent } from '../structure/structure-tab.component';
import { SubTab, SubTabsComponent } from '../sub-tabs/sub-tabs.component';

// Structure first: which fields exist has to be settled before what one of them is worth saying.
const SUB_TABS: readonly SubTab[] = [
  { id: 'structure', label: 'Structure' },
  { id: 'settings', label: 'Settings' }
];

const STRAPLINES: Readonly<Record<FormSubTab, string>> = {
  structure: 'Build the form: start it, then say which fields exist, in which section, in what order.',
  settings: 'What everything is set to, at whichever scope you pick: the app, the form, or one field.'
};

/**
 * What the form is, as opposed to how it looks.
 *
 * The two halves were separate top-level tabs and read as unrelated. They are one subject — deciding a
 * field exists and editing it — so they are one area with two halves, in that order.
 */
@Component({
  selector: 'portal-form-tab',
  templateUrl: './form-tab.component.html',
  styleUrl: './form-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SubTabsComponent, SettingsTabComponent, StructureTabComponent]
})
export class FormTabComponent {
  protected readonly inspector = inject(InspectorStore);
  protected readonly subTabs = SUB_TABS;
  protected readonly straplines = STRAPLINES;

  protected select(id: string): void {
    this.inspector.formTab.set(id as FormSubTab);
  }
}
