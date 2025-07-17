import { ElementRef } from '@angular/core';

export function updatePanelPosition(fieldRef?: ElementRef<HTMLElement>, panelRef?: ElementRef<HTMLElement>): void {
  const field = fieldRef?.nativeElement;
  const panel = panelRef?.nativeElement;

  if (!field || !panel) return;

  const fieldRect = field.getBoundingClientRect();
  const panelHeight = panel.offsetHeight || 250; // default/fallback height

  const spaceBelow = window.innerHeight - fieldRect.bottom;
  const spaceAbove = fieldRect.top;

  if (spaceBelow < panelHeight && spaceAbove > panelHeight) {
    panel.classList.add('above');
  } else {
    panel.classList.remove('above');
  }
}

export function scrollIntoView(fieldRef?: ElementRef<HTMLElement>, panelRef?: ElementRef<HTMLElement>): void {
  const field = fieldRef?.nativeElement;
  const panel = panelRef?.nativeElement;

  if (!field || !panel) return;

  const fieldRect = field.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  const fieldBottomEdge = fieldRect.bottom;
  const fieldTopEdge = fieldRect.top;

  const panelBottomEdge = panelRect.bottom;
  const panelTopEdge = panelRect.top;

  const viewportHeight = window.innerHeight;

  const isFieldOutOfView = fieldBottomEdge > viewportHeight || fieldTopEdge < 0;
  const isPanelOutOfView = panelBottomEdge > viewportHeight || panelTopEdge < 0;

  if (isFieldOutOfView) {
    field.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  if (isPanelOutOfView) {
    panel.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }
}
