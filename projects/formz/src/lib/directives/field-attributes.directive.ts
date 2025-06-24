import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[formzFieldAttributes]'
})
export class FieldAttributesDirective implements OnChanges {
  @Input('formzFieldAttributes') attrs: Record<string, unknown> = {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ('attrs' in changes && this.attrs) {
      this.updateAttributes(this.attrs);
    }
  }

  private updateAttributes(attrs: Record<string, unknown>) {
    const nativeEl = this.el.nativeElement;

    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value === null || value === undefined) {
        this.renderer.removeAttribute(nativeEl, key);
      } else {
        this.renderer.setAttribute(nativeEl, key, String(value));
      }
    }
  }
}
