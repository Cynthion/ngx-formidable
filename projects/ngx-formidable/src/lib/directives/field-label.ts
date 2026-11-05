import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { FieldLabelPosition, FORMIDABLE_DEFAULTS } from '../models/formidable.model';

/**
 * Marks a projected element as the field's label. Set `position` to move it; the accessible name is wired up
 * for you either way, so this element needs no `for` or `aria-labelledby` of its own.
 */
@Directive({ selector: '[formidableFieldLabel]' })
export class FieldLabel {
  private readonly defaultPosition = inject(FORMIDABLE_DEFAULTS).labelPosition ?? 'inside';

  private readonly element: HTMLElement = inject(ElementRef).nativeElement;

  /**
   * Where the label renders. Every position other than `outside` needs a `horizontal` field. Unset or
   * `undefined`, the app default applies.
   */
  public readonly position = input(this.defaultPosition, {
    transform: (position: FieldLabelPosition | undefined) => position ?? this.defaultPosition
  });

  /** The label's text, whitespace collapsed, as it changes. The decorator names the clear button with it. */
  public readonly text = signal('');

  constructor() {
    const destroyRef = inject(DestroyRef);

    // The text lives in the consumer's view, so only the DOM knows it, and a translation can change it later.
    afterNextRender(() => {
      const observer = new MutationObserver(() => this.readText());

      this.readText();
      observer.observe(this.element, { characterData: true, childList: true, subtree: true });
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private readText(): void {
    this.text.set((this.element.textContent ?? '').replace(/\s+/g, ' ').trim());
  }
}
