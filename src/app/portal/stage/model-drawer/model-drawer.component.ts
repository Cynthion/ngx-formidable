import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal } from '@angular/core';
import { ResizeHandleDirective } from '../../chrome/resize-handle.directive';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { FormValueStore } from '../../state/form-value.store';
import { LayoutStore } from '../../state/layout.store';

type DrawerPanel = 'sections' | 'errors' | 'raw';

/**
 * The model the form edits, its errors, its validity and its raw serialization.
 *
 * The library's Ubiquitous Language names the object a form edits the **model**; `formValue` stays the
 * directive's input name, which is the binding rather than the concept. The collapsed bar always states the
 * fill count and the validity, because that is the cheapest evidence that the form is real.
 */
@Component({
  selector: 'portal-model-drawer',
  templateUrl: './model-drawer.component.html',
  styleUrl: './model-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResizeHandleDirective],
  host: { '[style.height.px]': 'layout.drawerOpen() ? layout.drawerHeight() : null' }
})
export class ModelDrawerComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly valueStore = inject(FormValueStore);
  protected readonly definitionStore = inject(FormDefinitionStore);
  protected readonly layout = inject(LayoutStore);

  protected readonly panel = signal<DrawerPanel>('sections');
  protected readonly openSections = signal<ReadonlySet<string>>(new Set());

  protected readonly sections = computed(() => {
    const entries = this.valueStore.entries();

    return this.definitionStore.sections().map((section) => ({
      section,
      entries: entries.filter((entry) => entry.spec.sectionId === section.id)
    }));
  });

  protected readonly errorEntries = computed(() =>
    Object.entries(this.valueStore.errors()).filter(([, messages]) => messages.length)
  );

  protected readonly validity = computed(() => {
    const valid = this.valueStore.valid();

    if (valid === null) return 'Not validated';

    return valid ? 'Form valid' : `Form invalid · ${this.valueStore.errorCount()}`;
  });

  protected toggle(): void {
    this.layout.drawerOpen.update((open) => !open);
  }

  /** The handle sits on the drawer's top edge, so the height is the distance down to its bottom. */
  protected onDividerMoved(clientY: number): void {
    const bottom = this.elementRef.nativeElement.getBoundingClientRect().bottom;

    this.layout.setDrawerHeight(bottom - clientY);
  }

  protected onDividerNudged(delta: number): void {
    this.layout.setDrawerHeight(this.layout.drawerHeight() - delta);
  }

  protected toggleSection(id: string): void {
    this.openSections.update((open) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  protected isOpen(id: string): boolean {
    return this.openSections().has(id);
  }

  protected select(id: string): void {
    this.definitionStore.select(id);
  }
}
