import { Directive, ElementRef, inject } from '@angular/core';

/** Marks content projected into a select, dropdown or date field as its toggle icon, replacing the themed one. */
@Directive({ selector: '[formidableFieldToggleIcon]' })
export class FieldToggleIcon {
  elementRef = inject(ElementRef);
}
