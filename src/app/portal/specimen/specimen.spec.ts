import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';
import { DOC_PAGES, DOC_PAGES_BY_SLUG } from '../docs/doc-pages';
import { renderDoc } from '../docs/markdown.helpers';
import {
  ANATOMY_PARTS,
  LABEL_POSITION_KINDS,
  LADDER_STEPS,
  SPECIMEN_KINDS,
  STATE_COLUMNS,
  STATE_FEATURED
} from '../model/specimen';
import { THEME_TOKENS_BY_NAME } from '../model/token-manifest';
import { PORTAL_ROUTES } from '../portal.routes';
import { ThemeStore } from '../state/theme.store';
import { SpecimenPageComponent } from './specimen-page.component';

const SLUGS = new Set(DOC_PAGES.map((page) => page.slug));

/**
 * The Specimen names variables, points at the decorator's own DOM and links into the documents, and all three
 * can move under it. These hold each name to the manifest — which `docs:check` holds to
 * `user/theme-reference.md` — each selector to the rendered field, and each link to an id the Docs route
 * actually renders, so none of them drifts into something that names or opens nothing.
 */
describe('specimen', () => {
  let fixture: ComponentFixture<SpecimenPageComponent>;
  let root: HTMLElement;

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      tick(100);
    }
    fixture.detectChanges();
  }

  const scopeVar = (name: string) => getComputedStyle(root.querySelector('.scope')!).getPropertyValue(name).trim();
  const rootVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const chip = (label: string) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('.chip')).find((b) => b.textContent?.trim() === label)!;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideNgxMask(), provideRouter(PORTAL_ROUTES)] });
    TestBed.inject(ThemeStore).reset();

    fixture = TestBed.createComponent(SpecimenPageComponent);
    root = fixture.nativeElement as HTMLElement;
    document.body.append(root);
  });

  afterEach(() => {
    root.remove();
    document.documentElement.removeAttribute('style');
    localStorage.clear();
  });

  it('names only variables the library documents', () => {
    const names = [...LADDER_STEPS.map((step) => step.name), ...ANATOMY_PARTS.map((part) => part.variable)];

    expect(names.filter((name) => !THEME_TOKENS_BY_NAME.has(name))).toEqual([]);
  });

  it('links only to documents and anchors the Docs route renders', fakeAsync(() => {
    settle();
    chip(String(LADDER_STEPS.length)).click();
    settle();

    const hrefs = Array.from(root.querySelectorAll('a[href*="/docs/"]')).map((a) => a.getAttribute('href')!);
    const dead = hrefs.filter((href) => {
      const [topic, anchor] = href.split('/docs/')[1]!.split('/');
      const page = DOC_PAGES_BY_SLUG.get(topic!);

      return !page || (anchor !== undefined && !renderDoc(page.markdown, SLUGS).html.includes(` id="${anchor}"`));
    });

    expect(hrefs.length).toBeGreaterThan(SPECIMEN_KINDS.length);
    expect(dead).toEqual([]);
  }));

  it('finds every part of the anatomy in the rendered field', fakeAsync(() => {
    settle();

    const figure = root.querySelector('.anatomy')!;

    expect(ANATOMY_PARTS.filter((part) => !figure.querySelector(part.selector)).map((part) => part.selector)).toEqual(
      []
    );
  }));

  // The callouts are laid out from a `ResizeObserver`, which reports on a real frame rather than on the fake
  // clock, so this one waits for that frame.
  it('draws one callout per part, each stating a value', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
    fixture.detectChanges();

    const values = Array.from(root.querySelectorAll('.callout-value')).map((el) => el.textContent?.trim());

    expect(values.length).toBe(ANATOMY_PARTS.length);
    expect(values.filter((value) => !value)).toEqual([]);
  });

  it('opens on a few kinds, and shows every kind in every state on request', fakeAsync(() => {
    settle();

    expect(root.querySelectorAll('#states .cell').length).toBe(STATE_FEATURED.length * STATE_COLUMNS.length);

    root.querySelector<HTMLButtonElement>('#states .more')!.click();
    settle();

    const states = root.querySelector('#states')!;
    const invalid = Array.from(states.querySelectorAll('form[portalReportsRequired]'));

    expect(states.querySelectorAll('.cell').length).toBe(SPECIMEN_KINDS.length * STATE_COLUMNS.length);
    expect(invalid.length).toBe(SPECIMEN_KINDS.length);
    expect(invalid.filter((form) => !form.textContent?.includes('Required.')).length).toBe(0);
  }));

  it('shows label positions only on the kinds whose layout has room for them', fakeAsync(() => {
    settle();
    root.querySelector<HTMLButtonElement>('#labels .more')!.click();
    settle();

    const rows = Array.from(root.querySelectorAll('#labels .row-name code')).map((el) => el.textContent?.trim());

    expect(rows.length).toBe(LABEL_POSITION_KINDS.length);
    expect(rows).not.toContain('formidable-toggle-field');
  }));

  it('repaints the page, and only the page, with a preset or a ladder step', fakeAsync(() => {
    settle();

    const rootHeight = rootVar('--formidable-field-height');
    const rootRadius = rootVar('--formidable-field-border-radius');

    root.querySelector<HTMLButtonElement>('[data-preset="brutalist"]')!.click();
    settle();

    expect(scopeVar('--formidable-field-border-radius')).not.toBe(rootRadius);
    expect(rootVar('--formidable-field-border-radius')).toBe(rootRadius);

    chip(String(LADDER_STEPS.length)).click();
    settle();

    expect(scopeVar('--formidable-field-height')).toBe(
      LADDER_STEPS.find((step) => step.name === '--formidable-field-height')!.value
    );
    expect(rootVar('--formidable-field-height')).toBe(rootHeight);
    expect(root.querySelectorAll('.code-line').length).toBe(LADDER_STEPS.length);
  }));
});
