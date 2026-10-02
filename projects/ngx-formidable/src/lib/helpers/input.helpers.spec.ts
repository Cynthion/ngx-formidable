import fc from 'fast-check';
import { endOfMaskedValue, replaceText } from './input.helpers';
import { DEFAULT_PLACEHOLDER_CHARACTER } from './mask.helpers';

/**
 * Where a masked editor's value ends, which is the one thing the caret rules cannot read straight off it, and
 * the one write that leaves the user's caret alone. The fields themselves are `components/fields/focus-caret.spec.ts`.
 *
 * The properties run over any mask of slots and the literals ngx-mask draws between them, filled from the
 * front by any amount, and drawing its empty slots with any character it cannot type.
 */

const LITERALS = [' ', '-', '/', '.', ':', '(', ')', '+', ' . '];

/** A mask with its slots written as `#`, a literal maybe opening and closing it: `(###) ###-####`. */
const MASKS = fc
  .tuple(
    fc.array(fc.tuple(fc.constantFrom('', ...LITERALS), fc.integer({ min: 1, max: 4 })), {
      minLength: 1,
      maxLength: 5
    }),
    fc.constantFrom('', ...LITERALS)
  )
  .map(([groups, closing]) => groups.map(([literal, slots]) => literal + '#'.repeat(slots)).join('') + closing);

/** Where each slot of a mask sits. */
function slotsOf(mask: string): number[] {
  return [...mask].flatMap((character, index) => (character === '#' ? [index] : []));
}

/** A mask with its first slots typed as `typed`, and every other slot drawn as `placeholder`. */
const DISPLAYS = MASKS.chain((mask) =>
  fc.record({
    mask: fc.constant(mask),
    typed: fc.array(fc.constantFrom('0', '7', 'a', 'Z'), { maxLength: slotsOf(mask).length }),
    placeholder: fc.constantFrom(DEFAULT_PLACEHOLDER_CHARACTER, '*', '•')
  })
);

describe('input helpers', () => {
  let element: HTMLInputElement;

  beforeEach(() => {
    element = document.createElement('input');
    document.body.appendChild(element);
  });

  afterEach(() => element.remove());

  describe('replaceText', () => {
    it('leaves the selection alone when the text is already there, and puts the caret behind any other', () => {
      fc.assert(
        fc.property(
          fc
            .string()
            .chain((shown) =>
              fc.tuple(
                fc.constant(shown),
                fc.oneof(fc.constant(shown), fc.string()),
                fc.nat(shown.length),
                fc.nat(shown.length)
              )
            ),
          ([shown, written, from, to]) => {
            const selected = [Math.min(from, to), Math.max(from, to)];
            element.value = shown;
            element.setSelectionRange(selected[0]!, selected[1]!);

            replaceText(element, written);

            expect(element.value).toBe(written);
            expect([element.selectionStart, element.selectionEnd]).toEqual(
              written === shown ? selected : [written.length, written.length]
            );
          }
        )
      );
    });
  });

  describe('endOfMaskedValue', () => {
    it('ends after the last slot typed, short of the literal leading to the rest, and after the whole of a full mask', () => {
      fc.assert(
        fc.property(DISPLAYS, ({ mask, typed, placeholder }) => {
          const slots = slotsOf(mask);
          let slot = 0;
          element.value = [...mask]
            .map((character) => (character === '#' ? (typed[slot++] ?? placeholder) : character))
            .join('');

          const end =
            typed.length === slots.length ? mask.length : typed.length === 0 ? 0 : slots[typed.length - 1]! + 1;

          expect(endOfMaskedValue(element, placeholder)).toBe(end);
        })
      );
    });

    // The examples `user/fields.md` gives, and the two no mask generates.
    const cases: Array<[string, string, number, string]> = [
      ['12/3_/____', '_', 4, 'keyboard focus selects `12/3` and stops'],
      ['079 ___ __ __', '_', 3, 'a click into the empty tail lands behind the `9`'],
      ['___ ___ __ __', '_', 0, 'nothing but slots ends at the front'],
      ['', '_', 0, 'an empty editor ends at 0'],
      ['ab_cd*', '*', 5, 'an underscore is content once something else marks the empty slots']
    ];

    for (const [text, placeholder, end, why] of cases) {
      it(`${why}: "${text}" ends at ${end}`, () => {
        element.value = text;

        expect(endOfMaskedValue(element, placeholder)).toBe(end);
      });
    }
  });
});
