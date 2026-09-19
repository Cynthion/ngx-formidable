import { Directive, ElementRef, inject, input, output, signal } from '@angular/core';

/** Which edge the handle sits on, and so which pointer coordinate a drag reports. */
type ResizeAxis = 'x' | 'y';

/**
 * A draggable divider. It reports the pointer's position while a drag is in progress and leaves the
 * arithmetic to whoever owns the size — the two panels measure from opposite edges, so a shared "delta"
 * would only be right for one of them.
 *
 * Pointer capture is what makes the drag survive the pointer leaving the handle, which it does immediately:
 * the handle is a few pixels wide and the panel moves out from under it.
 */
@Directive({
  selector: '[portalResizeHandle]',
  host: {
    'class': 'portal-resize-handle',
    'role': 'separator',
    'tabindex': '0',
    '[class.is-dragging]': 'dragging()',
    '[attr.aria-orientation]': "axis() === 'x' ? 'vertical' : 'horizontal'",
    '[attr.aria-label]': 'handleLabel()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(dblclick)': 'resetRequested.emit()',
    '(keydown)': 'onKeydown($event)'
  }
})
export class ResizeHandleDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  public readonly axis = input.required<ResizeAxis>();
  /** Named for a screen reader, which meets a separator with no text of its own. */
  public readonly handleLabel = input('Resize');
  /** How far one arrow key moves the divider, so the panel is resizable from the keyboard too. */
  public readonly step = input(24);

  /** The pointer's position along the axis, while dragging. */
  public readonly moved = output<number>();
  /** One arrow-key press, as a signed number of pixels. */
  public readonly nudged = output<number>();
  /** A double-click or Home/End, which restores the default size. `reset` is a DOM event name. */
  public readonly resetRequested = output<void>();

  protected readonly dragging = signal(false);

  protected onPointerDown(event: PointerEvent): void {
    this.dragging.set(true);
    this.element.nativeElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging()) return;

    this.moved.emit(this.axis() === 'x' ? event.clientX : event.clientY);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragging()) return;

    this.dragging.set(false);
    this.element.nativeElement.releasePointerCapture(event.pointerId);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const horizontal = this.axis() === 'x';
    const back = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const forward = horizontal ? 'ArrowRight' : 'ArrowDown';

    if (event.key === back) this.nudged.emit(-this.step());
    else if (event.key === forward) this.nudged.emit(this.step());
    else if (event.key === 'Home' || event.key === 'End') this.resetRequested.emit();
    else return;

    event.preventDefault();
  }
}
