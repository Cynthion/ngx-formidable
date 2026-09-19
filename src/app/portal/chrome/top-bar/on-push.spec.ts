import { Location } from '@angular/common';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PORTAL_ROUTES } from '../../portal.routes';
import { InspectorStore } from '../../state/inspector.store';
import { ThemeStore } from '../../state/theme.store';
import { TopBarComponent } from './top-bar.component';

/**
 * Every component in the repo is `OnPush`, and almost all of the portal's state moves through template event
 * handlers, which Angular marks dirty for free. This pins the two paths that do not: the copy button's
 * confirmation is cleared inside a `setTimeout` with nothing around it to repaint, and the change count comes
 * from a store this component never hears from.
 *
 * Both are signals, which is what marks the view. Make either a plain field again and the button freezes,
 * and nothing else would notice.
 */
describe('top bar OnPush contract', () => {
  let fixture: ComponentFixture<TopBarComponent>;
  let root: HTMLElement;
  let theme: ThemeStore;

  function settle(): void {
    fixture.detectChanges();
    tick(50);
    fixture.detectChanges();
  }

  function copyButton(): HTMLButtonElement {
    return root.querySelector('.copy-button') as HTMLButtonElement;
  }

  function count(): HTMLElement {
    return root.querySelector('.count') as HTMLElement;
  }

  function exportButton(): HTMLButtonElement {
    return root.querySelector('.export-button') as HTMLButtonElement;
  }

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({ providers: [provideRouter(PORTAL_ROUTES)] });

    theme = TestBed.inject(ThemeStore);
    theme.reset();

    fixture = TestBed.createComponent(TopBarComponent);
    root = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    document.documentElement.removeAttribute('style');
    localStorage.clear();
  });

  it('clears the copied confirmation on its own, from a callback nothing ticks', fakeAsync(() => {
    settle();
    expect(copyButton().textContent).toContain('Copy Theme');

    copyButton().click();
    settle();
    tick(2000);
    fixture.detectChanges();

    expect(copyButton().textContent).toContain('Copy Theme');
    expect(copyButton().classList).not.toContain('copied');
  }));

  it('repaints the change count from the store, with nothing pumping the view', fakeAsync(() => {
    settle();
    const before = theme.changeCount();

    expect(count().textContent?.trim()).toBe(String(before));

    // A variable no scheme sets, so the count has to move.
    theme.setVariable('--formidable-panel-max-height', '42dvh');
    settle();

    expect(theme.changeCount()).toBe(before + 1);
    expect(count().textContent?.trim()).toBe(String(before + 1));
  }));

  // The copy button copies the theme; the control beside it reaches everything there is to take away,
  // which is the theme CSS and the template both.
  it('opens the export beside the copy button', fakeAsync(() => {
    settle();

    const inspector = TestBed.inject(InspectorStore);
    inspector.tab.set('form');

    expect(exportButton().textContent).toContain('Export');

    exportButton().click();
    settle();

    expect(inspector.tab()).toBe('export');
    expect(inspector.exportSection()).toBe('theme');
  }));

  // `exact` is right for `/` and wrong for `/docs`, which is only ever seen with a document open.
  //
  // Not `fakeAsync`: the routes are `loadComponent`, and a real dynamic `import()` is not something `tick()`
  // can flush. Nothing performs the initial navigation in a bare component test either, so `/` is explicit.
  it('keeps the Docs tab lit on a document route', async () => {
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    const tabFor = (label: string) =>
      Array.from(root.querySelectorAll('.tab')).find((el) => (el.textContent ?? '').trim() === label)!;

    // The bar has to exist before it can follow a navigation: `routerLinkActive` subscribes on init.
    fixture.detectChanges();

    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(tabFor('Studio').classList).toContain('active');
    expect(tabFor('Docs').classList).not.toContain('active');

    await router.navigateByUrl('/docs/theming');
    fixture.detectChanges();

    expect(location.path()).toBe('/docs/theming');
    expect(tabFor('Docs').classList).toContain('active');
    expect(tabFor('Studio').classList).not.toContain('active');
  });
});
