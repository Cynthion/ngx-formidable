import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  inject,
  OnDestroy,
  viewChild
} from '@angular/core';
import { TopBarComponent } from './chrome/top-bar/top-bar.component';
import { InspectorComponent } from './inspector/inspector.component';
import { StageComponent } from './stage/stage.component';
import { LayoutStore } from './state/layout.store';

const NARROW = '(max-width: 900px)';

/**
 * The portal shell: a fixed top bar, the stage, and the inspector.
 *
 * Below the two-column breakpoint the inspector becomes a bottom sheet and the stage keeps only the height
 * it leaves. A library `sheet` panel fills the bottom of that stage, so when one opens the inspector
 * collapses to leave it the height — the decorator's own `has-open-sheet` class is what says so, which is
 * why this watches for it rather than tracking panel state.
 */
@Component({
  selector: 'portal-root',
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBarComponent, StageComponent, InspectorComponent]
})
export class PortalComponent implements OnDestroy {
  private readonly doc = inject(DOCUMENT);
  private readonly layout = inject(LayoutStore);

  private readonly stageRef = viewChild.required(StageComponent, { read: ElementRef<HTMLElement> });

  private readonly narrow = this.doc.defaultView?.matchMedia(NARROW) ?? null;
  private observer: MutationObserver | null = null;
  private collapsedForSheet = false;

  constructor() {
    // After the first render, not in a microtask: the stage's element does not exist until the view does.
    afterNextRender(() => this.watchForSheets());
  }

  public ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private watchForSheets(): void {
    const stage = this.stageRef().nativeElement as HTMLElement;

    this.observer = new MutationObserver(() => this.onStageMutated(stage));
    this.observer.observe(stage, { attributes: true, attributeFilter: ['class'], subtree: true });
  }

  private onStageMutated(stage: HTMLElement): void {
    if (!this.narrow?.matches) return;

    const sheetOpen = !!stage.querySelector('.has-open-sheet');

    if (sheetOpen && !this.layout.inspectorCollapsed()) {
      this.collapsedForSheet = true;
      this.layout.inspectorCollapsed.set(true);
    } else if (!sheetOpen && this.collapsedForSheet) {
      this.collapsedForSheet = false;
      this.layout.inspectorCollapsed.set(false);
    }
  }
}
