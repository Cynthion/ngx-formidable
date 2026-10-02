import { page } from 'vitest/browser';
import { bindField, BoundField } from '../../testing/bind-field';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Contract of a field's `disabled` under `ngModel`, where it has **two** writers: a consumer's `[disabled]`
 * binding, and `ngModel` writing its control's state when code disables the control. The field follows
 * whichever changed last. Each writes only when its own value changes, so a check of the host that changes
 * nothing undoes neither. The decorator's state class follows the field.
 */

const textbox = () => page.getByRole('textbox', { name: 'Name' });

/** An input under `ngModel`, its `[disabled]` bound `false`. */
const bind = () =>
  bindField('input', 'template-driven', {
    inputs: { disabled: false },
    decorated: true,
    decoration: '<div formidableFieldLabel>Name</div>'
  });

/** That the field's input, and the decorator around it, show it disabled or not. */
function expectDisabled({ element }: BoundField, disabled: boolean): void {
  expect((textbox().element() as HTMLInputElement).disabled).toBe(disabled);
  expect(element.closest('formidable-field-decorator')!.classList.contains('is-disabled')).toBe(disabled);
}

describe('field disabled state', () => {
  beforeEach(() => configureFormidableTestBed());

  it('starts enabled', async () => {
    const bound = await bind();

    expectDisabled(bound, false);
  });

  it('follows the bound input', async () => {
    const bound = await bind();

    await bound.set('disabled', true);
    expectDisabled(bound, true);

    await bound.set('disabled', false);
    expectDisabled(bound, false);
  });

  // The binding does not change here, so the only writer is `ngModel`, writing its control's state.
  it('follows a control disabled through the forms API', async () => {
    const bound = await bind();

    await bound.state({ disabled: true });
    expectDisabled(bound, true);

    await bound.state({ disabled: false });
    expectDisabled(bound, false);
  });

  it('does not let an unchanged binding undo the control', async () => {
    const bound = await bind();

    await bound.state({ disabled: true });
    // A pass that checks the host, and with it the unchanged `[disabled]="false"`.
    await bound.set('disabled', false);

    expectDisabled(bound, true);
  });
});
