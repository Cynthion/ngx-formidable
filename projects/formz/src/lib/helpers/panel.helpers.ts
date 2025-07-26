import { ElementRef } from '@angular/core';

export function updatePanelPosition(fieldRef?: ElementRef<HTMLElement>, panelRef?: ElementRef<HTMLElement>): void {
  const field = fieldRef?.nativeElement;
  const panel = panelRef?.nativeElement;

  if (!field || !panel) return;

  const fieldRect = field.getBoundingClientRect();
  const panelHeight = panel.offsetHeight;
  const windowHeight = window.innerHeight;

  const spaceBelow = windowHeight - fieldRect.bottom;
  const spaceAbove = fieldRect.top;

  if (spaceBelow >= panelHeight) {
    panel.classList.remove('above');
  } else if (spaceAbove >= panelHeight) {
    panel.classList.add('above');
  } else {
    panel.classList.remove('above');
  }
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
