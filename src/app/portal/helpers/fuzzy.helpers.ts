import Fuse, { FuseResult, IFuseOptions } from 'fuse.js';
import { HighlightedEntries } from '../../example-fuzzy-option/example-fuzzy-option.model';
import { PortalFilterStrategy, PortalOptionSpec } from '../model/field-spec.model';

/** One option after filtering, carrying the runs the filter matched so the option can mark them. */
interface FuzzyMatch {
  readonly option: PortalOptionSpec;
  readonly highlights: HighlightedEntries;
}

const EMPTY: HighlightedEntries = { labelEntries: [], subtitleEntries: [] };

const FUSE_OPTIONS: IFuseOptions<PortalOptionSpec> = {
  keys: [
    { name: 'label', weight: 0.8 },
    { name: 'subtitle', weight: 0.2 }
  ],
  threshold: 0.35,
  includeMatches: true,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2
};

/**
 * Filters an option list the way a consumer would: the field emits the filter text and the consumer supplies
 * the filtered options. The match runs come back with them, which is what `example-fuzzy-option` renders.
 *
 * The strategy is a setting because the choice is the consumer's, not the field's: swapping it changes what
 * a typo finds without any field input moving, which is the division `user/fields.md` states in prose.
 */
export function filterOptions(
  options: readonly PortalOptionSpec[],
  filter: string,
  strategy: PortalFilterStrategy = 'fuzzy'
): readonly FuzzyMatch[] {
  const trimmed = filter.trim();

  if (!trimmed) return options.map((option) => ({ option, highlights: EMPTY }));

  if (strategy === 'fuzzy') {
    const results = new Fuse([...options], FUSE_OPTIONS).search(trimmed);

    return [...results]
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .map((result) => ({ option: result.item, highlights: extractHighlights(result) }));
  }

  const needle = trimmed.toLowerCase();

  return options
    .map((option) => ({ option, index: matchIndex(option.label, needle, strategy) }))
    .filter((entry) => entry.index >= 0)
    .map(({ option, index }) => ({ option, highlights: runsAt(option.label, index, needle.length) }));
}

/** Where the needle matches the label under a literal strategy, or -1 for no match. */
function matchIndex(label: string, needle: string, strategy: PortalFilterStrategy): number {
  const haystack = label.toLowerCase();

  if (strategy === 'starts-with') return haystack.startsWith(needle) ? 0 : -1;

  return haystack.indexOf(needle);
}

/** The same three runs fuse.js would report for one contiguous match, so the option renders identically. */
function runsAt(label: string, start: number, length: number): HighlightedEntries {
  const labelEntries = [
    { text: label.slice(0, start), isHighlighted: false },
    { text: label.slice(start, start + length), isHighlighted: true },
    { text: label.slice(start + length), isHighlighted: false }
  ].filter((entry) => entry.text.length > 0);

  return { labelEntries, subtitleEntries: [] };
}

/** Splits each matched field into alternating unmatched and matched runs, in source order. */
function extractHighlights(result: FuseResult<PortalOptionSpec>): HighlightedEntries {
  const highlights: HighlightedEntries = { labelEntries: [], subtitleEntries: [] };

  for (const match of result.matches ?? []) {
    const target = match.key === 'label' ? 'labelEntries' : match.key === 'subtitle' ? 'subtitleEntries' : null;
    if (!target) continue;

    const value = String(match.value);
    let lastIndex = 0;

    for (const [start, end] of match.indices) {
      if (start > lastIndex) {
        highlights[target].push({ text: value.slice(lastIndex, start), isHighlighted: false });
      }
      highlights[target].push({ text: value.slice(start, end + 1), isHighlighted: true });
      lastIndex = end + 1;
    }

    if (lastIndex < value.length) {
      highlights[target].push({ text: value.slice(lastIndex), isHighlighted: false });
    }
  }

  return highlights;
}
