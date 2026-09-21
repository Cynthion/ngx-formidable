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
 * Keeps the caret where a pointer put it in a masked field that already holds text.
 *
 * ngx-mask pulls the caret back to the end of what has been typed on every click, so a click on one of the
 * empty slots it renders lands short of where it was aimed. Call this on `mouseup`, which is after the
 * browser has placed the caret and before the `click` the mask acts on: the position read here is the one
 * the user chose, and the timer puts it back once the mask has had its say.
 *
 * A field holding nothing but slots is left alone — there is no text to click into, and the mask's caret at
 * the first slot is where typing starts.
 */
export function keepClickedCaret(elementRef: HTMLInputElement | HTMLTextAreaElement, hasText: boolean): void {
  if (!hasText) return;

  const { selectionStart, selectionEnd } = elementRef;

  // A timer and not a microtask: the mask acts on `click`, which is dispatched in the same task as this
  // `mouseup`, so a microtask queued here would still run before it.
  setTimeout(() => elementRef.setSelectionRange(selectionStart, selectionEnd));
}

/**
 * Puts the caret in front of the first slot a masked field has not filled yet, which is where the next
 * character typed lands. A field with no slots left — empty of them or full of text — takes the caret at
 * the end instead, and an empty one takes it at the front, since its first slot is its first character.
 *
 * `_` is ngx-mask's placeholder character, which the library does not let a consumer change.
 */
export function placeCaretAtNextSlot(elementRef: HTMLInputElement | HTMLTextAreaElement): void {
  const slot = elementRef.value.indexOf('_');
  const caret = slot === -1 ? elementRef.value.length : slot;

  elementRef.setSelectionRange(caret, caret);
}

/** Whether a keystroke is one that types a character, which is what starts a type-ahead. */
export function isPrintableCharacter(event: KeyboardEvent): boolean {
  const key = event.key;

  // Filter out control keys like Shift, Enter, etc.
  return key.length === 1 && !event.ctrlKey && !event.metaKey;
}
