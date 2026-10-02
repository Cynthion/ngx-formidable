import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField } from '../../../testing/bind-field';
import { configureFormidableTestBed } from '../../../testing/test-bed';

/**
 * The select field's dropdown arrow.
 *
 * `field-reset` strips the user agent's arrow with `appearance: none`, so the field draws its own. A native
 * `<select>` opens its list from anywhere in its box, which is what the rules below pin down: the arrow is a
 * picture stacked over the control, never a target that swallows the click, and the room it takes is the
 * select's own `padding-right`, reserved only while an arrow is rendered.
 */
describe('select field arrow', () => {
  let field: BoundField;

  const select = () => page.getByRole('combobox', { name: 'Era' });
  // A picture, with no role to find it by.
  const arrow = () => field.element.querySelector<HTMLElement>('.toggle');
  const padding = (side: 'Left' | 'Right') => parseFloat(getComputedStyle(select().element())[`padding${side}`]);

  beforeEach(async () => {
    configureFormidableTestBed();

    field = await bindField('select', 'signal', {
      inputs: {
        options: [
          { value: 'a', label: 'Antiquity' },
          { value: 'b', label: 'Bronze Age' }
        ]
      },
      decorated: true,
      decoration: '<div formidableFieldLabel>Era</div>'
    });
  });

  it('renders the arrow while the field can open its list', () => {
    expect(arrow()).not.toBeNull();
  });

  for (const state of ['readonly', 'disabled'] as const) {
    it(`renders no arrow while ${state}, and hands the room back to the value`, async () => {
      const reserved = padding('Right');

      await field.state({ [state]: true });

      expect(arrow()).toBeNull();
      expect(padding('Right')).toBeLessThan(reserved);
    });
  }

  it('reserves exactly the arrow box beside the value', () => {
    expect(padding('Right') - padding('Left')).toBeCloseTo(arrow()!.getBoundingClientRect().width, 1);
  });

  // The whole reason the arrow overlays the select instead of sitting beside it: an arrow in flow would carve
  // a strip out of the box that no longer opens the platform's list. A press the arrow intercepted would
  // never reach the select, and Playwright refuses a click whose point another element covers.
  it('lets a click on the arrow through to the select', async () => {
    const box = select().element().getBoundingClientRect();
    const rect = arrow()!.getBoundingClientRect();

    await userEvent.click(select(), {
      position: { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 },
      timeout: 1000
    });

    await expect.element(select()).toHaveFocus();
  });
});
