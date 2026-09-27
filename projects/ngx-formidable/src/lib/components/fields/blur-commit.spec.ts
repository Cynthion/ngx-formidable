import { BindFieldOptions, bindField, BoundField } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of a blur: `onTouched()` is its last act. Under `updateOn: 'blur'` Angular commits the value from
 * inside `onTouched`, and only when a change is already pending — so a field that writes its value in
 * `doOnFocusChange` commits nothing if the touch went first.
 *
 * And a blur the field caused itself is not a blur at all: `date-field` hands focus to its own panel so a
 * nested control stays clickable, which must leave the control neither committed nor touched.
 */

/** A `date-field` inside a `<form>`, which defers its value to the blur: it parses what was typed there. */
async function setup(updateOn?: BindFieldOptions['updateOn']): Promise<BoundField & { input: HTMLInputElement }> {
  const field = await bindField('date', 'template-driven', {
    updateOn,
    inputs: { unicodeTokenFormat: 'dd . MM . yyyy' }
  });

  return { ...field, input: field.element.querySelector('input') as HTMLInputElement };
}

describe('blur contract', () => {
  beforeEach(() => configureFormidableTestBed());

  // The typed text only becomes a date inside the blur, so the commit that blur carries is the one that
  // has to see it.
  it('commits a value written during the blur, under updateOn blur', async () => {
    const { fixture, input, control } = await setup('blur');

    input.focus();
    input.value = '12 . 05 . 2024';
    input.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);

    expect(control.value).toEqual(new Date(2024, 4, 12));
    expect(control.touched).toBe(true);
  });

  it('leaves the control untouched and uncommitted when the field takes its own blur', async () => {
    const { fixture, element, input, control } = await setup();
    const panel = element.querySelector('.panel') as HTMLElement;

    input.focus();
    input.value = '12 . 05 . 2024';

    // Focus moves onto the panel, so a nested control stays clickable. That is not the user leaving.
    panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);

    expect(control.touched).toBe(false);
    expect(control.value).toBeNull();
  });

  it('commits and touches on the blur after the one it took', async () => {
    const { fixture, element, input, control } = await setup();
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

    expect(control.touched).toBe(true);
    expect(control.value).toEqual(new Date(2024, 4, 12));
  });
});
