import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, BoundField } from '../../testing/bind-field';
import { theme } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * What an option of a group paints, per the `--formidable-color-option-prefix-*` variables in
 * `user/theme-reference.md`. A selection is a value, so a selected option keeps its `-selected` ring and mark
 * wherever focus and the pointer are, and only `readonly` and `disabled` take them away. The highlight is the
 * keyboard's, so it paints only in a focused group, with no hover on the option. The fills sit behind the same
 * two gates, a hover showing through both.
 *
 * Every colour is themed apart, since the default theme paints all the marks alike and would pass anything.
 */

const RED: FormidableOption = { value: 'red', label: 'Red' };
const GREEN: FormidableOption = { value: 'green', label: 'Green' };

const RING = {
  plain: 'rgb(10, 0, 0)',
  selected: 'rgb(20, 0, 0)',
  highlighted: 'rgb(30, 0, 0)',
  readonly: 'rgb(40, 0, 0)',
  disabled: 'rgb(50, 0, 0)'
};

const MARK: typeof RING = {
  plain: 'rgb(0, 10, 0)',
  selected: 'rgb(0, 20, 0)',
  highlighted: 'rgb(0, 30, 0)',
  readonly: 'rgb(0, 40, 0)',
  disabled: 'rgb(0, 50, 0)'
};

const FILL = {
  none: 'rgba(0, 0, 0, 0)',
  selected: 'rgb(0, 0, 20)',
  highlighted: 'rgb(0, 0, 30)',
  hovered: 'rgb(0, 0, 40)'
};

function themeColours(): void {
  for (const state of Object.keys(RING) as (keyof typeof RING)[]) {
    const suffix = state === 'plain' ? '' : `-${state}`;

    theme(`--formidable-color-option-prefix-outer${suffix}`, RING[state]);
    theme(`--formidable-color-option-prefix-inner${suffix}`, MARK[state]);
  }

  theme('--formidable-color-field-option-background-selected', FILL.selected);
  theme('--formidable-color-field-option-background-highlighted', FILL.highlighted);
  theme('--formidable-color-field-option-background-hovered', FILL.hovered);
}

describe('option mark', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    themeColours();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  for (const { kind, group, role, value } of [
    { kind: 'radio-group', group: 'radiogroup', role: 'radio', value: 'red' },
    { kind: 'checkbox-group', group: 'group', role: 'checkbox', value: ['red'] }
  ] as const) {
    describe(kind, () => {
      const option = (name: string) => page.getByRole(role, { name });
      const next = () => page.getByRole('button', { name: 'Next' });

      /** The option's ring, its mark or `null` for none, and the fill behind them. */
      const painted = (name: string) => () => {
        const element = option(name).element();
        const mark = element.querySelector(`.${role}-inner`);

        return {
          ring: getComputedStyle(element.querySelector(`.${role}-outer`)!).borderTopColor,
          mark: mark && getComputedStyle(mark).backgroundColor,
          fill: getComputedStyle(element.firstElementChild!).backgroundColor
        };
      };

      /** Binds the group holding `Red`, with the pointer away from it. */
      async function bind(options = [RED, GREEN]): Promise<BoundField> {
        const field = await bindField(kind, 'signal', {
          value,
          inputs: { options },
          after: '<button type="button">Next</button>'
        });

        await userEvent.hover(next());

        return field;
      }

      async function tabIn(): Promise<void> {
        await userEvent.tab();
        await expect.element(page.getByRole(group)).toHaveFocus();
      }

      it('keeps a selected option marked in an unfocused group, without its fill', async () => {
        await bind();

        await expect.poll(painted('Red')).toEqual({ ring: RING.selected, mark: MARK.selected, fill: FILL.none });
      });

      it('keeps a selected option marked under a hover, focused or not', async () => {
        const field = await bind();

        await userEvent.hover(option('Red'));
        await expect.poll(painted('Red')).toEqual({ ring: RING.selected, mark: MARK.selected, fill: FILL.hovered });

        await tabIn();
        await settle(field.fixture);

        expect(painted('Red')()).toEqual({ ring: RING.selected, mark: MARK.selected, fill: FILL.hovered });
      });

      it('keeps a selected option marked under the highlight, which takes the fill', async () => {
        await bind();
        await tabIn();

        await expect.poll(painted('Red')).toEqual({ ring: RING.selected, mark: MARK.selected, fill: FILL.highlighted });
      });

      it('shows the selected fill once the highlight moves on, which rings the next option', async () => {
        await bind();
        await tabIn();

        await userEvent.keyboard('{ArrowDown}');

        await expect.poll(painted('Red')).toEqual({ ring: RING.selected, mark: MARK.selected, fill: FILL.selected });
        expect(painted('Green')()).toEqual({ ring: RING.highlighted, mark: null, fill: FILL.highlighted });
      });

      it('keeps a clicked option marked as the pointer leaves and focus moves on', async () => {
        await bind();

        await userEvent.click(option('Green'));
        await expect.poll(painted('Green')).toEqual({ ring: RING.selected, mark: MARK.selected, fill: FILL.hovered });

        await userEvent.hover(next());
        await expect
          .poll(painted('Green'))
          .toEqual({ ring: RING.selected, mark: MARK.selected, fill: FILL.highlighted });

        await userEvent.tab();
        await expect.poll(painted('Green')).toEqual({ ring: RING.selected, mark: MARK.selected, fill: FILL.none });
      });

      it('rings a highlighted option only in a focused group, with no hover on it', async () => {
        await bind();
        await tabIn();

        await userEvent.keyboard('{ArrowDown}');
        await expect.poll(painted('Green')).toEqual({ ring: RING.highlighted, mark: null, fill: FILL.highlighted });

        await userEvent.hover(option('Green'));
        await expect.poll(painted('Green')).toEqual({ ring: RING.plain, mark: null, fill: FILL.hovered });

        await userEvent.hover(next());
        await expect.poll(painted('Green')).toEqual({ ring: RING.highlighted, mark: null, fill: FILL.highlighted });

        await userEvent.tab();
        await expect.poll(painted('Green')).toEqual({ ring: RING.plain, mark: null, fill: FILL.none });
      });

      for (const state of ['readonly', 'disabled'] as const) {
        it(`paints a selected ${state} option in its ${state} colours, focused or not`, async () => {
          const field = await bind([{ ...RED, [state]: true }, GREEN]);

          await expect.poll(painted('Red')).toEqual({ ring: RING[state], mark: MARK[state], fill: FILL.none });

          await tabIn();
          await settle(field.fixture);

          expect(painted('Red')()).toEqual({ ring: RING[state], mark: MARK[state], fill: FILL.none });
        });
      }
    });
  }
});
