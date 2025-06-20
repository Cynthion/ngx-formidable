import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formzFormFieldPrefix]' })
export class FormFieldPrefixDirective {
  constructor(public elementRef: ElementRef) {}
}
