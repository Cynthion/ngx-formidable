import { page, userEvent } from 'vitest/browser';
import { PREVIEW_FIELDS } from '../model/preview-form.definition';
import { INSPECTOR_WIDTH_DEFAULT, INSPECTOR_WIDTH_MIN } from '../state/layout.store';
import { ComponentFixture } from '@angular/core/testing';
import { editField, openPanel, openStudio, settle, tab, WIDE } from '../testing/studio';

/**
 * Nothing in the panel is painted outside its own gutter, at either end of the width the divider allows.
 *
 * Not a pixel assertion: it reads no measurement off the stylesheet, only that a control fits the column it
 * was given. The defect it exists for is the box model — a `width: 100%` control in a padded column adds its
 * own padding and border outside that width, so it bleeds into the gutter at every width, and the narrower
 * the panel the more of it there is to see.
 */
describe('inspector layout', () => {
  let fixture: ComponentFixture<unknown>;

  const panel = () => document.querySelector('portal-inspector')!;
  const body = () => panel().querySelector<HTMLElement>('.body')!;

  /** Drags the divider from the keyboard to the narrowest width it allows: the panel only gets narrower. */
  async function narrowest(): Promise<void> {
    await userEvent.click(tab('Theme'));
    await userEvent.tab({ shift: true });

    for (let width = INSPECTOR_WIDTH_DEFAULT; width > INSPECTOR_WIDTH_MIN; width -= 24) {
      await userEvent.keyboard('{ArrowRight}');
    }

    await expect.poll(() => panel().getBoundingClientRect().width).toBeLessThan(INSPECTOR_WIDTH_MIN + 24);
  }

  /** Every element whose right edge lands beyond the scroll container's own content box, once it has rendered. */
  async function overflowing(where: string): Promise<string[]> {
    await settle(fixture);

    const limit = body().getBoundingClientRect().left + body().clientWidth;

    return Array.from(body().querySelectorAll<HTMLElement>('*'))
      .filter((element) => element.getBoundingClientRect().right > limit + 0.5)
      .map((element) => `${where}: ${element.tagName.toLowerCase()}.${element.className || '—'}`);
  }

  /** The view as it opens, then again with each of its sections opened in turn. */
  async function eachSection(where: string, report: (where: string) => Promise<void>): Promise<void> {
    await report(where);

    const triggers = page.elementLocator(body()).getByRole('heading', { level: 3 }).getByRole('button');

    for (let i = 0; i < triggers.elements().length; i++) {
      if (triggers.nth(i).element().getAttribute('aria-expanded') !== 'true') await userEvent.click(triggers.nth(i));
      await report(`${where} §${i + 1}`);
    }
  }

  /** Every tab, half, scope and section the panel can show. */
  async function eachView(report: (where: string) => Promise<void>): Promise<void> {
    for (const [area, half] of [
      ['Theme', 'Design'],
      ['Theme', 'Variables'],
      ['Form', 'Structure']
    ] as const) {
      await openPanel(area, half);
      await eachSection(`${area}/${half}`, report);
    }

    for (const scope of ['App Defaults', 'The Form', 'This Field']) {
      await openPanel('Form', 'Settings', scope);
      await report(`Form/Settings/${scope}`);
    }

    for (const [direction, files] of [
      ['Export', ['Theme', 'Template', 'Component', 'Schema', 'App Config']],
      ['Import', ['Theme', 'Template']]
    ] as const) {
      for (const file of files) {
        await openPanel('Export & Import', direction, file);
        await report(`Export & Import/${direction}/${file}`);
      }
    }
  }

  async function sweep(): Promise<string[]> {
    const failures: string[] = [];

    await eachView(async (where) => {
      failures.push(...(await overflowing(where)));
    });

    return failures;
  }

  it('paints nothing outside the gutter at the width it opens at', async () => {
    fixture = await openStudio();

    expect(panel().getBoundingClientRect().width).toBeCloseTo(INSPECTOR_WIDTH_DEFAULT, 0);
    expect(await sweep()).toEqual([]);
  });

  it('paints nothing outside the gutter at the narrowest width the divider allows', async () => {
    fixture = await openStudio();
    await narrowest();

    expect(await sweep()).toEqual([]);
  });

  // Each area's halves are longer than the panel, so the strip saying which half is showing has to survive
  // the scroll rather than leave with the content.
  it('keeps the sub-tab strip at the top of the panel scrolled to its end', async () => {
    // Short enough that every view below has to scroll.
    fixture = await openStudio({ width: WIDE.width, height: 600 });

    for (const [area, half] of [
      ['Theme', 'Design'],
      ['Form', 'Settings'],
      ['Export & Import', 'Export']
    ] as const) {
      await openPanel(area, half);

      body().scrollTop = body().scrollHeight;

      const strip = panel().querySelector('.sub-tabs')!;

      // Scrolled for real, or the strip being at the top would prove nothing.
      expect(body().scrollTop, half).toBeGreaterThan(100);
      expect(strip.getBoundingClientRect().top - body().getBoundingClientRect().top, half).toBeCloseTo(0, 0);
    }
  });

  // The strip sticks at the chrome's z-index, so it has to stay inside the body: above the divider it hid the
  // divider's accent line and took the drag along its own height.
  it('keeps the divider above the sub-tab strip', async () => {
    fixture = await openStudio();

    const divider = panel().querySelector('.divider')!;
    const edge = divider.getBoundingClientRect();
    const strip = panel().querySelector('.sub-tabs')!.getBoundingClientRect();

    expect(document.elementFromPoint(edge.left + edge.width / 2, strip.top + strip.height / 2)).toBe(divider);
  });

  // Open, the toggle keeps the content's gutter, measured against the sub-tab strip so a scrollbar in the body
  // cannot skew it. Collapsed, the rail holds nothing else, so the toggle centres.
  it('lines the toggle up with the content open and centres it collapsed', async () => {
    fixture = await openStudio();

    const toggle = () => page.getByRole('button', { name: /^(Collapse|Expand) the editor panel$/ });
    const head = panel().querySelector('.head')!.getBoundingClientRect();
    const strip = panel().querySelector('.sub-tabs')!;
    const stripGutter = strip.getBoundingClientRect().right - strip.lastElementChild!.getBoundingClientRect().right;

    expect(head.right - toggle().element().getBoundingClientRect().right).toBeCloseTo(stripGutter, 0);

    await userEvent.click(toggle());
    await expect.element(page.getByRole('button', { name: 'Expand the editor panel' })).toBeVisible();

    const rail = panel().getBoundingClientRect();
    const button = toggle().element().getBoundingClientRect();
    const left = button.left - (rail.left + panel().clientLeft);
    const right = rail.left + panel().clientLeft + panel().clientWidth - button.right;

    expect(left).toBeGreaterThan(0);
    expect(left).toBeCloseTo(right, 0);
  });

  // The field editor renders a different set of controls per kind, so one selected field proves one of them.
  it('paints nothing outside the gutter for any field the editor can open', async () => {
    fixture = await openStudio();
    await narrowest();
    await openPanel('Form', 'Settings', 'This Field');

    const failures: string[] = [];

    for (const field of PREVIEW_FIELDS) {
      await editField(field.label);
      failures.push(...(await overflowing(`${field.kind} "${field.label}"`)));
    }

    expect(failures).toEqual([]);
  });
});
