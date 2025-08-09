import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formidableFieldTooltip]', standalone: true })
export class FieldTooltipDirective {
  constructor(public elementRef: ElementRef) {}
}
