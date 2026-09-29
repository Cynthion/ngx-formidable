import { bindField, BoundField } from '../../testing/bind-field';
import { click } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of focus moving onto `date-field`'s own calendar, which is not a blur at all: its month select
 * takes focus to open, and that must leave what was typed neither committed nor touched — until focus leaves
 * the field from there.
 */

/**
 * A `date-field` inside a `<form>` with a date typed but not yet committed, which happens on the blur, and
 * focus on its calendar's month select.
 */
async function setup(): Promise<BoundField & { select: HTMLSelectElement }> {
  const field = await bindField('date', 'template-driven', { inputs: { unicodeTokenFormat: 'dd . MM . yyyy' } });
  const input = field.element.querySelector('input')!;

  input.focus();
  input.value = '12 . 05 . 2024';
  click(field.element.querySelector('.toggle')!);
  await settle(field.fixture);

  const select = field.element.querySelector<HTMLSelectElement>('.pika-select-month')!;

  click(select);
  await settle(field.fixture);

  return { ...field, select };
}

describe('blur contract', () => {
  beforeEach(() => configureFormidableTestBed());

  it('leaves the model uncommitted and untouched while focus is on its own calendar', async () => {
    const { select, value, touched } = await setup();

    expect(document.activeElement).toBe(select);
    expect(touched()).toBe(false);
    expect(value()).toBeNull();
  });

  it('commits and touches once focus leaves the field from its calendar', async () => {
    const { fixture, select, value, touched } = await setup();

    select.blur();
    await settle(fixture);

    expect(touched()).toBe(true);
    expect(value()).toEqual(new Date(2024, 4, 12));
  });
});
