import { Directive, effect, ElementRef, inject, input } from '@angular/core';

/**
 * Paints one subtree with a theme of its own — a preset thumbnail, which is a live miniature of a real field.
 *
 * The host carries `.portal-theme-scope`, which re-emits the library's whole default block under that
 * selector; the variables set here then recompute the derived ones against these bases instead of against
 * `:root`. Setting them any other way would half-apply, for the reason `tech/portal.md` gives.
 */
@Directive({
  selector: '[portalThemeScope]',
  host: { class: 'portal-theme-scope' }
})
export class ThemeScopeDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  public readonly portalThemeScope = input.required<Readonly<Record<string, string>>>();

  private applied = new Set<string>();

  constructor() {
    effect(() => {
      const vars = this.portalThemeScope();
      const style = this.element.nativeElement.style;
      const next = new Set(Object.keys(vars));

      for (const key of this.applied) {
        if (!next.has(key)) style.removeProperty(key);
      }
      for (const [key, value] of Object.entries(vars)) {
        style.setProperty(key, value);
      }
      this.applied = next;
    });
  }
}
