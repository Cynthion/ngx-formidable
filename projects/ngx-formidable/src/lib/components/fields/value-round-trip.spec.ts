import { bindField } from '../../testing/bind-field';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of the value round trip: what a field is written stays comparable with what a user then types.
 *
 * `BaseField.onValueChange` drops a change equal to the last one it saw, so a field does not
 * report the same value twice. `writeValue` therefore has to record what it wrote — otherwise the field
 * displays a value the base has never seen, and clearing it reads as "still empty" and never reaches the
 * model. A required rule on such a field would never fire.
 */

describe('value round trip', () => {
  beforeEach(() => configureFormidableTestBed());

  it('reports a written-in value being cleared', async () => {
    const { fixture, element, control } = await bindField('input', 'template-driven', { value: 'Cynthion' });

    fill(element.querySelector('input')!, '');
    await settle(fixture);

    expect(control.value).toBeNull();
  });

  it('reports it for a textarea too', async () => {
    const { fixture, element, control } = await bindField('textarea', 'template-driven', { value: 'Some notes' });

    fill(element.querySelector('textarea')!, '');
    await settle(fixture);

    expect(control.value).toBeNull();
  });

  it('still reports an ordinary edit', async () => {
    const { fixture, element, control } = await bindField('input', 'template-driven', { value: 'Cynthion' });

    fill(element.querySelector('input')!, 'Anna');
    await settle(fixture);

    expect(control.value).toBe('Anna');
  });
});
