import { Directive, ElementRef, Input } from '@angular/core';
import { FieldAdornmentAlignment } from '../models/formidable.model';

@Directive({ selector: '[formidableFieldPrefix]', standalone: true })
export class FieldPrefixDirective {
  /** What the prefix follows vertically. Read by the decorator, which owns the wrapper it styles. */
  @Input() align: FieldAdornmentAlignment = 'center';

  constructor(public elementRef: ElementRef) {}
}
