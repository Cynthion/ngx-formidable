import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Marks content projected into a select, dropdown or date field as its toggle icon. While it renders, it
 * replaces the field's own icon: the library's chevron, or the one `FORMIDABLE_ICONS` provides.
 */
@Directive({ selector: '[formidableFieldToggleIcon]' })
export class FieldToggleIcon {
  elementRef = inject(ElementRef);
}
