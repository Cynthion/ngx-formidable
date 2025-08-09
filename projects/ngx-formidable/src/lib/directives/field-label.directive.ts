import { Directive, ElementRef, Input } from '@angular/core';

@Directive({ selector: '[formidableFieldLabel]', standalone: true })
export class FieldLabelDirective {
  /** Whether the label should float above the field. */
  @Input() isFloating = false;

  constructor(public elementRef: ElementRef) {}
}
