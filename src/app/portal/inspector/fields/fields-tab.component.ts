import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AccordionComponent } from '../../chrome/accordion/accordion.component';
import { FIELD_KIND_LABELS } from '../../model/field-capabilities';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { FieldEditorComponent } from './field-editor.component';
import { FormDefaultsComponent } from './form-defaults.component';

type FieldsSection = 'every' | 'validation' | 'this';

/**
 * Two scopes, and the panel says which is which in as many words.
 *
 * "Form defaults" and "this field" were the design's names for them; on screen they are spelled out as
 * "Applies to every field" and "Applies to: <the field>", because a user arriving cold cannot be expected
 * to infer the scope of a control from the heading above it.
 */
@Component({
  selector: 'portal-fields-tab',
  templateUrl: './fields-tab.component.html',
  styleUrl: './fields-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionComponent, FormDefaultsComponent, FieldEditorComponent]
})
export class FieldsTabComponent {
  protected readonly store = inject(FormDefinitionStore);
  protected readonly kindLabels = FIELD_KIND_LABELS;

  protected readonly openSection = signal<FieldsSection | null>('this');

  protected readonly fieldCount = computed(() => this.store.fields().length);

  protected readonly selectedLabel = computed(() => this.store.selectedField()?.label ?? 'Nothing Selected');

  protected readonly selectedKind = computed(() => {
    const field = this.store.selectedField();

    return field ? FIELD_KIND_LABELS[field.kind] : '';
  });

  protected toggle(section: FieldsSection): void {
    this.openSection.update((current) => (current === section ? null : section));
  }
}
