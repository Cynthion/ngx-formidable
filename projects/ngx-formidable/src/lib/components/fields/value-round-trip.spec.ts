import { page, userEvent } from 'vitest/browser';
import { bindField, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * Contract of the value round trip: clearing a written-in value reaches the model as the empty string, so a
 * required rule on the field fires.
 */

describe('value round trip', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const kind of ['input', 'textarea'] as const) {
      it(`reports a written-in value being cleared from an ${kind}, bound ${api}`, async () => {
        const { value } = await bindField(kind, api, {
          value: 'Cynthion',
          decorated: true,
          decoration: '<div formidableFieldLabel>Name</div>'
        });

        await userEvent.clear(page.getByRole('textbox', { name: 'Name' }));

        await expect.poll(value).toBe('');
      });
    }
  }
});
