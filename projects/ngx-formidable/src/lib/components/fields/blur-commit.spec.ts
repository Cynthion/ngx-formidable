import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of focus moving onto `date-field`'s own calendar, which is not a blur at all: its month select
 * takes focus to open, and that must leave what was typed neither committed nor touched — until focus leaves
 * the field from there. Per **Typed Text Commits On Blur** in `user/fields.md`.
 */

/**
 * A `date-field` inside a `<form>` with a date typed but not yet committed, which happens on the blur, and
 * focus on its calendar's month select. Typed rather than written, because only an edit of the user's fires
 * the native `change` as the input loses focus.
 */
async function setup(): Promise<BoundField & { month: HTMLSelectElement }> {
  const field = await bindField('date', 'template-driven', {
    inputs: { unicodeTokenFormat: 'dd . MM . yyyy' },
    decorated: true,
    decoration: '<div formidableFieldLabel>Date</div>'
  });

  await userEvent.tab();
  await userEvent.keyboard('12052024');
  await expect.element(page.getByRole('combobox', { name: 'Date' })).toHaveValue('12 . 05 . 2024');
  await userEvent.click(field.element.querySelector('.toggle')!);

  const month = field.element.querySelector<HTMLSelectElement>('.pika-select-month')!;

  await userEvent.click(month);
  await expect.element(month).toHaveFocus();

  return { ...field, month };
}

describe('blur contract', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it('leaves the model uncommitted and untouched while focus is on its own calendar', async () => {
    const { fixture, touched, value } = await setup();
    await settle(fixture);

    expect(touched()).toBe(false);
    expect(value()).toBeNull();
  });

  it('commits and touches once focus leaves the field from its calendar', async () => {
    const { touched, value } = await setup();

    // A click on the page, well away from the field.
    await userEvent.click(page.elementLocator(document.documentElement), {
      position: { x: 1, y: innerHeight - 1 }
    });

    await expect.poll(touched).toBe(true);
    expect(value()).toEqual(new Date(2024, 4, 12));
  });
});
