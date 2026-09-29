import { bindField, BoundField } from '../../../testing/bind-field';
import { fill } from '../../../testing/dom';
import { configureFormidableTestBed, settle } from '../../../testing/test-bed';

/**
 * The textarea's box follows what it holds. It grows with its text, whoever wrote it, and its length
 * indicator sits in the value's right padding — the same padding a suffix widens, so the count never runs
 * under the suffix, however wide the suffix is or later becomes.
 */

const LINES = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join('\n');

function textareaOf(field: BoundField): HTMLTextAreaElement {
  return field.element.querySelector('textarea')!;
}

describe('textarea layout', () => {
  beforeEach(() => configureFormidableTestBed());

  describe('autosize', () => {
    it('grows with a value the form writes', async () => {
      const field = await bindField('textarea', 'reactive');
      const empty = textareaOf(field).offsetHeight;

      await field.write(LINES);

      expect(textareaOf(field).offsetHeight).toBeGreaterThan(empty);
    });

    it('grows with what the user types', async () => {
      const field = await bindField('textarea', 'reactive');
      const empty = textareaOf(field).offsetHeight;

      fill(textareaOf(field), LINES);
      await settle(field.fixture);

      expect(textareaOf(field).offsetHeight).toBeGreaterThan(empty);
    });

    it('grows with a masked value, which lands after the render', async () => {
      const field = await bindField('textarea', 'reactive', { inputs: { mask: 'S*' } });
      const empty = textareaOf(field).offsetHeight;

      await field.write('a'.repeat(1000));

      expect(textareaOf(field).value.length).toBe(1000);
      expect(textareaOf(field).offsetHeight).toBeGreaterThan(empty);
    });

    it('keeps its height with enableAutosize off', async () => {
      const field = await bindField('textarea', 'reactive', { inputs: { enableAutosize: false } });
      const empty = textareaOf(field).offsetHeight;

      await field.write(LINES);

      expect(textareaOf(field).offsetHeight).toBe(empty);
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

    function suffixOf(field: BoundField): HTMLElement {
      return field.fixture.nativeElement.querySelector('[formidableFieldSuffix]');
    }

    // How far the count's right edge sits left of the suffix's left edge. Negative is an overlap.
    function clearance(field: BoundField): number {
      const indicator = field.element.querySelector('.length-indicator')!.getBoundingClientRect();

      return suffixOf(field).getBoundingClientRect().left - indicator.right;
    }

    it('aligns the count with the value when there is no suffix', async () => {
      const field = await bindField('textarea', 'reactive', { inputs: { showLengthIndicator: true } });
      const textarea = textareaOf(field).getBoundingClientRect();
      const indicator = field.element.querySelector('.length-indicator')!.getBoundingClientRect();

      expect(textarea.right - indicator.right).toBeCloseTo(
        parseFloat(getComputedStyle(textareaOf(field)).paddingRight),
        0
      );
    });

    it('keeps the count clear of a suffix', async () => {
      const field = await suffixed();

      expect(clearance(field)).toBeGreaterThanOrEqual(0);
    });

    it('and of a suffix that widens later', async () => {
      const field = await suffixed();

      suffixOf(field).textContent = 'kilograms per square metre';
      await settle(field.fixture);

      expect(clearance(field)).toBeGreaterThanOrEqual(0);
    });
  });
});
