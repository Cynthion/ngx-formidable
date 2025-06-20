import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formzFormFieldTooltip]' })
export class FormFieldTooltipDirective {
  constructor(public elementRef: ElementRef) {}
}
