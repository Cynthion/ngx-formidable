import { ElementRef } from '@angular/core';
import fc from 'fast-check';
import { updatePanelPosition } from './position.helpers';

/**
 * Contract of `updatePanelPosition`, per **Panels** in `user/fields.md`.
 *
 * It picks the side the panel opens on, below unless there is no room there and there is room above, measured
 * within the viewport and every ancestor that clips its overflow, and marks the panel with it. It touches the
 * panel only: a field's corners are its own, and it is the open panel that adopts the two it sits against. A
 * sheet is exempt: it is pinned to the viewport rather than to the field, so there is no side to pick.
 */

const viewport = window.innerHeight;

/** A band of the page, as a field or a pane occupies it. */
interface Band {
  top: number;
  bottom: number;
}

interface Geometry {
  field: Band;
  panel: number;
  /** The panes the field scrolls in, outermost first. */
  panes: Band[];
}

const coordinate = fc.integer({ min: -viewport, max: 2 * viewport });
const band = fc
  .tuple(coordinate, fc.integer({ min: 1, max: 2 * viewport }))
  .map(([top, height]): Band => ({ top, bottom: top + height }));
const geometry: fc.Arbitrary<Geometry> = fc.record({
  field: band,
  panel: fc.integer({ min: 0, max: 2 * viewport }),
  panes: fc.array(band, { maxLength: 2 })
});

/** A stand-in for an element occupying `band`: only its rect is read. */
function elementAt({ top, bottom }: Band): HTMLElement {
  const element = document.createElement('div');

  element.getBoundingClientRect = () => ({ top, bottom, height: bottom - top }) as DOMRect;

  return element;
}

/** A stand-in for a panel: only its height is read. */
function panelOf(height: number): ElementRef<HTMLElement> {
  const element = document.createElement('div');

  Object.defineProperty(element, 'offsetHeight', { value: height });

  return new ElementRef(element);
}

/** Hangs a field in panes that clip at their bands, the way scrolling layout columns do. */
function fieldIn({ field, panes }: Geometry): ElementRef<HTMLElement> {
  const element = elementAt(field);
  const innermost = panes.reduce<HTMLElement>((parent, paneBand) => {
    const pane = elementAt(paneBand);

    pane.style.overflowY = 'auto';
    parent.appendChild(pane);

    return pane;
  }, stage);

  innermost.appendChild(element);

  return new ElementRef(element);
}

/** The side the rule picks: below wherever the panel fits there, and wherever it fits neither way. */
function expectedSide({ field, panel, panes }: Geometry): 'above' | 'below' {
  const top = Math.max(0, ...panes.map((pane) => pane.top));
  const bottom = Math.min(viewport, ...panes.map((pane) => pane.bottom));
  const fitsBelow = bottom - field.bottom >= panel;
  const fitsAbove = field.top - top >= panel;

  return fitsBelow || !fitsAbove ? 'below' : 'above';
}

const side = (panel: ElementRef<HTMLElement>) => (panel.nativeElement.classList.contains('above') ? 'above' : 'below');

/** Holds every stand-in, so a run leaves nothing on the page. Its own overflow is visible, so it clips nothing. */
let stage: HTMLElement;

describe('updatePanelPosition', () => {
  beforeEach(() => {
    stage = document.createElement('div');
    document.body.appendChild(stage);
  });

  afterEach(() => stage.remove());

  /** Places `panel` for the geometry `at`, a fresh one unless given, and clears the stage after it. */
  function place(at: Geometry, panel = panelOf(at.panel)): ElementRef<HTMLElement> {
    updatePanelPosition(fieldIn(at), panel);
    stage.replaceChildren();

    return panel;
  }

  it('opens on the side the rule picks, over any field, panel and clipping panes', () => {
    fc.assert(fc.property(geometry, (at) => side(place(at)) === expectedSide(at)));
  });

  // The same panel is placed again on every scroll and resize, so a flip has to come back off: a panel that
  // once had to open upwards must not stay upwards for the rest of its life.
  it('remembers nothing of an earlier placement', () => {
    fc.assert(
      fc.property(geometry, geometry, fc.nat(), (first, then, height) => {
        const panel = panelOf(height);

        place({ ...first, panel: height }, panel);

        return side(place({ ...then, panel: height }, panel)) === expectedSide({ ...then, panel: height });
      })
    );
  });

  it('leaves the field untouched', () => {
    fc.assert(
      fc.property(geometry, (at) => {
        const field = fieldIn(at);

        updatePanelPosition(field, panelOf(at.panel));
        stage.replaceChildren();

        return field.nativeElement.classList.length === 0;
      })
    );
  });

  // A sheet sits on the viewport, not on the field, so the space around the field says nothing about it. The
  // position is an input, so an anchored panel that flipped can become a sheet at any time.
  it('never flips a sheet, whatever the room and wherever it was before', () => {
    fc.assert(
      fc.property(geometry, geometry, (before, at) => {
        const panel = place(before);

        panel.nativeElement.classList.add('panel-sheet');

        return side(place(at, panel)) === 'below';
      })
    );
  });

  // The window is not the box the panel has to fit in: an ancestor that clips its overflow is. A panel measured
  // against the window opens into room the pane it lives in does not have, and is cut off.
  it('flips above when the panel fits below in the window but not in the pane the field scrolls in', () => {
    expect(side(place({ field: { top: 200, bottom: 260 }, panel: 120, panes: [{ top: 40, bottom: 300 }] }))).toBe(
      'above'
    );
  });

  // The other half of the same mistake: flipping above is only an improvement while the pane has the room.
  it('stays below when the room above is the window’s rather than the pane’s', () => {
    const field = { top: viewport - 70, bottom: viewport - 10 };

    expect(side(place({ field, panel: 120, panes: [{ top: viewport - 120, bottom: viewport }] }))).toBe('below');
  });

  it('does nothing without both elements', () => {
    expect(() => updatePanelPosition(undefined, panelOf(100))).not.toThrow();
    expect(() => updatePanelPosition(new ElementRef(elementAt({ top: 0, bottom: 60 })), undefined)).not.toThrow();
  });
});
