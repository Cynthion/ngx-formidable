export function setCaretPositionToEnd(elementRef: HTMLInputElement | HTMLTextAreaElement): void {
  const len = elementRef.value.length;
  elementRef.setSelectionRange(len, len);
}

export function isPrintableCharacter(event: KeyboardEvent): boolean {
  const key = event.key;

  // Filter out control keys like Shift, Enter, etc.
  return key.length === 1 && !event.ctrlKey && !event.metaKey;
}
