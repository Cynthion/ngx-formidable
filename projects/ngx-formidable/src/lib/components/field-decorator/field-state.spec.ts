import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField, FieldFlags, FormsApi } from '../../testing/bind-field';
import { theme } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Per **Field State** in `user/decoration.md`: where states overlap, `disabled` beats `readonly`, which beats
 * focused, which beats hovered; invalid shows through hover and focus and gives way to `readonly` and
 * `disabled`. The label follows the same states, and `is-invalid` follows the field's `aria-invalid`.
 *
 * Colours are compared against the theme's own `:root` variables rather than against literals, so a
 * retheme cannot make these pass for the wrong reason.
 */

/** The declared value of a theme variable, resolved the way the browser resolves it. */
function token(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);

  const value = getComputedStyle(probe).color;
  probe.remove();

  return value;
}

const input = () => page.getByRole('textbox', { name: 'Name' });
const style = () => getComputedStyle(input().element());
const labelColour = () => getComputedStyle(page.getByText('Name').element()).color;

/** Binds a decorated input that reveals at once, labelled `Name` outside the field. */
const bind = (state: Partial<FieldFlags> = {}, api: FormsApi = 'signal'): Promise<BoundField> =>
  bindField('input', api, {
    inputs: { revealOn: 'always' },
    decorated: true,
    decoration: '<div formidableFieldLabel position="outside">Name</div>',
    after: '<button type="button">Next</button>',
    state
  });

/** Moves the pointer off every field, so a hover left over from an earlier spec cannot colour one. */
const pointerAway = () =>
  userEvent.hover(page.elementLocator(document.documentElement), { position: { x: 1, y: innerHeight - 1 } });

describe('field state colours', () => {
  beforeEach(async () => {
    configureFormidableTestBed();
    // The colours transition, so a read straight after a change would land part-way. These are about where
    // a state lands.
    theme('--formidable-animation-duration', '0s');
    await pointerAway();
  });

  describe('the field', () => {
    it('takes the base colours with nothing going on', async () => {
      await bind();

      expect(style().borderTopColor).toBe(token('--formidable-color-field-border'));
      expect(style().backgroundColor).toBe(token('--formidable-color-field-background'));
    });

    it('takes the hovered border under the pointer', async () => {
      // The default theme hovers in the base colour, which would let a hover that never applied pass.
      theme('--formidable-color-field-border-hovered', 'rgb(1, 2, 3)');
      await bind();

      await userEvent.hover(input());

      expect(style().borderTopColor).toBe(token('--formidable-color-field-border-hovered'));
    });

    it('takes the invalid border while invalid', async () => {
      await bind({ invalid: true });

      expect(style().borderTopColor).toBe(token('--formidable-color-field-border-invalid'));
      expect(style().borderTopColor).not.toBe(token('--formidable-color-field-border'));
    });

    // A focused field is touched by definition, so focused-and-invalid is the common case, not the corner one.
    it('stays invalid while focused', async () => {
      await bind({ invalid: true });

      await userEvent.click(input());
      await expect.element(input()).toHaveFocus();

      expect(style().borderTopColor).toBe(token('--formidable-color-field-border-invalid'));
      expect(style().boxShadow).toContain(token('--formidable-color-field-border-invalid'));
    });

    it('stays invalid while hovered', async () => {
      await bind({ invalid: true });

      await userEvent.hover(input());

      expect(style().borderTopColor).toBe(token('--formidable-color-field-border-invalid'));
    });

    // Signal Forms validates no readonly field, and no API a disabled one, so only a classic API holds a
    // readonly field invalid.
    it('lets readonly outrank invalid', async () => {
      const bound = await bind({ invalid: true }, 'reactive');

      await bound.state({ readonly: true });

      await expect.element(input()).toHaveAttribute('aria-invalid', 'true');
      expect(style().backgroundColor).toBe(token('--formidable-color-field-background-readonly'));
      expect(style().borderTopColor).toBe(token('--formidable-color-field-border-readonly'));
    });

    it('lets disabled outrank readonly', async () => {
      const bound = await bind();

      await bound.state({ readonly: true, disabled: true });

      expect(style().backgroundColor).toBe(token('--formidable-color-field-background-disabled'));
      expect(style().borderTopColor).toBe(token('--formidable-color-field-border-disabled'));
    });
  });

  // The label is the decorator's own element, so it follows the same states from there.
  describe('the label', () => {
    it('takes the base colour with nothing going on', async () => {
      await bind();

      expect(labelColour()).toBe(token('--formidable-color-field-label'));
    });

    it('takes the focus colour while focused', async () => {
      await bind();

      await userEvent.click(input());

      await expect.poll(labelColour).toBe(token('--formidable-color-field-label-focus'));
    });

    it('takes the invalid colour while invalid, and keeps it while focused', async () => {
      await bind({ invalid: true });

      expect(labelColour()).toBe(token('--formidable-color-field-label-invalid'));

      await userEvent.click(input());
      await expect.element(input()).toHaveFocus();

      expect(labelColour()).toBe(token('--formidable-color-field-label-invalid'));
    });

    it('dims with the field when readonly or disabled', async () => {
      const bound = await bind();

      await bound.state({ readonly: true });
      expect(labelColour()).toBe(token('--formidable-color-field-label-readonly'));

      await bound.state({ readonly: false, disabled: true });
      expect(labelColour()).toBe(token('--formidable-color-field-label-disabled'));
    });
  });

  it('turns invalid once a required field is left empty, and valid once it is filled', async () => {
    await bindField('input', 'signal', {
      decorated: true,
      decoration: '<div formidableFieldLabel>Name</div>',
      after: '<button type="button">Next</button>',
      state: { required: true }
    });
    const decorator = document.querySelector('formidable-field-decorator')!;

    // Invalid, but untouched: nothing to report yet.
    expect(decorator.classList).not.toContain('is-invalid');

    await userEvent.click(input());
    await userEvent.tab();

    await expect.poll(() => decorator.classList).toContain('is-invalid');
    expect(style().borderTopColor).toBe(token('--formidable-color-field-border-invalid'));

    await userEvent.type(input(), 'Chris');

    await expect.poll(() => decorator.classList).not.toContain('is-invalid');
    expect(style().borderTopColor).not.toBe(token('--formidable-color-field-border-invalid'));
  });

  // A group's box is styled apart from the text fields', so its states are a separate claim.
  it('gives a group field the same invalid border', async () => {
    const options = [{ value: 'a', label: 'Alpha' }];
    const bound = await bindField('radio-group', 'signal', {
      inputs: { options, revealOn: 'always' },
      decorated: true,
      decoration: '<div formidableFieldLabel>Name</div>'
    });
    const box = () => getComputedStyle(page.getByRole('radiogroup', { name: 'Name' }).element()).borderTopColor;

    expect(box()).toBe(token('--formidable-color-field-group-border'));

    await bound.state({ invalid: true });

    expect(box()).toBe(token('--formidable-color-field-border-invalid'));
  });
});
