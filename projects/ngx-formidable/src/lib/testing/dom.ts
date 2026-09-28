/** A text editor a field renders. */
export type Editor = HTMLInputElement | HTMLTextAreaElement;

const themed = new Set<string>();

/** Replaces the editor's whole text and reports it with one `input`, the way a paste or an autofill does. */
export function fill(editor: Editor, text: string): void {
  editor.value = text;
  editor.dispatchEvent(new Event('input'));
}

/**
 * Types into the focused editor one keystroke at a time, at its live caret: a `keydown`, then the insertion
 * the browser makes of it. Use `fill` where the caret does not matter.
 */
export function type(editor: Editor, text: string): void {
  for (const character of text) {
    press(editor, character);
    document.execCommand('insertText', false, character);
  }
}

/** Dispatches a `keydown` that bubbles and can be cancelled, as a keyboard's does, and returns it. */
export function press(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });

  target.dispatchEvent(event);

  return event;
}

/**
 * What an id-reference attribute such as `aria-controls` or `aria-describedby` points at, in the order it
 * names them. An id nothing carries resolves to `null`, so a dangling reference fails the assertion.
 */
export function referenced(element: Element, attribute: string): (HTMLElement | null)[] {
  return (element.getAttribute(attribute) ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.querySelector<HTMLElement>(`[id="${id}"]`));
}

/**
 * Overrides a custom property on the document root, the one place a consumer themes from. It lasts until
 * the next `configureFormidableTestBed()`.
 */
export function theme(property: string, value: string): void {
  document.documentElement.style.setProperty(property, value);
  themed.add(property);
}

/** Takes back every `theme()` override. */
export function clearTheme(): void {
  themed.forEach((property) => document.documentElement.style.removeProperty(property));
  themed.clear();
}

/** A length in rem as px, so an expectation stays written in its token's own unit. */
export function rem(value: number): number {
  return value * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/** The four resolved corner radii, clockwise from the top left. */
export function corners(element: Element): string[] {
  const style = getComputedStyle(element);

  return [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius
  ];
}
