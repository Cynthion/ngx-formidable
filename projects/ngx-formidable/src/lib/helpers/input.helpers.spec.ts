import { endOfMaskedValue, replaceText } from './input.helpers';
import { DEFAULT_PLACEHOLDER_CHARACTER } from './mask.helpers';

/**
 * Where a masked editor's value ends, which is the one thing the caret rules cannot read straight off it. The fields themselves are covered by
 * `components/fields/focus-caret.spec.ts`, which drives whole interactions against real editors.
 */
describe('input helpers', () => {
  let element: HTMLInputElement;

  beforeEach(() => {
    element = document.createElement('input');
    document.body.appendChild(element);
  });

  afterEach(() => element.remove());

  describe('replaceText', () => {
    it('writes text the element does not show, with the caret behind it', () => {
      element.value = 'old';

      replaceText(element, 'a longer value');

      expect(element.value).toBe('a longer value');
      expect(element.selectionStart).toBe('a longer value'.length);
    });

    it('leaves the caret alone when the text is already there', () => {
      element.value = 'unchanged';
      element.setSelectionRange(3, 3);

      replaceText(element, 'unchanged');

      expect(element.selectionStart).toBe(3);
    });

    it('leaves a selection alone too', () => {
      element.value = 'unchanged';
      element.setSelectionRange(2, 6);

      replaceText(element, 'unchanged');

      expect([element.selectionStart, element.selectionEnd]).toEqual([2, 6]);
    });
  });

  describe('endOfMaskedValue', () => {
    const cases: Array<[string, number, string]> = [
      ['079 123 45 67', 13, 'a full mask ends after its last character'],
      ['12/34/5678', 10, 'and so does one with no slots rendered'],
      ['079 123', 7, 'a mask told not to render its slots ends where its text does'],
      ['12/3_/____', 4, 'a partial mask ends after the last filled position'],
      ['079 123 __ __', 7, 'dropping the separator that leads into the unused area'],
      ['079 1__ __ __', 5, 'wherever that boundary falls'],
      ['0__ ___ __ __', 1, 'including after a single character'],
      ['___ ___ __ __', 0, 'and at the front when nothing is filled'],
      ['(___) ___', 0, 'even behind a literal the mask opens with'],
      ['', 0, 'an empty editor ends at 0']
    ];

    for (const [text, end, why] of cases) {
      it(`${why}: "${text}" ends at ${end}`, () => {
        element.value = text;

        expect(endOfMaskedValue(element, DEFAULT_PLACEHOLDER_CHARACTER)).toBe(end);
      });
    }
  });

  describe('endOfMaskedValue, with the placeholder changed', () => {
    it('reads a value back out against the character the mask actually renders', () => {
      element.value = '079 123 ** **';

      expect(endOfMaskedValue(element, '*')).toBe(7);
    });

    it('and stops seeing slots that are no longer slots', () => {
      element.value = '079 123 ** **';

      expect(endOfMaskedValue(element, '_')).toBe(13);
    });

    // The point of changing it: a mask whose own alphabet includes the default character.
    it('lets an underscore be content when something else marks the empty slots', () => {
      element.value = 'ab_cd*';

      expect(endOfMaskedValue(element, '*')).toBe(5);
    });
  });
});
