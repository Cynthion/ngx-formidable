import { page, userEvent } from 'vitest/browser';
import { bindField } from '../../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../../testing/test-bed';

/** Contract of the toggle's own label: `onLabel` while on, `offLabel` while off, and `onLabel` for both. */

describe('toggle label', () => {
  beforeEach(() => configureFormidableTestBed());

  const toggle = () => page.getByRole('switch');

  it('shows onLabel while on and offLabel while off', async () => {
    await bindField('toggle', 'signal', { value: true, inputs: { onLabel: 'On', offLabel: 'Off' } });
    await expect.element(toggle()).toHaveTextContent('On');

    await userEvent.click(toggle());
    await expect.element(toggle()).toHaveTextContent('Off');
  });

  it('shows onLabel in both states without an offLabel', async () => {
    const bound = await bindField('toggle', 'signal', { value: true, inputs: { onLabel: 'Notify' } });
    await expect.element(toggle()).toHaveTextContent('Notify');

    await userEvent.click(toggle());
    await expect.element(toggle()).toHaveAttribute('aria-checked', 'false');
    await settle(bound.fixture);

    expect(toggle().element()).toHaveTextContent('Notify');
  });
});
