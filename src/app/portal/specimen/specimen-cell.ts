import { Component, inject, input, linkedSignal } from '@angular/core';
import { form, requiredError, validate } from '@angular/forms/signals';
import { FORMIDABLE_DEFAULTS } from '@cynthion/ngx-formidable';
import { PortalFieldSpec, PortalFormOptions } from '../model/field-spec.model';
import { fieldRules } from '../model/preview-form.schema';
import { PreviewField } from '../stage/preview-form/preview-field';

/** Any value but `undefined`, which Signal Forms would drop from the model along with its field. */
type CellValue = NonNullable<unknown> | null;

/**
 * One field of the Specimen: the Studio's own field renderer over a form of its own, so no two cells share a
 * field and a cell renders exactly what the same field renders on the stage.
 *
 * An `invalid` cell reports the field as required, so it shows the library's own invalid state — the
 * message and the styling a real rule produces — rather than a picture of one. Every cell reveals at once:
 * only an invalid one has anything to reveal, and it has to show it without being touched first.
 */
@Component({
  selector: 'portal-specimen-cell',
  templateUrl: './specimen-cell.html',
  imports: [PreviewField],
  providers: [
    {
      provide: FORMIDABLE_DEFAULTS,
      useFactory: () => ({ ...inject(FORMIDABLE_DEFAULTS, { skipSelf: true }), revealOn: 'always' })
    }
  ]
})
export class SpecimenCell {
  public readonly spec = input.required<PortalFieldSpec>();
  public readonly formOptions = input.required<PortalFormOptions>();
  public readonly value = input<unknown>(null);
  public readonly invalid = input(false);

  private readonly model = linkedSignal(() => ({ cell: (this.value() ?? null) as CellValue }));

  protected readonly form = form(this.model, (path) => {
    fieldRules(path.cell, this.spec);
    validate(path.cell, () => (this.invalid() ? requiredError({ message: 'Required.' }) : undefined));
  });
}
