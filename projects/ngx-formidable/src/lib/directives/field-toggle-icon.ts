import { Directive, ElementRef, inject } from '@angular/core';

/** Marks projected content as a field's panel-toggle icon (e.g. the date field's calendar toggle). */
@Directive({ selector: '[formidableFieldToggleIcon]' })
export class FieldToggleIcon {
  elementRef = inject(ElementRef);
}
