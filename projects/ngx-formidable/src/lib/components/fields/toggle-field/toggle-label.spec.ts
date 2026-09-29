import { bindField } from '../../../testing/bind-field';
import { configureFormidableTestBed } from '../../../testing/test-bed';

/** Contract of the toggle's own label: `onLabel` while on, `offLabel` while off, and `onLabel` for both. */

describe('toggle label', () => {
  beforeEach(() => configureFormidableTestBed());

  const label = (element: HTMLElement) => element.querySelector('.toggle-label')!.textContent!.trim();

  it('shows onLabel while on and offLabel while off', async () => {
    const bound = await bindField('toggle', 'signal', { value: true, inputs: { onLabel: 'On', offLabel: 'Off' } });
    expect(label(bound.element)).toBe('On');

    await bound.write(false);
    expect(label(bound.element)).toBe('Off');
  });

  it('shows onLabel in both states without an offLabel', async () => {
    const bound = await bindField('toggle', 'signal', { value: true, inputs: { onLabel: 'Notify' } });
    expect(label(bound.element)).toBe('Notify');

    await bound.write(false);
    expect(label(bound.element)).toBe('Notify');
  });
});
