/** One run of text in a fuzzy match, flagged with whether the filter matched it. */
export interface HighlightEntry {
  text: string;
  isHighlighted: boolean;
}

/** The two lines `example-fuzzy-option` renders, each split into matched and unmatched runs. */
export interface HighlightedEntries {
  labelEntries: HighlightEntry[];
  subtitleEntries: HighlightEntry[];
}
