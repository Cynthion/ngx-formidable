import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formidableFieldSuffix]' })
export class FieldSuffixDirective {
  constructor(public elementRef: ElementRef) {}
}
