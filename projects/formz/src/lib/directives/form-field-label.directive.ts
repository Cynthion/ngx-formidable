import { Directive, ElementRef, Input } from '@angular/core';

@Directive({ selector: '[cmpUiFormFieldLabel]' })
export class FormFieldLabelDirective {
  /** Whether the label should float above the field. */
  @Input() isFloating = false;

  constructor(public elementRef: ElementRef) {}
}
