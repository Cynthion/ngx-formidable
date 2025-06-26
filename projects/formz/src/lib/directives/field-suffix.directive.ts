import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formzFieldSuffix]' })
export class FieldSuffixDirective {
  constructor(public elementRef: ElementRef) {}
}
