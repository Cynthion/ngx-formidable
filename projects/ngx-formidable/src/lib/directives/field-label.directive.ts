import { Directive, inject, input } from '@angular/core';
import { FieldLabelPosition, FORMIDABLE_DEFAULTS } from '../models/formidable.model';

/**
 * Marks a projected element as the field's label. Set `position` to move it; the accessible name is wired up
 * for you either way, so this element needs no `for` or `aria-labelledby` of its own.
 */
@Directive({ selector: '[formidableFieldLabel]', standalone: true })
export class FieldLabelDirective {
  private readonly defaultPosition = inject(FORMIDABLE_DEFAULTS).labelPosition ?? 'inside';

  /**
   * Where the label renders. Every position other than `outside` needs a `horizontal` field. Unset or
   * `undefined`, the app default applies.
   */
  public readonly position = input(this.defaultPosition, {
    transform: (position: FieldLabelPosition | undefined) => position ?? this.defaultPosition
  });
}
