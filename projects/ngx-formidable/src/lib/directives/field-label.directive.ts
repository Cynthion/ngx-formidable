import { Directive, Input } from '@angular/core';
import { FieldLabelPosition } from '../models/formidable.model';

/**
 * Marks a projected element as the field's label. Set `position` to move it; the accessible name is wired up
 * for you either way, so this element needs no `for` or `aria-labelledby` of its own.
 */
@Directive({ selector: '[formidableFieldLabel]', standalone: true })
export class FieldLabelDirective {
  /** Where the label renders. Every position other than `outside` needs a `horizontal` field. */
  @Input() position: FieldLabelPosition = 'inside';
}
