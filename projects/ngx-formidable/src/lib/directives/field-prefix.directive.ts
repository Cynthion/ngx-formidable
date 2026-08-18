import { Directive, ElementRef, Input } from '@angular/core';
import { FieldAdornmentAlignment } from '../models/formidable.model';

/**
 * Marks a projected element as the field's prefix, rendered inside the field's box at its leading edge. The
 * value moves clear of it automatically, however wide it is.
 *
 * Not rendered by a field whose decorator layout is `vertical` — the slider and the two groups.
 */
@Directive({ selector: '[formidableFieldPrefix]', standalone: true })
export class FieldPrefixDirective {
  /** What the prefix lines up with vertically: the field's box (`center`) or its value (`value`). */
  @Input() align: FieldAdornmentAlignment = 'center';

  constructor(public elementRef: ElementRef) {}
}
