import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[cmpUiFormFieldTooltip]' })
export class FormFieldTooltipDirective {
  constructor(public elementRef: ElementRef) {}
}
