import { By } from '@angular/platform-browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { DropdownField } from './dropdown-field/dropdown-field';

/**
 * Contract of the paths that repaint a field with no Angular listener anywhere in the callstack: a third
 * party's callback, a bare `document` listener, a bare `queueMicrotask`, a bare `setTimeout` and a public
 * method called from outside. Everywhere else a template listener or an output marks the view.
 *
 * `settle()` never calls `detectChanges()`, so a repaint that arrives here is the field's own doing.
 */

const options: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' }
];

describe('field repaint', () => {
  beforeEach(() => configureFormidableTestBed());

  /**
   * End-to-end guard rather than a marking proof: a day cell sits inside the panel, whose `(mousedown)`
   * template listener marks the view on the way past. Nothing else covers the pick itself.
   */
  it('renders a calendar pick and closes the panel, from Pikaday’s own callback', async () => {
    const { fixture, element, value } = await bindField('date', 'reactive');

    element.querySelector('.toggle')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await settle(fixture);

    expect(element.querySelector('.panel')!.classList).toContain('open');

    element.querySelector('.pika-button:not(.is-empty)')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await settle(fixture);

    expect(element.querySelector('.panel')!.classList).not.toContain('open');
    expect(element.querySelector('input')!.value).not.toBe('');
    expect(value()).toEqual(expect.any(Date));
  });

  // The panel's `.open` is written by the field's own template, so the signal is what repaints it.
  it('opens and closes a panel from togglePanel alone', async () => {
    const { fixture, element } = await bindField('dropdown', 'reactive', { inputs: { options } });
    const dropdown = fixture.debugElement.query(By.directive(DropdownField)).componentInstance as DropdownField;

    dropdown.togglePanel(true);
    await settle(fixture);

    expect(element.querySelector('.panel')!.classList).toContain('open');

    dropdown.togglePanel(false);
    await settle(fixture);

    expect(element.querySelector('.panel')!.classList).not.toContain('open');
  });

  // The outside-click listener is a bare `fromEvent(document, 'click')`, so the close is carried by the
  // `isPanelOpen` signal and by nothing else.
  it('closes a panel from a bare document click listener', async () => {
    const { fixture, element } = await bindField('dropdown', 'reactive', { inputs: { options } });

    element.querySelector('.input-wrapper')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await settle(fixture);

    expect(element.querySelector('.panel')!.classList).toContain('open');

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);

    expect(element.querySelector('.panel')!.classList).not.toContain('open');
  });

  // An option list resolves in a `queueMicrotask` that no render owns. With the panel already open and
  // nothing else moving, `activeOptions` is the only thing that can carry a changed list onto the screen.
  it('renders options that resolved in a bare microtask', async () => {
    const field = await bindField('dropdown', 'reactive', { inputs: { options } });

    field.element.querySelector('.input-wrapper')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await settle(field.fixture);

    expect(field.element.querySelectorAll('formidable-field-option').length).toBe(2);

    await field.set('options', [...options, { value: 'green', label: 'Green' }]);

    expect(field.element.querySelectorAll('formidable-field-option').length).toBe(3);
  });

  // A masked write lands in a bare `setTimeout`, and its correction finds the value unchanged, so nothing
  // but the count's own signal can carry the new length onto the screen.
  it('counts a masked value written through the form', async () => {
    const field = await bindField('textarea', 'reactive', { inputs: { mask: '000-000', showLengthIndicator: true } });

    await field.write('123456');

    expect(field.element.querySelector('.length-indicator')!.textContent!.trim()).toBe('7'); // `123-456`
  });
});
