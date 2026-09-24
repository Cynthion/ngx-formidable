import { ElementRef } from '@angular/core';
import { FormidablePanelPosition, IFormidablePanelField } from '../models/formidable.model';

// The position of a field's panel while it is open, or `null` — a field without a panel never opens one.
// This is what decides whether a field rises out of its resting layer, and how far; see `tech/layering.md`.
export function openPanelPosition(field?: unknown): FormidablePanelPosition | null {
  const panelField = field as Partial<IFormidablePanelField> | undefined;

  return panelField?.isPanelOpen?.() ? (panelField.panelPosition?.() ?? null) : null;
}

/**
 * The band a panel has to fit into: the viewport, cropped by every ancestor that clips its overflow. A
 * field inside a scrolling pane has far less room above and below it than the window suggests, and a panel
 * placed against the window is the one that ends up cut off by the pane.
 *
 * The walk stops below `<body>`: a scrolling body scrolls the viewport itself, and its box is only as tall
 * as its content — cropping against that would shrink the band on any ordinary page.
 */
function clipBand(element: HTMLElement): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;

  for (
    let ancestor = element.parentElement;
    ancestor && ancestor !== document.body;
    ancestor = ancestor.parentElement
  ) {
    if (getComputedStyle(ancestor).overflowY === 'visible') continue;

    const rect = ancestor.getBoundingClientRect();

    top = Math.max(top, rect.top);
    bottom = Math.min(bottom, rect.bottom);
  }

  return { top, bottom };
}

/**
 * Opens the panel below the field, or above it when there is no room below and there is above. The panel
 * carries the direction so its own styling can follow it — the field is never touched: its corners are its
 * own, and an open panel mirrors them rather than the other way round. A sheet is exempt: it is pinned to
 * the viewport, not to the field, so there is no side to pick.
 */
export function updatePanelPosition(fieldRef?: ElementRef<HTMLElement>, panelRef?: ElementRef<HTMLElement>): void {
  const field = fieldRef?.nativeElement;
  const panel = panelRef?.nativeElement;

  if (!field || !panel) return;

  // A sheet never flips, and must not keep a flip it picked up while it was still anchored to the field.
  if (panel.classList.contains('panel-sheet')) {
    panel.classList.remove('above');

    return;
  }

  const fieldRect = field.getBoundingClientRect();
  const panelHeight = panel.offsetHeight;
  const band = clipBand(field);

  const spaceBelow = band.bottom - fieldRect.bottom;
  const spaceAbove = fieldRect.top - band.top;

  // Below unless it does not fit there and does fit above — including when it fits neither way, so a
  // panel with nowhere to go is at least clipped predictably.
  panel.classList.toggle('above', spaceBelow < panelHeight && spaceAbove >= panelHeight);
}

/**
 * Brings a field and its just-opened panel back into the viewport — but only the one that has left it, so
 * opening a panel on a fully visible field never scrolls the page. Called only while opening: a closing
 * panel reveals nothing, so scrolling then would move the page under the user.
 */
export function scrollIntoView(fieldRef?: ElementRef<HTMLElement>, panelRef?: ElementRef<HTMLElement>): void {
  const field = fieldRef?.nativeElement;
  const panel = panelRef?.nativeElement;

  if (!field || !panel) return;

  const viewportHeight = window.innerHeight;

  const fieldRect = field.getBoundingClientRect();
  const fieldBottomEdge = fieldRect.bottom;
  const fieldTopEdge = fieldRect.top;
  const isFieldOutOfView = fieldBottomEdge > viewportHeight || fieldTopEdge < 0;

  if (isFieldOutOfView) {
    field.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  const panelRect = panel.getBoundingClientRect();
  const panelBottomEdge = panelRect.bottom;
  const panelTopEdge = panelRect.top;
  const isPanelOutOfView = panelBottomEdge > viewportHeight || panelTopEdge < 0;

  if (isPanelOutOfView) {
    panel.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }
}

/**
 * Scrolls the highlighted option inside its own scroll container. Takes either shape of query result, since
 * an option may be a component exposing an `elementRef` or a plain element query.
 */
export function scrollHighlightedOptionIntoView(
  index: number,
  optionRefs: readonly ({ elementRef: ElementRef<HTMLElement> } | ElementRef<HTMLElement>)[] | undefined
): void {
  const item = optionRefs?.[index];

  const optionElement = item instanceof ElementRef ? item.nativeElement : item?.elementRef?.nativeElement;

  if (optionElement) {
    optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
