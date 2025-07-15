import { ElementRef } from '@angular/core';
import { FormzPanelPosition, IFormzPanelField } from './formz.model';

export class PanelBehavior implements IFormzPanelField {
  public fieldRef?: ElementRef<HTMLElement>;
  public panelRef?: ElementRef<HTMLElement>;
  public isPanelOpen = false;
  public panelPosition: FormzPanelPosition = 'full';

  constructor(fieldRef?: ElementRef<HTMLElement>, panelRef?: ElementRef<HTMLElement>) {
    this.fieldRef = fieldRef;
    this.panelRef = panelRef;
  }

  public togglePanel(isOpen: boolean): void {
    this.isPanelOpen = isOpen;

    if (isOpen) {
      this.scrollIntoView();
    }
  }

  private scrollIntoView(): void {
    setTimeout(() => {
      const field = this.fieldRef?.nativeElement;
      const panel = this.panelRef?.nativeElement;

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
    });
  }
}
