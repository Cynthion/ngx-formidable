import { effect, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'portal.layout';

export const INSPECTOR_WIDTH_DEFAULT = 420;
export const INSPECTOR_WIDTH_MIN = 300;
export const INSPECTOR_WIDTH_MAX = 900;

export const DRAWER_HEIGHT_DEFAULT = 280;
export const DRAWER_HEIGHT_MIN = 140;
export const DRAWER_HEIGHT_MAX = 700;

interface PersistedLayout {
  readonly inspectorWidth: number;
  readonly drawerHeight: number;
  readonly drawerOpen: boolean;
  readonly showFieldTypes: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * The workspace: how wide the inspector is, how tall the model drawer is, and which of the preview's own
 * annotations are showing.
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

  private persist(): void {
    const state: PersistedLayout = {
      inspectorWidth: this.inspectorWidth(),
      drawerHeight: this.drawerHeight(),
      drawerOpen: this.drawerOpen(),
      showFieldTypes: this.showFieldTypes()
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
