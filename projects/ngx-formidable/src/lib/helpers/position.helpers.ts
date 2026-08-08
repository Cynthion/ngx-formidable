import { ElementRef, QueryList } from '@angular/core';

/**
 * Opens the panel below the field, or above it when there is no room below and there is above. The panel
 * carries the direction so its own styling can follow it — the field is never touched: its corners are its
 * own, and an open panel mirrors them rather than the other way round.
 */
export function updatePanelPosition(fieldRef?: ElementRef<HTMLElement>, panelRef?: ElementRef<HTMLElement>): void {
  const field = fieldRef?.nativeElement;
  const panel = panelRef?.nativeElement;

  if (!field || !panel) return;

  const fieldRect = field.getBoundingClientRect();
  const panelHeight = panel.offsetHeight;
  const windowHeight = window.innerHeight;

  const spaceBelow = windowHeight - fieldRect.bottom;
  const spaceAbove = fieldRect.top;

  // Below unless it does not fit there and does fit above — including when it fits neither way, so a
  // panel with nowhere to go is at least clipped predictably.
  panel.classList.toggle('above', spaceBelow < panelHeight && spaceAbove >= panelHeight);
}

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
