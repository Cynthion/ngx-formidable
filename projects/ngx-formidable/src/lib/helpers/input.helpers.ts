/** Collapses the selection to the end of the text, so typing continues rather than replacing it. */
export function setCaretPositionToEnd(elementRef: HTMLInputElement | HTMLTextAreaElement): void {
  const len = elementRef.value.length;
  elementRef.setSelectionRange(len, len);
}

/**
 * Renders the empty state of a masked date/time input.
 *
 * While focused, ngx-mask must own the text: its caret math only recognizes its own placeholder
 * character, and any other filler (a format hint like "dd . MM . yyyy") makes it shift the caret
 * back by one on the first keystroke. So show the hint only at rest.
 */
export function renderEmptyMask(
  elementRef: HTMLInputElement,
  hint: string,
  placeholder: string,
  isFocused: boolean
): void {
  const next = isFocused ? placeholder : hint;

  if (elementRef.value !== next) elementRef.value = next;
  if (isFocused) elementRef.setSelectionRange(0, 0);
}

/** Whether a keystroke is one that types a character, which is what starts a type-ahead. */
export function isPrintableCharacter(event: KeyboardEvent): boolean {
  const key = event.key;

  // Filter out control keys like Shift, Enter, etc.
  return key.length === 1 && !event.ctrlKey && !event.metaKey;
}
