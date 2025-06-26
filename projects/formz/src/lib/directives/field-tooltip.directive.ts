import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formzFieldTooltip]' })
export class FieldTooltipDirective {
  constructor(public elementRef: ElementRef) {}
}
