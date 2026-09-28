import { bindField, BoundField } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of a blur the field caused itself, which is not a blur at all: `date-field` hands focus to its own
 * panel so a nested control stays clickable, which must leave the model neither committed nor touched.
 */

/** A `date-field` inside a `<form>`, which defers its value to the blur: it parses what was typed there. */
async function setup(): Promise<BoundField & { input: HTMLInputElement }> {
  const field = await bindField('date', 'template-driven', { inputs: { unicodeTokenFormat: 'dd . MM . yyyy' } });

  return { ...field, input: field.element.querySelector('input') as HTMLInputElement };
}

describe('blur contract', () => {
  beforeEach(() => configureFormidableTestBed());

  it('leaves the model untouched and uncommitted when the field takes its own blur', async () => {
    const { fixture, element, input, value, touched } = await setup();
    const panel = element.querySelector('.panel') as HTMLElement;

    input.focus();
    input.value = '12 . 05 . 2024';

    // Focus moves onto the panel, so a nested control stays clickable. That is not the user leaving.
    panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);

    expect(touched()).toBe(false);
    expect(value()).toBeNull();
  });

  it('commits and touches on the blur after the one it took', async () => {
    const { fixture, element, input, value, touched } = await setup();
    const panel = element.querySelector('.panel') as HTMLElement;

    input.focus();
    panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);

    // The flag is one-shot, so this blur counts.
    input.focus();
    input.value = '12 . 05 . 2024';
    input.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);

    expect(touched()).toBe(true);
    expect(value()).toEqual(new Date(2024, 4, 12));
  });
});
