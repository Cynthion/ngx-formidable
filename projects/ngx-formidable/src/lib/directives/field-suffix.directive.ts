import { Directive, ElementRef, inject, input } from '@angular/core';
import { FieldAdornmentAlignment, FORMIDABLE_DEFAULTS } from '../models/formidable.model';

/**
 * Marks a projected element as the field's suffix, rendered inside the field's box at its trailing edge. The
 * value moves clear of it automatically, however wide it is.
 *
 * Not rendered by a field whose decorator layout is `vertical` — the slider and the two groups.
 */
@Directive({ selector: '[formidableFieldSuffix]', standalone: true })
export class FieldSuffixDirective {
  elementRef = inject(ElementRef);

  private readonly defaultAlign = inject(FORMIDABLE_DEFAULTS).suffixAlign ?? 'center';

  /**
   * What the suffix lines up with vertically: the field's box (`center`) or its value (`value`). Unset or
   * `undefined`, the app default applies.
   */
  public readonly align = input(this.defaultAlign, {
    transform: (align: FieldAdornmentAlignment | undefined) => align ?? this.defaultAlign
  });
}
