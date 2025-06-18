import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[cmpUiFormFieldSuffix]' })
export class FormFieldSuffixDirective {
  constructor(public elementRef: ElementRef) {}
}
