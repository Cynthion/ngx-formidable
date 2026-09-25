import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgxFormidableFormDirective } from '@cynthion/ngx-formidable';
import { FIELD_KIND_LABELS, FIELD_KIND_SELECTORS } from '../model/field-capabilities';
import { PortalFieldKind } from '../model/field-spec.model';
import { kindLink, MatrixColumn, sampleSpec, SPECIMEN_FORM_OPTIONS } from '../model/specimen';
import { PreviewFieldComponent } from '../stage/preview-form/preview-field.component';
import { ReportsRequiredDirective } from './reports-required.directive';

/**
 * Field kinds against one axis: a row per kind, a column per value of the axis, and nothing else varying.
 *
 * It opens on `featured`, a few kinds that between them cover the three layouts, and shows the rest on request:
 * the rule is legible from four rows, and twelve at once is a wall.
 *
 * Every cell is the Studio's own field renderer in a form of its own, so no two cells share a control and a
 * cell renders exactly what the same field renders on the stage.
 */
@Component({
  selector: 'portal-specimen-matrix',
  templateUrl: './specimen-matrix.component.html',
  styleUrl: './specimen-matrix.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, NgxFormidableFormDirective, PreviewFieldComponent, ReportsRequiredDirective]
})
export class SpecimenMatrixComponent {
  public readonly kinds = input.required<readonly PortalFieldKind[]>();
  public readonly columns = input.required<readonly MatrixColumn[]>();
  /** The kinds shown until every kind is asked for. */
  public readonly featured = input.required<readonly PortalFieldKind[]>();

  protected readonly expanded = signal(false);

  protected readonly hiddenCount = computed(() => this.kinds().length - this.featured().length);

  protected readonly formOptions = SPECIMEN_FORM_OPTIONS;

  // A floor on the cell, so six label positions stay readable and scroll sideways rather than squeeze. A row's
  // name is a line of its own above its cells, so it takes no column from them.
  protected readonly template = computed(() => `repeat(${this.columns().length}, minmax(150px, 1fr))`);

  protected readonly rows = computed(() =>
    (this.expanded() ? this.kinds() : this.kinds().filter((kind) => this.featured().includes(kind))).map((kind) => {
      const spec = sampleSpec(kind);

      return {
        kind,
        label: FIELD_KIND_LABELS[kind],
        selector: FIELD_KIND_SELECTORS[kind],
        link: kindLink(kind),
        cells: this.columns().map((column) => ({
          spec: column.spec?.(spec) ?? spec,
          value: column.value(kind),
          invalid: column.invalid ?? false
        }))
      };
    })
  );
}
