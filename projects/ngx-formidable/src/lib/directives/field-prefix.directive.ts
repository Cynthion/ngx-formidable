import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formidableFieldPrefix]', standalone: true })
export class FieldPrefixDirective {
  constructor(public elementRef: ElementRef) {}
}
