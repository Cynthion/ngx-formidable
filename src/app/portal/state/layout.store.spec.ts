import { TestBed } from '@angular/core/testing';
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

/**
 * The panel sizes are the user's, so they are clamped to something usable and survive a reload. A drag
 * reports a raw pointer coordinate, which is unbounded — the clamp is what stops the inspector being
 * dragged off the screen or the drawer swallowing the form.
 */
describe('layout store', () => {
  let store: LayoutStore;

  beforeEach(() => {
    localStorage.clear();
    store = TestBed.inject(LayoutStore);
    store.resetInspectorWidth();
    store.resetDrawerHeight();
  });

  afterEach(() => localStorage.clear());

  it('clamps the inspector to a usable width', () => {
    store.setInspectorWidth(10);
    expect(store.inspectorWidth()).toBe(INSPECTOR_WIDTH_MIN);

    store.setInspectorWidth(100000);
    expect(store.inspectorWidth()).toBe(INSPECTOR_WIDTH_MAX);
  });

  it('clamps the drawer to a usable height', () => {
    store.setDrawerHeight(0);
    expect(store.drawerHeight()).toBe(DRAWER_HEIGHT_MIN);

    store.setDrawerHeight(100000);
    expect(store.drawerHeight()).toBe(DRAWER_HEIGHT_MAX);
  });

  it('clamps both rails beside a document to a usable width', () => {
    store.setDocsNavWidth(0);
    store.setDocsContentsWidth(100000);

    expect(store.docsNavWidth()).toBe(DOCS_RAIL_WIDTH_MIN);
    expect(store.docsContentsWidth()).toBe(DOCS_RAIL_WIDTH_MAX);
  });

  it('rounds, because a pointer reports fractions and a size is a pixel', () => {
    store.setInspectorWidth(512.4);

    expect(store.inspectorWidth()).toBe(512);
  });

  it('restores every size to its default', () => {
    store.setInspectorWidth(700);
    store.setDrawerHeight(500);
    store.setDocsNavWidth(400);
    store.setDocsContentsWidth(400);

    store.resetInspectorWidth();
    store.resetDrawerHeight();
    store.resetDocsNavWidth();
    store.resetDocsContentsWidth();

    expect(store.inspectorWidth()).toBe(INSPECTOR_WIDTH_DEFAULT);
    expect(store.drawerHeight()).toBe(DRAWER_HEIGHT_DEFAULT);
    expect(store.docsNavWidth()).toBe(DOCS_NAV_WIDTH_DEFAULT);
    expect(store.docsContentsWidth()).toBe(DOCS_CONTENTS_WIDTH_DEFAULT);
  });

  it('persists what the user dragged', () => {
    store.setInspectorWidth(640);
    store.setDrawerHeight(320);
    store.setDocsNavWidth(300);
    store.setDocsContentsWidth(260);
    store.showFieldTypes.set(false);
    TestBed.tick();

    const stored = JSON.parse(localStorage.getItem('portal.layout') ?? '{}');

    expect(stored.inspectorWidth).toBe(640);
    expect(stored.drawerHeight).toBe(320);
    expect(stored.docsNavWidth).toBe(300);
    expect(stored.docsContentsWidth).toBe(260);
    expect(stored.showFieldTypes).toBe(false);
  });

  it('survives a stored value that is no longer usable', () => {
    localStorage.setItem('portal.layout', JSON.stringify({ inspectorWidth: -50, drawerHeight: 99999 }));

    TestBed.resetTestingModule();
    const restored = TestBed.inject(LayoutStore);

    expect(restored.inspectorWidth()).toBe(INSPECTOR_WIDTH_MIN);
    expect(restored.drawerHeight()).toBe(DRAWER_HEIGHT_MAX);
  });

  it('survives storage holding something that is not a layout', () => {
    localStorage.setItem('portal.layout', 'not json');

    TestBed.resetTestingModule();

    expect(() => TestBed.inject(LayoutStore)).not.toThrow();
  });
});
