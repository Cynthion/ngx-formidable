import { Directive, Input } from '@angular/core';
import { FieldLabelPosition } from '../models/formidable.model';

@Directive({ selector: '[formidableFieldLabel]', standalone: true })
export class FieldLabelDirective {
  @Input() position: FieldLabelPosition = 'inside';
}
