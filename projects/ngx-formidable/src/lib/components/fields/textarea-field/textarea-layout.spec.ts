import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField } from '../../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../../testing/test-bed';

/**
 * The textarea's box follows what it holds. It grows with its text, whoever wrote it, and its length
 * indicator sits in the value's right padding — the same padding a suffix widens, so the count never runs
 * under the suffix, however wide the suffix is or later becomes.
 */

const LINES = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`);

const textarea = () => page.getByRole('textbox').element() as HTMLTextAreaElement;
const height = () => textarea().offsetHeight;
const indicator = (field: BoundField) => field.element.querySelector('.length-indicator')!.getBoundingClientRect();

describe('textarea layout', () => {
  beforeEach(() => configureFormidableTestBed());

  describe('autosize', () => {
    it('grows with a value the form writes', async () => {
      const field = await bindField('textarea', 'reactive');
      const empty = height();

      await field.write(LINES.join('\n'));

      expect(height()).toBeGreaterThan(empty);
    });

    it('grows with what the user types', async () => {
      await bindField('textarea', 'reactive');
      const empty = height();

      await userEvent.type(textarea(), LINES.join('{Enter}'));

      await expect.poll(height).toBeGreaterThan(empty);
    });

    it('grows with a masked value, which lands after the render', async () => {
      const field = await bindField('textarea', 'reactive', { inputs: { mask: 'S*' } });
      const empty = height();

      await field.write('a'.repeat(1000));

      expect(textarea().value.length).toBe(1000);
      expect(height()).toBeGreaterThan(empty);
    });

    it('keeps its height with enableAutosize off', async () => {
      const field = await bindField('textarea', 'reactive', { inputs: { enableAutosize: false } });
      const empty = height();

      await field.write(LINES.join('\n'));

      expect(height()).toBe(empty);
    });
  });

  describe('length indicator', () => {
    async function suffixed(): Promise<BoundField> {
      return bindField('textarea', 'reactive', {
        value: 'Notes',
        inputs: { showLengthIndicator: true, maxLength: 200 },
        decorated: true,
        decoration: '<span formidableFieldSuffix>kg</span>'
      });
    }

    // How far the count's right edge sits left of the suffix's left edge. Negative is an overlap.
    const clearance = (field: BoundField, suffix: Element) =>
      suffix.getBoundingClientRect().left - indicator(field).right;

    it('aligns the count with the value when there is no suffix', async () => {
      const field = await bindField('textarea', 'reactive', { inputs: { showLengthIndicator: true } });

      expect(textarea().getBoundingClientRect().right - indicator(field).right).toBeCloseTo(
        parseFloat(getComputedStyle(textarea()).paddingRight),
        0
      );
    });

    it('keeps the count clear of a suffix', async () => {
      const field = await suffixed();

      expect(clearance(field, page.getByText('kg').element())).toBeGreaterThanOrEqual(0);
    });

    it('and of a suffix that widens later', async () => {
      const field = await suffixed();
      const suffix = page.getByText('kg').element();

      suffix.textContent = 'kilograms per square metre';
      await settle(field.fixture);

      expect(clearance(field, suffix)).toBeGreaterThanOrEqual(0);
    });
  });
});
