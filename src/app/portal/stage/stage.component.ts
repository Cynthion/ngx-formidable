import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutStore } from '../state/layout.store';
import { ModelDrawerComponent } from './model-drawer/model-drawer.component';
import { PreviewFormComponent } from './preview-form/preview-form.component';

/**
 * The left column: the preview form on an explicit page surface, with the model drawer under it.
 *
 * The surface is the object a dark theme needs, because the library styles fields and never the page behind
 * them. The drawer belongs to this column rather than to the page width, so the inspector keeps its height.
 */
@Component({
  selector: 'portal-stage',
  templateUrl: './stage.component.html',
  styleUrl: './stage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PreviewFormComponent, ModelDrawerComponent]
})
export class StageComponent {
  protected readonly layout = inject(LayoutStore);

  protected toggleFieldTypes(): void {
    this.layout.showFieldTypes.update((on) => !on);
  }

  /** Shown, never simulated: the overlay states what the library actually produced. */
  protected toggleAccessibility(): void {
    this.layout.showAccessibility.update((on) => !on);
  }
}
