import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField } from '../../testing/bind-field';
import { keptKeys, referenced } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * A dropdown's value is a label the field draws, not text the user owns. The input showing it is `readonly`
 * and takes no pointer events, so no mouse gesture selects it, and CSS cannot stop the key that would: Chrome
 * honours `user-select: none` for a drag and ignores it for the editing command behind `Cmd/Ctrl+A`. So the
 * field keeps a select-all from the browser, and leaves every other key where it was going. A native
 * `<select>` has no selectable text either.
 *
 * The field is focused by a click, which, unlike a keyboard entry, selects nothing of its own.
 */

const options: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

const combobox = () => page.getByRole('combobox', { name: 'Colour' });

/** The text of the value the input shows selected. */
function selected(): string {
  const input = combobox().element() as HTMLInputElement;

  return input.value.slice(input.selectionStart!, input.selectionEnd!);
}

describe('display-only value selection', () => {
  let kept: (key: string) => boolean | undefined;

  beforeEach(async () => {
    configureFormidableTestBed();
    kept = keptKeys();

    await bindField('dropdown', 'signal', {
      inputs: { options },
      value: 'red',
      decorated: true,
      decoration: '<div formidableFieldLabel>Colour</div>'
    });

    // The display input takes no pointer events, so a click on it lands on the field around it.
    await userEvent.click(combobox(), { force: true });
    await userEvent.keyboard('{Escape}');
    await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
  });

  it("selects nothing on the platform's select-all", async () => {
    await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}');

    expect(selected()).toBe('');
  });

  it('keeps a select-all from the browser with either modifier, whatever case it reports', async () => {
    await userEvent.keyboard('{Meta>}a{/Meta}');
    expect(kept('a')).toBe(true);

    await userEvent.keyboard('{Control>}a{/Control}');
    expect(kept('a')).toBe(true);

    await userEvent.keyboard('{Meta>}A{/Meta}');
    expect(kept('A')).toBe(true);
  });

  it('leaves a bare letter to the type-ahead', async () => {
    await userEvent.keyboard('b');

    await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => referenced(combobox().element(), 'aria-activedescendant')[0]).toHaveTextContent('Blue');
  });

  it('leaves other modifier combos alone, so a copy still reaches the browser', async () => {
    await userEvent.keyboard('{ControlOrMeta>}c{/ControlOrMeta}');

    expect(kept('c')).toBe(false);
  });
});
