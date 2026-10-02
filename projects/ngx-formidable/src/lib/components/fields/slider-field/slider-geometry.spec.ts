import { page } from 'vitest/browser';
import { bindField } from '../../../testing/bind-field';
import { configureFormidableTestBed } from '../../../testing/test-bed';

/**
 * The slider's min and max labels stay inside the field's box, so they never run over what a consumer puts
 * below it.
 */

const rect = (text: string) => page.getByText(text).element().getBoundingClientRect();

describe('SliderField geometry', () => {
  beforeEach(() => configureFormidableTestBed());

  it('keeps its min and max labels inside the field, clear of what follows it', async () => {
    const field = await bindField('slider', 'signal', {
      inputs: { min: 0, max: 10, showMinMaxLabels: true, minLabel: 'Mild', maxLabel: 'Volcanic' },
      after: '<div>Below</div>'
    });
    const box = field.element.querySelector('.field')!.getBoundingClientRect();

    for (const label of ['Mild', 'Volcanic']) {
      expect(rect(label).height).toBeGreaterThan(0);
      expect(rect(label).bottom).toBeLessThanOrEqual(box.bottom);
      expect(rect(label).bottom).toBeLessThanOrEqual(rect('Below').top);
    }
  });
});
