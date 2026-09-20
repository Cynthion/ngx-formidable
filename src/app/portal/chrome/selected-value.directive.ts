import { afterRenderEffect, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Selects the option holding this value, for a `<select>` whose options are built by `@for` or `@if`.
 *
 * `[value]` cannot do this. A property binding on the `<select>` runs in the update pass, and a control-flow
 * block's content is created in that same pass — so the value is written while the element still has no
 * options, and a `<select>` given a value it cannot match falls back to its first option. The result is a
 * control that states the wrong setting and then writes nothing when the user picks the value it was already
 * claiming, which is indistinguishable from a control that does not work.
 *
 * `afterRenderEffect` is what moves the write past that: it runs once the DOM is settled, and re-runs when
 * the value changes. An empty value selects nothing, which is how a control says the fields disagree.
 */
@Directive({ selector: 'select[portalSelectedValue]' })
export class SelectedValueDirective {
  public readonly portalSelectedValue = input.required<string>();

  private readonly select = inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;

  constructor() {
    afterRenderEffect(() => {
      this.select.value = this.portalSelectedValue();
    });
  }
}
