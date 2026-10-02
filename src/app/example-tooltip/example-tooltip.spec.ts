import { Component } from '@angular/core';
import { page, userEvent } from 'vitest/browser';
import { openPage } from '../portal/testing/studio';
import { ExampleTooltip } from './example-tooltip';

@Component({
  imports: [ExampleTooltip],
  template: `
    <example-tooltip text="Arrow keys step it." />
    <button type="button">Elsewhere</button>
  `
})
class TooltipHost {}

/**
 * The tooltip a decorator's label adornment projects in the portal. It closes from listeners on the document,
 * outside anything Angular ticks, so a close that never repaints leaves it on screen.
 */
describe('example-tooltip', () => {
  const trigger = () => page.getByRole('button', { name: 'Help' });
  const tooltip = () => page.getByRole('tooltip');

  const shown = () => expect.element(tooltip()).toHaveStyle({ opacity: '1' });
  const hidden = () => expect.element(tooltip()).toHaveStyle({ opacity: '0' });

  beforeEach(async () => {
    await openPage(TooltipHost);
  });

  it('opens on its trigger, closes on a click elsewhere, and opens again', async () => {
    await userEvent.click(trigger());
    await shown();

    await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }));
    await hidden();

    await userEvent.click(trigger());
    await shown();
  });

  it('closes on Escape', async () => {
    await userEvent.click(trigger());
    await shown();

    await userEvent.keyboard('{Escape}');
    await hidden();
  });
});
