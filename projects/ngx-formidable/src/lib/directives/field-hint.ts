import { Directive, input } from '@angular/core';
import { FieldHintAlignment } from '../models/formidable.model';

/**
 * Marks a projected element as a hint, which the decorator renders in a row below the field and names in the
 * field's `aria-describedby`. Several hints share the row, each aligning itself.
 */
// The hint element is projected by the consumer, so the decorator's encapsulated stylesheet cannot reach it.
// `data-align` is what the global alignment rules select on.
@Directive({ selector: '[formidableFieldHint]', host: { '[attr.data-align]': 'align()' } })
export class FieldHint {
  /** Where this hint sits in the shared row, so a note and a counter can occupy opposite ends of it. */
  public readonly align = input<FieldHintAlignment>('start');
}
