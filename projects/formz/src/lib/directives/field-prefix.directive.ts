import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formzFieldPrefix]' })
export class FieldPrefixDirective {
  constructor(public elementRef: ElementRef) {}
}
