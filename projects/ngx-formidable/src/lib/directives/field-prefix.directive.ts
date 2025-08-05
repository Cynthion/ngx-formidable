import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formidableFieldPrefix]' })
export class FieldPrefixDirective {
  constructor(public elementRef: ElementRef) {}
}
