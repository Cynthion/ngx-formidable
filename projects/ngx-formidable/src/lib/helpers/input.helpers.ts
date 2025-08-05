export function setCaretPositionToEnd(elementRef: HTMLInputElement | HTMLTextAreaElement): void {
  const len = elementRef.value.length;
  elementRef.setSelectionRange(len, len);
}
