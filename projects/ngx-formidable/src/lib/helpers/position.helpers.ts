import { ElementRef, QueryList } from '@angular/core';
import { FormidablePanelPosition, IFormidablePanelField } from '../models/formidable.model';

// The position of a field's panel while it is open, or `null` — a field without a panel never opens one.
// This is what decides whether a field rises out of its resting layer, and how far; see `tech/layering.md`.
export function openPanelPosition(field?: unknown): FormidablePanelPosition | null {
  const panelField = field as Partial<IFormidablePanelField> | undefined;

  return panelField?.isPanelOpen ? (panelField.panelPosition?.() ?? null) : null;
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
  const windowHeight = window.innerHeight;

  const spaceBelow = windowHeight - fieldRect.bottom;
  const spaceAbove = fieldRect.top;

  // Below unless it does not fit there and does fit above — including when it fits neither way, so a
  // panel with nowhere to go is at least clipped predictably.
  panel.classList.toggle('above', spaceBelow < panelHeight && spaceAbove >= panelHeight);
}

/**
 * Brings the field, and optionally its open panel, back into the viewport — but only the one that has left
 * it, so opening a panel on a fully visible field never scrolls the page.
 */
export function scrollIntoView(
  fieldRef?: ElementRef<HTMLElement>,
  panelRef?: ElementRef<HTMLElement>,
  scrollToPanel = true
): void {
  const field = fieldRef?.nativeElement;
  const panel = panelRef?.nativeElement;

  if (!field) return;
  if (!panel && scrollToPanel) return;

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

  if (!panel) return;

  const panelRect = panel.getBoundingClientRect();
  const panelBottomEdge = panelRect.bottom;
  const panelTopEdge = panelRect.top;
  const isPanelOutOfView = panelBottomEdge > viewportHeight || panelTopEdge < 0;

  if (isPanelOutOfView && scrollToPanel) {
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
  optionRefs: QueryList<{ elementRef: ElementRef<HTMLElement> } | ElementRef<HTMLElement>> | undefined
): void {
  const item = optionRefs?.get(index);

  const optionElement = item instanceof ElementRef ? item.nativeElement : item?.elementRef?.nativeElement;

  if (optionElement) {
    optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
