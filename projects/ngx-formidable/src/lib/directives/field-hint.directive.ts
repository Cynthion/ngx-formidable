import { Directive, HostBinding, Input } from '@angular/core';
import { FieldHintAlignment } from '../models/formidable.model';

@Directive({ selector: '[formidableFieldHint]', standalone: true })
export class FieldHintDirective {
  @Input() align: FieldHintAlignment = 'start';

  // The hint element is projected by the consumer, so the decorator's encapsulated stylesheet cannot
  // reach it. This attribute is what the global alignment rules select on.
  @HostBinding('attr.data-align') get alignAttribute(): FieldHintAlignment {
    return this.align;
  }
}
