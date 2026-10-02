import { page, userEvent } from 'vitest/browser';
import { DOC_PAGES, DOC_PAGES_BY_SLUG } from '../docs/doc-pages';
import { renderDoc } from '../docs/markdown.helpers';
import { PRESETS_BY_KEY, presetVars } from '../model/presets';
import {
  ANATOMY_PARTS,
  LABEL_POSITION_KINDS,
  LADDER_STEPS,
  SPECIMEN_KINDS,
  STATE_COLUMNS,
  STATE_FEATURED
} from '../model/specimen';
import { THEME_TOKENS_BY_NAME } from '../model/token-manifest';
import { openPage } from '../testing/studio';
import { SpecimenPage } from './specimen-page';

const SLUGS = new Set(DOC_PAGES.map((page) => page.slug));

const LADDER_DECLARATIONS = LADDER_STEPS.flatMap((step) => step.declarations);
const MIDNIGHT = PRESETS_BY_KEY.get('midnight')!;

/**
 * The Specimen names variables, points at the decorator's own DOM and links into the documents, and all three
 * can move under it. These hold each name to the manifest — which `docs:check` holds to
 * `user/theme-reference.md` — each selector to the rendered field, and each link to an id the Docs route
 * actually renders, so none of them drifts into something that names or opens nothing.
 */
describe('specimen', () => {
  const scopeVar = (name: string) => getComputedStyle(document.querySelector('.scope')!).getPropertyValue(name).trim();
  const rootVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const step = (label: string) => page.getByRole('group', { name: 'Ladder step' }).getByRole('button', { name: label });
  const lastStep = () => step(`${LADDER_STEPS.length} ${LADDER_STEPS[LADDER_STEPS.length - 1]!.title}`);

  /** One chapter's matrix, by the id its heading links to. */
  const chapter = (id: string) => page.elementLocator(document.getElementById(id)!);

  it('names only variables the library documents', () => {
    const names = [...LADDER_DECLARATIONS.map((entry) => entry.name), ...ANATOMY_PARTS.map((part) => part.variable)];

    expect(names.filter((name) => !THEME_TOKENS_BY_NAME.has(name))).toEqual([]);
  });

  // Its last step is what picking the preset paints, so the two cannot show different things under one name.
  it('climbs to the whole Midnight preset, each declaration once', () => {
    const names = LADDER_DECLARATIONS.map((entry) => entry.name);

    expect(new Set(names).size).toBe(names.length);
    expect(Object.fromEntries(LADDER_DECLARATIONS.map((entry) => [entry.name, entry.value]))).toEqual(
      presetVars(MIDNIGHT)
    );
  });

  it('links only to documents and anchors the Docs route renders', async () => {
    await openPage(SpecimenPage);
    await userEvent.click(lastStep());
    await expect.element(lastStep()).toHaveAttribute('aria-pressed', 'true');

    const hrefs = page
      .getByRole('link')
      .elements()
      .map((link) => link.getAttribute('href')!)
      .filter((href) => href.includes('/docs/'));
    const dead = hrefs.filter((href) => {
      const [topic, anchor] = href.split('/docs/')[1]!.split('/');
      const doc = DOC_PAGES_BY_SLUG.get(topic!);

      return !doc || (anchor !== undefined && !renderDoc(doc.markdown, SLUGS).html.includes(` id="${anchor}"`));
    });

    expect(hrefs.length).toBeGreaterThan(SPECIMEN_KINDS.length);
    expect(dead).toEqual([]);
  });

  it('finds every part of the anatomy in the rendered field', async () => {
    await openPage(SpecimenPage);

    const figure = document.querySelector('.anatomy')!;

    expect(ANATOMY_PARTS.filter((part) => !figure.querySelector(part.selector)).map((part) => part.selector)).toEqual(
      []
    );
  });

  // The callouts are laid out from a `ResizeObserver`, which reports on a frame of its own.
  it('draws one callout per part, each stating a value', async () => {
    await openPage(SpecimenPage);

    const values = () => Array.from(document.querySelectorAll('.callout-value'), (el) => el.textContent?.trim());

    await expect.poll(() => values().length).toBe(ANATOMY_PARTS.length);
    expect(values().filter((value) => !value)).toEqual([]);
  });

  it('opens on a few kinds, and shows every kind in every state on request', async () => {
    await openPage(SpecimenPage);

    const cells = () => document.querySelectorAll('#states .cell');

    expect(cells().length).toBe(STATE_FEATURED.length * STATE_COLUMNS.length);

    await userEvent.click(chapter('states').getByRole('button', { name: /^Show all/ }));

    await expect.poll(() => cells().length).toBe(SPECIMEN_KINDS.length * STATE_COLUMNS.length);
    expect(Array.from(cells()).filter((cell) => cell.textContent?.includes('Required.')).length).toBe(
      SPECIMEN_KINDS.length
    );
  });

  it('shows label positions only on the kinds whose layout has room for them', async () => {
    await openPage(SpecimenPage);

    await userEvent.click(chapter('labels').getByRole('button', { name: /^Show all/ }));

    const rows = () => Array.from(document.querySelectorAll('#labels .row-name code'), (el) => el.textContent?.trim());

    await expect.poll(() => rows().length).toBe(LABEL_POSITION_KINDS.length);
    expect(rows()).not.toContain('formidable-toggle-field');
  });

  it('repaints the page, and only the page, with a preset or a ladder step', async () => {
    await openPage(SpecimenPage);

    const rootHeight = rootVar('--formidable-field-height');
    const rootRadius = rootVar('--formidable-field-border-radius');

    await userEvent.click(page.getByRole('button', { name: new RegExp(`^${PRESETS_BY_KEY.get('brutalist')!.label}`) }));

    await expect.poll(() => scopeVar('--formidable-field-border-radius')).not.toBe(rootRadius);
    expect(rootVar('--formidable-field-border-radius')).toBe(rootRadius);

    await userEvent.click(step('Defaults'));

    await expect.poll(() => scopeVar('--portal-page-background')).toBe('#ffffff');

    await userEvent.click(lastStep());

    await expect
      .poll(() => scopeVar('--formidable-field-height'))
      .toBe(presetVars(MIDNIGHT)['--formidable-field-height']!);
    expect(scopeVar('--portal-page-background')).toBe(MIDNIGHT.page.background);
    expect(rootVar('--formidable-field-height')).toBe(rootHeight);
    expect(document.querySelectorAll('.code-line').length).toBe(LADDER_DECLARATIONS.length);
  });
});
