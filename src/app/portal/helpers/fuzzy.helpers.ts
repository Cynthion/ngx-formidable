import Fuse, { FuseResult, IFuseOptions } from 'fuse.js';
import { HighlightedEntries } from '../../example-fuzzy-option/example-fuzzy-option.model';
import { PortalOptionSpec } from '../model/field-spec.model';

/** One option after filtering, carrying the runs the filter matched so the option can mark them. */
export interface FuzzyMatch {
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
 */
export function fuzzyFilter(options: readonly PortalOptionSpec[], filter: string): readonly FuzzyMatch[] {
  const trimmed = filter.trim();

  if (!trimmed) return options.map((option) => ({ option, highlights: EMPTY }));

  const results = new Fuse([...options], FUSE_OPTIONS).search(trimmed);

  return [...results]
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
    .map((result) => ({ option: result.item, highlights: extractHighlights(result) }));
}

/** Splits each matched field into alternating unmatched and matched runs, in source order. */
export function extractHighlights(result: FuseResult<PortalOptionSpec>): HighlightedEntries {
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
