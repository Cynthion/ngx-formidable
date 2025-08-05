import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formidableFieldTooltip]' })
export class FieldTooltipDirective {
  constructor(public elementRef: ElementRef) {}
}
