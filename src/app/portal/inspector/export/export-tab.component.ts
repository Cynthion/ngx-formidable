import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AccordionComponent } from '../../chrome/accordion/accordion.component';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { ExportSection, InspectorStore } from '../../state/inspector.store';
import { ThemeStore } from '../../state/theme.store';
import { MarkupPanelComponent } from './markup-panel.component';
import { ThemePanelComponent } from './theme-panel.component';

/**
 * What you leave with, and the way back in.
 *
 * One scroll rather than a third level of tabs: the two things a visitor takes away — the `:root` block and
 * the template — are read once at the end, not worked in, so a pair of accordions is enough to keep them
 * apart. Each carries its own import, because the way back in belongs beside the way out.
 *
 * Which of the two is open lives in the inspector store rather than here: the top bar opens the theme half
 * and Structure's third way to start opens the markup half, and neither is in a position to reach into this
 * component.
 */
@Component({
  selector: 'portal-export-tab',
  templateUrl: './export-tab.component.html',
  styleUrl: './export-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionComponent, ThemePanelComponent, MarkupPanelComponent]
})
export class ExportTabComponent {
  private readonly theme = inject(ThemeStore);
  private readonly definition = inject(FormDefinitionStore);
  private readonly inspector = inject(InspectorStore);

  protected readonly openSection = this.inspector.exportSection;

  protected readonly variableCount = computed(() => this.theme.changeCount());
  protected readonly fieldCount = computed(() => this.definition.fields().length);

  protected toggle(section: ExportSection): void {
    this.openSection.update((current) => (current === section ? null : section));
  }
}
