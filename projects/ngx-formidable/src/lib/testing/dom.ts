import { onTestFinished } from 'vitest';
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

/**
 * Records the `keydown`s that reach the window until the test ends, where a form or a dialog around a field
 * hears them, and returns whether the last one of `key` arrived prevented: whether the field kept it from
 * the browser. `undefined` for a key that never arrived.
 */
export function keptKeys(): (key: string) => boolean | undefined {
  const kept = new Map<string, boolean>();
  const record = (event: KeyboardEvent) => kept.set(event.key, event.defaultPrevented);

  window.addEventListener('keydown', record);
  onTestFinished(() => window.removeEventListener('keydown', record));

  return (key) => kept.get(key);
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
