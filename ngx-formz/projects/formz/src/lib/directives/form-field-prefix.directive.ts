import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[cmpUiFormFieldPrefix]' })
export class FormFieldPrefixDirective {
  constructor(public elementRef: ElementRef) {}
}
