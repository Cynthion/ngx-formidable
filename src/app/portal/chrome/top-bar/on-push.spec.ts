import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { onTestFinished } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { App } from '../../../app';
import { openPage, openPanel, openSection, openStudio } from '../../testing/studio';
import { TopBar } from './top-bar';

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
  const copy = () => page.getByRole('button', { name: /^(Copy Theme|Copied) \d+$/ });
  const count = () => Number(copy().element().querySelector('.count')!.textContent);

  it('clears the copied confirmation on its own, from a callback nothing ticks', async () => {
    // The runner's frame may not write to the clipboard, and the confirmation only follows a write that took.
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    onTestFinished(() => write.mockRestore());

    await openPage(TopBar);
    await userEvent.click(copy());

    await expect.poll(() => copy().element().textContent).toContain('Copied');
    await expect.poll(() => /Copy\s*Theme/.test(copy().element().textContent!), { timeout: 3000 }).toBe(true);
    expect(copy().element().classList).not.toContain('copied');
  });

  it('repaints the change count from the store, with nothing pumping the view', async () => {
    await openStudio();

    // The sample opens on a preset that is not the shipped one, and the shipped one changes nothing.
    expect(count()).toBeGreaterThan(0);

    await openPanel('Theme', 'Design');
    await openSection('Presets');
    await userEvent.click(page.getByRole('button').filter({ has: page.getByText('Enterprise', { exact: true }) }));

    await expect.poll(count).toBe(0);
  });

  // The theme is the one thing to take away that stands on its own. The template binds names only its
  // component defines, so a one-click copy of it alone would hand over code that does not compile.
  it('offers one copy, and it is the theme', async () => {
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    onTestFinished(() => write.mockRestore());

    await openPage(TopBar);

    expect(page.getByRole('button', { name: /^Cop(y|ied)/ }).elements()).toEqual([copy().element()]);

    await userEvent.click(copy());

    expect(write).toHaveBeenCalledWith(expect.stringMatching(/^:root \{/m));
  });

  // `exact` is right for `/` and wrong for `/docs`, which is only ever seen with a document open.
  it('keeps the Docs tab lit on a document route', async () => {
    await openPage(App);

    const tab = (label: string) => page.getByRole('navigation', { name: 'Portal' }).getByRole('link', { name: label });

    // What the browser does on load; nothing performs the initial navigation in a test.
    await TestBed.inject(Router).navigateByUrl('/');

    await expect.element(tab('Studio')).toHaveClass('active');
    await expect.element(tab('Docs')).not.toHaveClass('active');

    await userEvent.click(tab('Docs'));
    // The contents rail is the first of the page's asides.
    await userEvent.click(page.getByRole('complementary').first().getByRole('link', { name: 'Theming', exact: true }));

    // The test bed routes on a mock of the browser's location, so the path is Angular's to read.
    await expect.poll(() => TestBed.inject(Location).path()).toBe('/docs/theming');
    await expect.element(tab('Docs')).toHaveClass('active');
    await expect.element(tab('Studio')).not.toHaveClass('active');
  });
});
