import { Directive, HostBinding, input } from '@angular/core';
import { FieldHintAlignment } from '../models/formidable.model';

/**
 * Marks a projected element as a hint, which the decorator renders in a row below the field and names in the
 * field's `aria-describedby`. Several hints share the row, each aligning itself.
 */
@Directive({ selector: '[formidableFieldHint]', standalone: true })
export class FieldHintDirective {
  /** Where this hint sits in the shared row, so a note and a counter can occupy opposite ends of it. */
  public readonly align = input<FieldHintAlignment>('start');

  // The hint element is projected by the consumer, so the decorator's encapsulated stylesheet cannot
  // reach it. This attribute is what the global alignment rules select on.
  @HostBinding('attr.data-align') get alignAttribute(): FieldHintAlignment {
    return this.align();
  }
}
