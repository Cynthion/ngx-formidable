import { TestBed } from '@angular/core/testing';
import fc from 'fast-check';
import {
  DOCS_CONTENTS_WIDTH_DEFAULT,
  DOCS_NAV_WIDTH_DEFAULT,
  DOCS_RAIL_WIDTH_MAX,
  DOCS_RAIL_WIDTH_MIN,
  DRAWER_HEIGHT_DEFAULT,
  DRAWER_HEIGHT_MAX,
  DRAWER_HEIGHT_MIN,
  INSPECTOR_WIDTH_DEFAULT,
  INSPECTOR_WIDTH_MAX,
  INSPECTOR_WIDTH_MIN,
  LayoutStore
} from './layout.store';

/** One size a divider sets: how it is read, set and restored, and what it is held to. */
interface Size {
  readonly name: string;
  readonly read: (store: LayoutStore) => number;
  readonly set: (store: LayoutStore, size: number) => void;
  readonly reset: (store: LayoutStore) => void;
  readonly min: number;
  readonly max: number;
  readonly fallback: number;
}

const SIZES: readonly Size[] = [
  {
    name: 'inspector width',
    read: (store) => store.inspectorWidth(),
    set: (store, size) => store.setInspectorWidth(size),
    reset: (store) => store.resetInspectorWidth(),
    min: INSPECTOR_WIDTH_MIN,
    max: INSPECTOR_WIDTH_MAX,
    fallback: INSPECTOR_WIDTH_DEFAULT
  },
  {
    name: 'drawer height',
    read: (store) => store.drawerHeight(),
    set: (store, size) => store.setDrawerHeight(size),
    reset: (store) => store.resetDrawerHeight(),
    min: DRAWER_HEIGHT_MIN,
    max: DRAWER_HEIGHT_MAX,
    fallback: DRAWER_HEIGHT_DEFAULT
  },
  {
    name: 'docs navigation width',
    read: (store) => store.docsNavWidth(),
    set: (store, size) => store.setDocsNavWidth(size),
    reset: (store) => store.resetDocsNavWidth(),
    min: DOCS_RAIL_WIDTH_MIN,
    max: DOCS_RAIL_WIDTH_MAX,
    fallback: DOCS_NAV_WIDTH_DEFAULT
  },
  {
    name: 'docs contents width',
    read: (store) => store.docsContentsWidth(),
    set: (store, size) => store.setDocsContentsWidth(size),
    reset: (store) => store.resetDocsContentsWidth(),
    min: DOCS_RAIL_WIDTH_MIN,
    max: DOCS_RAIL_WIDTH_MAX,
    fallback: DOCS_CONTENTS_WIDTH_DEFAULT
  }
];

/** Anything a stored key may hold: any number, which JSON writes `null` for unless finite, or any JSON. */
const ANY = fc.oneof(fc.double(), fc.jsonValue());

/** Whatever storage may hold under the layout's key: text, any JSON, or a layout with anything in it. */
const STORED = fc.oneof(
  fc.string(),
  fc.jsonValue().map((value) => JSON.stringify(value)),
  fc
    .record(
      {
        inspectorWidth: ANY,
        drawerHeight: ANY,
        drawerOpen: ANY,
        showFieldTypes: ANY,
        docsNavWidth: ANY,
        docsContentsWidth: ANY
      },
      { requiredKeys: [] }
    )
    .map((layout) => JSON.stringify(layout))
);

/** A size the page can lay out: a whole pixel within its limits. */
function expectUsable(size: Size, held: number): void {
  expect(Number.isInteger(held), size.name).toBe(true);
  expect(held, size.name).toBeGreaterThanOrEqual(size.min);
  expect(held, size.name).toBeLessThanOrEqual(size.max);
}

/** The store as a page load builds it, from what storage holds. */
function reload(): LayoutStore {
  TestBed.resetTestingModule();

  return TestBed.inject(LayoutStore);
}

/**
 * The panel sizes are the user's, so they are held to something usable and survive a reload. A drag reports a
 * raw pointer coordinate, which is unbounded and fractional: the limits are what stop the inspector being
 * dragged off the screen or the drawer swallowing the form.
 */
describe('layout store', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('holds any size a divider reports to a whole pixel within its limits', () => {
    const store = TestBed.inject(LayoutStore);

    for (const size of SIZES) {
      // Any number, and as often one inside the limits, where a drag mostly reports.
      const reports = fc.oneof(fc.double({ noNaN: true }), fc.double({ min: size.min, max: size.max, noNaN: true }));

      fc.assert(
        fc.property(reports, (reported) => {
          size.set(store, reported);

          const held = size.read(store);

          expectUsable(size, held);
          if (reported >= size.min && reported <= size.max) expect(Math.abs(held - reported)).toBeLessThanOrEqual(0.5);
        })
      );
    }
  });

  it('restores every size to its default', () => {
    const store = TestBed.inject(LayoutStore);

    for (const size of SIZES) {
      fc.assert(
        fc.property(fc.double({ noNaN: true }), (reported) => {
          size.set(store, reported);
          size.reset(store);

          expect(size.read(store), size.name).toBe(size.fallback);
        })
      );
    }
  });

  it('comes back after a reload as the user left it', () => {
    fc.assert(
      fc.property(
        fc.tuple(...SIZES.map((size) => fc.integer({ min: size.min, max: size.max }))),
        fc.boolean(),
        fc.boolean(),
        (sizes, drawerOpen, showFieldTypes) => {
          const store = reload();

          SIZES.forEach((size, index) => size.set(store, sizes[index]!));
          store.drawerOpen.set(drawerOpen);
          store.showFieldTypes.set(showFieldTypes);
          TestBed.tick();

          const restored = reload();

          expect(SIZES.map((size) => size.read(restored))).toEqual(sizes);
          expect(restored.drawerOpen()).toBe(drawerOpen);
          expect(restored.showFieldTypes()).toBe(showFieldTypes);
        }
      )
    );
  });

  it('comes back usable from anything storage holds', () => {
    fc.assert(
      fc.property(STORED, (stored) => {
        localStorage.setItem('portal.layout', stored);

        const restored = reload();

        for (const size of SIZES) expectUsable(size, size.read(restored));
        expect(typeof restored.drawerOpen()).toBe('boolean');
        expect(typeof restored.showFieldTypes()).toBe('boolean');
      })
    );
  });
});
