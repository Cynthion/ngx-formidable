import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Marks a projected element as decorating the label — a help icon, a badge. It shares the label's row and
 * disappears with it, so a label moved over the field takes its adornment along.
 */
@Directive({ selector: '[formidableFieldLabelAdornment]', standalone: true })
export class FieldLabelAdornmentDirective {
  elementRef = inject(ElementRef);
}
