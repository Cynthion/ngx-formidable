import { effect, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'portal.layout';

export const INSPECTOR_WIDTH_DEFAULT = 420;
export const INSPECTOR_WIDTH_MIN = 300;
export const INSPECTOR_WIDTH_MAX = 900;

export const DRAWER_HEIGHT_DEFAULT = 280;
export const DRAWER_HEIGHT_MIN = 140;
export const DRAWER_HEIGHT_MAX = 700;

export const DOCS_NAV_WIDTH_DEFAULT = 230;
export const DOCS_CONTENTS_WIDTH_DEFAULT = 210;
export const DOCS_RAIL_WIDTH_MIN = 150;
export const DOCS_RAIL_WIDTH_MAX = 480;

interface PersistedLayout {
  readonly inspectorWidth: number;
  readonly drawerHeight: number;
  readonly drawerOpen: boolean;
  readonly showFieldTypes: boolean;
  readonly docsNavWidth: number;
  readonly docsContentsWidth: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * The workspace: how wide the inspector is, how tall the model drawer is, how wide the two rails beside a
 * document are, and which of the preview's own annotations are showing.
 *
 * The two sizes are the user's, so they persist. They are held here rather than on the components that use
 * them because the divider that changes a size and the panel that takes it are siblings, not parent and
 * child.
 */
@Injectable({ providedIn: 'root' })
export class LayoutStore {
  public readonly inspectorWidth = signal(INSPECTOR_WIDTH_DEFAULT);
  public readonly inspectorCollapsed = signal(false);

  public readonly drawerHeight = signal(DRAWER_HEIGHT_DEFAULT);
  public readonly drawerOpen = signal(false);

  public readonly docsNavWidth = signal(DOCS_NAV_WIDTH_DEFAULT);
  public readonly docsContentsWidth = signal(DOCS_CONTENTS_WIDTH_DEFAULT);

  /** The chip naming each field's component. It is the portal's annotation, not part of the form. */
  public readonly showFieldTypes = signal(true);

  /** The accessibility readout beside each field. Off by default: it is an inspection, not the page. */
  public readonly showAccessibility = signal(false);

  constructor() {
    this.restore();

    effect(() => this.persist());
  }

  public setInspectorWidth(width: number): void {
    this.inspectorWidth.set(clamp(width, INSPECTOR_WIDTH_MIN, INSPECTOR_WIDTH_MAX));
  }

  public resetInspectorWidth(): void {
    this.inspectorWidth.set(INSPECTOR_WIDTH_DEFAULT);
  }

  public setDrawerHeight(height: number): void {
    this.drawerHeight.set(clamp(height, DRAWER_HEIGHT_MIN, DRAWER_HEIGHT_MAX));
  }

  public resetDrawerHeight(): void {
    this.drawerHeight.set(DRAWER_HEIGHT_DEFAULT);
  }

  public setDocsNavWidth(width: number): void {
    this.docsNavWidth.set(clamp(width, DOCS_RAIL_WIDTH_MIN, DOCS_RAIL_WIDTH_MAX));
  }

  public resetDocsNavWidth(): void {
    this.docsNavWidth.set(DOCS_NAV_WIDTH_DEFAULT);
  }

  public setDocsContentsWidth(width: number): void {
    this.docsContentsWidth.set(clamp(width, DOCS_RAIL_WIDTH_MIN, DOCS_RAIL_WIDTH_MAX));
  }

  public resetDocsContentsWidth(): void {
    this.docsContentsWidth.set(DOCS_CONTENTS_WIDTH_DEFAULT);
  }

  private persist(): void {
    const state: PersistedLayout = {
      inspectorWidth: this.inspectorWidth(),
      drawerHeight: this.drawerHeight(),
      drawerOpen: this.drawerOpen(),
      showFieldTypes: this.showFieldTypes(),
      docsNavWidth: this.docsNavWidth(),
      docsContentsWidth: this.docsContentsWidth()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A blocked or full storage is not a reason to stop laying the page out.
    }
  }

  private restore(): void {
    const stored = this.readStored();

    if (!stored) return;

    if (Number.isFinite(stored.inspectorWidth)) this.setInspectorWidth(stored.inspectorWidth);
    if (Number.isFinite(stored.drawerHeight)) this.setDrawerHeight(stored.drawerHeight);
    if (typeof stored.drawerOpen === 'boolean') this.drawerOpen.set(stored.drawerOpen);
    if (typeof stored.showFieldTypes === 'boolean') this.showFieldTypes.set(stored.showFieldTypes);
    if (Number.isFinite(stored.docsNavWidth)) this.setDocsNavWidth(stored.docsNavWidth);
    if (Number.isFinite(stored.docsContentsWidth)) this.setDocsContentsWidth(stored.docsContentsWidth);
  }

  private readStored(): PersistedLayout | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      return raw ? (JSON.parse(raw) as PersistedLayout) : null;
    } catch {
      return null;
    }
  }
}
