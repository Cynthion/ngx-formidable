import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AccordionComponent } from '../../chrome/accordion/accordion.component';
import { FIELD_KIND_LABELS } from '../../model/field-capabilities';
import { PortalFieldKind } from '../../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../../model/preview-form.definition';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { InspectorStore } from '../../state/inspector.store';

/** The three steps of building a form: where it comes from, what it is, and how it grows. */
type StructureStep = 'start' | 'list' | 'add';

/** "1 Section", not "1 Sections". The hints sit beside a number that is often one. */
function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/**
 * The shape of the form: where it starts, which fields exist, in which section, in which order.
 *
 * Fields are added, removed and reordered through controls rather than by typing, because the configuration
 * is the source of truth — an Angular production build contains no template compiler, so authored markup
 * could never become live components. Importing markup is therefore a read into the configuration, and it
 * lives on the Import & Export tab; this tab only sends you there.
 *
 * The three sections are a ladder rather than one per form section: a visitor who wants their own form has
 * to be told that starting over is possible before being shown a list of somebody else's fields.
 */
@Component({
  selector: 'portal-structure-tab',
  templateUrl: './structure-tab.component.html',
  styleUrl: './structure-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionComponent]
})
export class StructureTabComponent {
  protected readonly store = inject(FormDefinitionStore);
  private readonly inspector = inject(InspectorStore);

  protected readonly kindLabels = FIELD_KIND_LABELS;
  protected readonly kinds = Object.keys(FIELD_KIND_LABELS) as PortalFieldKind[];
  protected readonly sampleFieldCount = PREVIEW_FORM_DEFINITION.fields.length;

  protected readonly newKind = signal<PortalFieldKind>('input');
  protected readonly newSection = signal(this.store.sections()[0]?.id ?? '');
  protected readonly newSectionTitle = signal('');

  protected readonly openSection = signal<StructureStep | null>('list');

  protected readonly fieldCount = computed(() => this.store.fields().length);

  protected readonly startHint = computed(() => `${count(this.fieldCount(), 'Field')} Now`);
  protected readonly listHint = computed(() => count(this.store.sections().length, 'Section'));
  protected readonly addHint = count(this.kinds.length, 'Field Type');

  protected toggle(step: StructureStep): void {
    this.openSection.update((current) => (current === step ? null : step));
  }

  /** Nothing to start from. The next step is the one that can do anything about that. */
  protected startBlank(): void {
    this.store.clear();
    this.newSection.set(this.store.sections()[0]?.id ?? '');
    this.openSection.set('add');
  }

  protected startSample(): void {
    this.store.reset();
    this.newSection.set(this.store.sections()[0]?.id ?? '');
    this.openSection.set('list');
  }

  /** The third way to start is somebody else's markup, so this goes to the box one is pasted into. */
  protected startImport(): void {
    this.inspector.openExport('markup', 'import');
  }

  /** The list is where a field is found; the Fields tab is where it is changed. */
  protected edit(id: string): void {
    this.store.select(id);
    this.inspector.openFields();
  }

  /**
   * The step stays open. Building a form is a run of adds, and the new field is already visible on the
   * stage — closing the step to show it in a list would cost a click per field to say nothing new.
   */
  protected add(): void {
    this.store.addField(this.newKind(), this.newSection());
  }

  protected addSection(): void {
    const title = this.newSectionTitle().trim();
    if (!title) return;

    const id = this.store.addSection(title);
    this.newSectionTitle.set('');
    this.newSection.set(id);
  }
}
