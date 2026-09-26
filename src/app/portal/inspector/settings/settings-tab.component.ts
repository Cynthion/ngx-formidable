import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SelectedValueDirective } from '../../chrome/selected-value.directive';
import { FIELD_KIND_LABELS } from '../../model/field-capabilities';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { FieldScope, InspectorStore } from '../../state/inspector.store';
import { AppDefaultsComponent } from './app-defaults.component';
import { FieldEditorComponent } from './field-editor.component';
import { FormSettingsComponent } from './form-settings.component';

/** The three scopes, in the order they narrow. */
const SCOPES: readonly { id: FieldScope; label: string; lede: string }[] = [
  {
    id: 'app',
    label: 'App Defaults',
    lede: 'Set once, in provideNgxFormidable(). Every form and field in your app takes these unless it states its own.'
  },
  {
    id: 'form',
    label: 'The Form',
    lede: 'What the form owns: the master switches every field obeys, sample adornments, and which validator runs.'
  },
  {
    id: 'field',
    label: 'This Field',
    lede: 'One field, in full. A control is offered only where this kind of field honours it.'
  }
];

/**
 * One editor, with the scope as a control on top of it.
 *
 * Scope used to be the wording of three sibling headings, which put the same Decoration group on screen
 * twice under names that had to be read to be told apart — and never at the same time, since one accordion
 * opened at a time. Selecting the scope instead leaves one editor with one set of groups, learned once, and
 * puts the answer to "how much does this change?" on screen rather than in prose.
 *
 * The three positions are the three kinds of state there are, so nothing is filed under a scope it does not
 * belong to. `tech/portal.md` carries the reasoning.
 */
@Component({
  selector: 'portal-settings-tab',
  templateUrl: './settings-tab.component.html',
  styleUrl: './settings-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectedValueDirective, AppDefaultsComponent, FieldEditorComponent, FormSettingsComponent]
})
export class SettingsTabComponent {
  protected readonly store = inject(FormDefinitionStore);
  protected readonly inspector = inject(InspectorStore);

  protected readonly kindLabels = FIELD_KIND_LABELS;
  protected readonly scopes = SCOPES;

  protected readonly fieldCount = computed(() => this.store.fields().length);

  protected readonly lede = computed(
    () => SCOPES.find((scope) => scope.id === this.inspector.fieldScope())?.lede ?? ''
  );

  /** The count each scope reaches — for the app, how many defaults it sets — so a scope states it up front. */
  protected reach(scope: FieldScope): string {
    if (scope === 'app') return `${Object.keys(this.store.appDefaults()).length}`;
    if (scope === 'field') return this.store.selectedField() ? '1' : '0';

    return '';
  }
}
