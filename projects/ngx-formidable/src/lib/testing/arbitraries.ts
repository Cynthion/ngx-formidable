import fc from 'fast-check';

const SEPARATORS = ['', '-', '/', '.', ':', ' ', ' . ', ', '];

/** Every part at most once, in any order, each written with one of its tokens, with a separator between two. */
function formats(parts: string[][]): fc.Arbitrary<string> {
  return fc
    .shuffledSubarray(parts, { minLength: 1 })
    .chain((chosen) => fc.tuple(...chosen.map((tokens) => fc.constantFrom(...tokens))))
    .chain((tokens) =>
      fc
        .array(fc.constantFrom(...SEPARATORS), { minLength: tokens.length, maxLength: tokens.length })
        .map((separators) => tokens.map((token, index) => (index ? separators[index] : '') + token).join(''))
    );
}

/** Any `unicodeTokenFormat` a date field accepts. */
export const DATE_FORMATS = formats([['yy', 'yyyy'], ['MM', 'MMM'], ['dd']]);

// A twelve-hour clock tells 2 PM from 2 AM only by its meridiem, so `hh` never comes without one. A field
// rejects a meridiem right before a dot, which date-fns reads as part of it, `AM.` as `a.m.`.
/** Any `unicodeTokenFormat` a time field accepts. */
export const TIME_FORMATS = formats([['HH', 'hh a', 'hhaa'], ['mm'], ['ss']]).filter((unicode) => !/a\./.test(unicode));

/** Any date the mask's four year slots hold, to the second. */
export const DATES = fc.date({
  min: new Date(1000, 0, 1),
  max: new Date(9999, 11, 31, 23, 59, 59),
  noInvalidDate: true
});
