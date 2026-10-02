import { userEvent } from 'vitest/browser';

/** A text editor a field renders. */
export type Editor = HTMLInputElement | HTMLTextAreaElement;

const themed = new Set<string>();

/**
 * Clicks the editor with a trusted click where the caret before `index` sits, so the browser places the caret
 * there itself. The point is measured in the editor's own font, on its first line of text. `Shift` extends
 * the selection the editor already has, as a pointer does.
 */
export async function clickAt(editor: Editor, index: number, modifiers: 'Shift'[] = []): Promise<void> {
  const style = getComputedStyle(editor);
  const context = document.createElement('canvas').getContext('2d')!;
  context.font = style.font;
  context.letterSpacing = style.letterSpacing;

  const top = parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop);
  const bottom = parseFloat(style.borderBottomWidth) + parseFloat(style.paddingBottom);
  const x =
    parseFloat(style.borderLeftWidth) +
    parseFloat(style.paddingLeft) +
    context.measureText(editor.value.slice(0, index)).width -
    editor.scrollLeft;
  // A textarea starts at its first line; an input centres its one line in its content box.
  const y =
    editor instanceof HTMLTextAreaElement
      ? top + parseFloat(style.lineHeight) / 2
      : top + (editor.offsetHeight - top - bottom) / 2;

  await userEvent.click(editor, { position: { x, y }, modifiers });
}

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
 * Clicks as a pointer does: a `mousedown`, a `mouseup` and a `click`, all bubbling and cancelable. A dispatched
 * event has no default action, so this performs the press's own: unless a listener cancelled the `mousedown`,
 * focus moves to the nearest focusable ancestor, or leaves when there is none.
 */
export function click(target: Element): void {
  const init = { bubbles: true, cancelable: true };

  if (target.dispatchEvent(new MouseEvent('mousedown', init))) {
    const focusable = target.closest<HTMLElement>('a[href], button, input, select, textarea, [tabindex]');

    if (focusable) focusable.focus();
    else (document.activeElement as HTMLElement | null)?.blur();
  }

  target.dispatchEvent(new MouseEvent('mouseup', init));
  target.dispatchEvent(new MouseEvent('click', init));
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
