/**
 * Puts text the field did not get from the user into the element, and collapses the caret behind it so
 * typing continues rather than replacing it.
 *
 * Text the element already shows is left untouched. Such a write replaced nothing, so the caret is still
 * where the user clicked it and the selection is still theirs — and a consumer that echoes its model back
 * writes that way on every keystroke.
 */
export function replaceText(elementRef: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  if (elementRef.value === text) return;

  elementRef.value = text;
  elementRef.setSelectionRange(text.length, text.length);
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

/**
 * The end of what a masked editor actually holds, which is as far as a caret in it can go.
 *
 * A mask with no placeholder left shows only content, trailing literals and all. One with placeholders
 * left ends after the last filled position: the empty slots are not a value, and neither is the separator
 * drawn between them and the last character — `079 123 __ __` ends at 7, not at 8 or 13.
 *
 * `placeholder` is the character the mask renders for a position not yet filled, which ngx-mask lets a
 * consumer change. Only meaningful for a masked editor, since plain text may hold that character itself.
 */
export function endOfMaskedValue(elementRef: HTMLInputElement | HTMLTextAreaElement, placeholder: string): number {
  const text = elementRef.value;
  const slot = text.indexOf(placeholder);

  if (slot === -1) return text.length;

  let end = slot;
  while (end > 0 && !/[a-z0-9]/i.test(text.charAt(end - 1))) end--;

  return end;
}

/** Whether a keystroke is one that types a character, which is what starts a type-ahead. */
export function isPrintableCharacter(event: KeyboardEvent): boolean {
  const key = event.key;

  // Filter out control keys like Shift, Enter, etc.
  return key.length === 1 && !event.ctrlKey && !event.metaKey;
}
