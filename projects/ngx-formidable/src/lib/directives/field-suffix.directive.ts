import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formidableFieldSuffix]', standalone: true })
export class FieldSuffixDirective {
  constructor(public elementRef: ElementRef) {}
}
