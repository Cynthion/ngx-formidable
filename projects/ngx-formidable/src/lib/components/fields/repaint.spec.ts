import { By } from '@angular/platform-browser';
import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField } from '../../testing/bind-field';
import { configureFormidableTestBed } from '../../testing/test-bed';
import { DropdownField } from './dropdown-field/dropdown-field';

/**
 * Per **State Repaints On Its Own** in `user/forms.md`: a field repaints with no Angular listener anywhere in
 * the callstack — from a third party's callback, a bare `document` listener, a bare `queueMicrotask`, a bare
 * `setTimeout` and a public method called from outside. Everywhere else a template listener or an output
 * marks the view.
 *
 * Neither the retrying assertions nor the `settle()` that `write()` and `set()` end with call `detectChanges()`,
 * so a repaint that arrives here is the field's own doing.
 */

const options: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

const combobox = () => page.getByRole('combobox', { name: 'Colour' });

/** Binds a field under a label, through reactive forms. */
const bind = (kind: 'date' | 'dropdown', inputs: Record<string, unknown> = {}) =>
  bindField(kind, 'reactive', { inputs, decorated: true, decoration: '<div formidableFieldLabel>Colour</div>' });

describe('field repaint', () => {
  beforeEach(() => configureFormidableTestBed());

  // End-to-end rather than a proof of what marks the view: a day sits inside the panel, whose `(mousedown)`
  // template listener marks it on the way past.
  it('renders a calendar pick and closes the panel, from Pikaday’s own callback', async () => {
    const { element, value } = await bind('date');

    await userEvent.click(element.querySelector('.toggle')!);
    await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(
      page.getByRole('dialog', { name: 'Colour' }).getByRole('button', { name: '15', exact: true })
    );

    await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => (combobox().element() as HTMLInputElement).value).toMatch(/-15$/);
    expect(value()).toEqual(expect.any(Date));
  });

  it('opens and closes a panel from togglePanel alone', async () => {
    const { fixture } = await bind('dropdown', { options });
    const dropdown = fixture.debugElement.query(By.directive(DropdownField)).componentInstance as DropdownField;

    dropdown.togglePanel(true);
    await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');

    dropdown.togglePanel(false);
    await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
  });

  // The outside click is heard by a bare `document` listener, and a dropdown does not close on its blur.
  it('closes a panel on a click outside the field', async () => {
    await bind('dropdown', { options });

    await userEvent.click(combobox(), { force: true });
    await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');

    // A click on the page, well away from the field and its panel.
    await userEvent.click(page.elementLocator(document.documentElement), { position: { x: 1, y: innerHeight - 1 } });

    await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
  });

  // An option list resolves in a `queueMicrotask` that no render owns. With the panel already open and
  // nothing else moving, the list's own signal is the only thing that can carry it onto the screen.
  it('renders options that resolved in a bare microtask', async () => {
    const field = await bind('dropdown', { options });

    await userEvent.click(combobox(), { force: true });
    await expect.element(page.getByRole('option', { name: 'Blue' })).toBeVisible();

    await field.set('options', [...options, { value: 'green', label: 'Green' }]);

    expect(page.getByRole('option').elements()).toHaveLength(3);
  });

  // A masked write lands in a bare `setTimeout`, and its correction finds the value unchanged, so nothing
  // but the count's own signal can carry the new length onto the screen.
  it('counts a masked value written through the form', async () => {
    const field = await bindField('textarea', 'reactive', { inputs: { mask: '000-000', showLengthIndicator: true } });

    await field.write('123456');

    expect(field.element.querySelector('.length-indicator')!.textContent!.trim()).toBe('7'); // `123-456`
  });
});
