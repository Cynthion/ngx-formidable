import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, BindFieldOptions, BoundField, FieldKind } from '../../testing/bind-field';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Per **Accessibility** in `user/components.md`: a decorated field takes its name from its label, including
 * the fields a `<label for>` cannot reach, and its description from its hints and messages. It reports its
 * state on the element that carries it, and **Without A Decorator** it points at nothing.
 */

const options: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

/** Binds a field through Signal Forms, decorated with the label `Colour` and the markup `extra` projects. */
function bind(
  kind: FieldKind,
  inputs: Record<string, unknown> = {},
  { decoration = '', ...extra }: BindFieldOptions = {}
): Promise<BoundField> {
  return bindField(kind, 'signal', {
    inputs,
    decorated: true,
    decoration: `<div formidableFieldLabel>Colour</div>${decoration}`,
    ...extra
  });
}

describe('field ARIA', () => {
  beforeEach(() => configureFormidableTestBed());

  describe('naming the fields a <label for> cannot reach', () => {
    const fields: [FieldKind, 'radiogroup' | 'group' | 'switch' | 'slider', Record<string, unknown>][] = [
      ['radio-group', 'radiogroup', { options }],
      ['checkbox-group', 'group', { options }],
      // The toggle's `offLabel` is state text, not a name: `aria-checked` carries the state.
      ['toggle', 'switch', { offLabel: 'Off' }],
      ['slider', 'slider', {}]
    ];

    for (const [kind, role, inputs] of fields) {
      it(`names the ${kind} field from its label`, async () => {
        await bind(kind, inputs);

        await expect.element(page.getByRole(role, { name: 'Colour', exact: true })).toBeInTheDocument();
      });
    }

    it('points at no label when none is projected', async () => {
      await bindField('radio-group', 'signal', { inputs: { options }, decorated: true });

      await expect.element(page.getByRole('radiogroup')).not.toHaveAttribute('aria-labelledby');
    });

    // The group's fieldset once named itself from the raw control name, beside the label.
    it('names nothing around a group but the group itself', async () => {
      await bind('radio-group', { options });

      await expect.element(page.getByRole('radiogroup', { name: 'Colour', exact: true })).toBeInTheDocument();
      expect(page.getByRole('group', { name: /./ }).elements()).toEqual([]);
    });
  });

  describe('state', () => {
    const group = () => page.getByRole('radiogroup', { name: 'Colour' });

    it('reports required only while the field is required', async () => {
      const bound = await bind('radio-group', { options });

      await expect.element(group()).not.toHaveAttribute('aria-required');

      await bound.state({ required: true });

      await expect.element(group()).toHaveAttribute('aria-required', 'true');
    });

    // A `div` has no native `readonly` or `disabled` to speak for it.
    it('reports readonly and disabled on a div-rooted field', async () => {
      const bound = await bind('radio-group', { options });

      await bound.state({ readonly: true });
      await expect.element(group()).toHaveAttribute('aria-readonly', 'true');

      await bound.state({ disabled: true });
      await expect.element(group()).toHaveAttribute('aria-disabled', 'true');
    });

    it('reports the toggle checked once switched on', async () => {
      await bind('toggle');
      const toggle = page.getByRole('switch', { name: 'Colour' });

      await expect.element(toggle).not.toBeChecked();

      await userEvent.click(toggle);

      await expect.element(toggle).toBeChecked();
    });

    // A native range already reports its number; only a transformed value is something it cannot infer.
    it('gives the slider a valuetext only once the value is transformed', async () => {
      const bound = await bind('slider', { transformValueToThumbLabel: undefined });
      const slider = page.getByRole('slider', { name: 'Colour' });

      await bound.write(50);

      await expect.element(slider).not.toHaveAttribute('aria-valuetext');

      await bound.set('transformValueToThumbLabel', (value: number) => `${value} francs`);

      await expect.element(slider).toHaveAttribute('aria-valuetext', '50 francs');
    });
  });

  describe('descriptions', () => {
    it('describes the field with its hint', async () => {
      await bind('radio-group', { options }, { decoration: '<div formidableFieldHint>Pick one.</div>' });

      await expect.element(page.getByRole('radiogroup', { name: 'Colour' })).toHaveAccessibleDescription('Pick one.');
    });

    it('describes nothing while the hint and the messages are empty', async () => {
      await bind('radio-group', { options });

      await expect.element(page.getByRole('radiogroup', { name: 'Colour' })).toHaveAccessibleDescription('');
    });

    it('points at neither a label nor a description without a decorator', async () => {
      await bindField('input', 'signal');

      await expect.element(page.getByRole('textbox')).not.toHaveAttribute('aria-labelledby');
      await expect.element(page.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
    });

    it('adds the message to the description and reports invalid once revealed', async () => {
      await bind(
        'input',
        {},
        {
          decoration: '<div formidableFieldHint>Some hint.</div>',
          after: '<button type="button">Next</button>',
          state: { invalid: true }
        }
      );
      const input = page.getByRole('textbox', { name: 'Colour' });

      await expect.element(input).toHaveAccessibleDescription('Some hint.');
      await expect.element(input).not.toHaveAttribute('aria-invalid');

      await userEvent.click(input);
      await userEvent.tab();

      await expect.element(input).toHaveAttribute('aria-invalid', 'true');
      await expect.element(input).toHaveAccessibleDescription('Some hint. invalid');
    });
  });
});
