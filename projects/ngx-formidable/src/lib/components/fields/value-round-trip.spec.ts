import { bindField, FORMS_APIS } from '../../testing/bind-field';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of the value round trip: clearing a written-in value reaches the model as the empty string, so a
 * required rule on the field fires.
 */

describe('value round trip', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const kind of ['input', 'textarea'] as const) {
      it(`reports a written-in value being cleared from an ${kind}, bound ${api}`, async () => {
        const { fixture, element, value } = await bindField(kind, api, { value: 'Cynthion' });

        fill(element.querySelector(kind)!, '');
        await settle(fixture);

        expect(value()).toBe('');
      });
    }
  }
});
