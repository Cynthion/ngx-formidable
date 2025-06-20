import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formzFormFieldSuffix]' })
export class FormFieldSuffixDirective {
  constructor(public elementRef: ElementRef) {}
}
