import { Directive, ElementRef } from '@angular/core';

/** Marks projected content as a field's panel-toggle icon (e.g. the date field's calendar toggle). */
@Directive({ selector: '[formidableFieldToggleIcon]', standalone: true })
export class FieldToggleIconDirective {
  constructor(public elementRef: ElementRef) {}
}
