import { ElementRef } from '@angular/core';
import { updatePanelPosition } from './position.helpers';

/**
 * Contract of `updatePanelPosition`.
 *
 * It picks the side the panel opens on — below unless there is no room there and there is room above —
 * and marks the panel with it. It touches the panel only: a field's corners are its own, and it is the
 * open panel that adopts the two it sits against.
 */

/** A stand-in for a field, with the rect and the viewport it should be measured against. */
function elementAt(top: number, height: number): ElementRef<HTMLElement> {
  const element = document.createElement('div');

  element.getBoundingClientRect = () => ({ top, bottom: top + height, height }) as DOMRect;

  return new ElementRef(element);
}

/** A stand-in for a panel: only its height is read. */
function panelOf(height: number): ElementRef<HTMLElement> {
  const element = document.createElement('div');

  Object.defineProperty(element, 'offsetHeight', { value: height });

  return new ElementRef(element);
}

describe('updatePanelPosition', () => {
  const viewport = window.innerHeight;

  it('opens below while there is room below', () => {
    const field = elementAt(0, 60);
    const panel = panelOf(100);

    updatePanelPosition(field, panel);

    expect(panel.nativeElement.classList.contains('above')).toBe(false);
  });

  it('flips above when the panel does not fit below but does fit above', () => {
    const field = elementAt(viewport - 70, 60);
    const panel = panelOf(200);

    updatePanelPosition(field, panel);

    expect(panel.nativeElement.classList.contains('above')).toBe(true);
  });

  // Nowhere to put it: below is the default, so a clipped panel is at least clipped predictably.
  it('stays below when it fits neither way', () => {
    const field = elementAt(10, 60);
    const panel = panelOf(viewport * 2);

    updatePanelPosition(field, panel);

    expect(panel.nativeElement.classList.contains('above')).toBe(false);
  });

  // The same panel is repositioned on every scroll and resize, so the flip has to come back off again —
  // otherwise a panel that once had to open upwards stays upwards for the rest of its life.
  it('drops the flip once the panel fits below again', () => {
    const panel = panelOf(200);

    updatePanelPosition(elementAt(viewport - 70, 60), panel);

    expect(panel.nativeElement.classList.contains('above')).toBe(true);

    updatePanelPosition(elementAt(0, 60), panel);

    expect(panel.nativeElement.classList.contains('above')).toBe(false);
  });

  it('leaves the field untouched', () => {
    const field = elementAt(viewport - 70, 60);

    updatePanelPosition(field, panelOf(200));

    expect(field.nativeElement.classList.length).toBe(0);
  });

  it('does nothing without both elements', () => {
    expect(() => updatePanelPosition(undefined, panelOf(100))).not.toThrow();
    expect(() => updatePanelPosition(elementAt(0, 60), undefined)).not.toThrow();
  });
});
