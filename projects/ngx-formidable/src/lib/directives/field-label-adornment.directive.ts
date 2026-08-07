import { Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[formidableFieldLabelAdornment]', standalone: true })
export class FieldLabelAdornmentDirective {
  constructor(public elementRef: ElementRef) {}
}
