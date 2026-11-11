import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { theme } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * The handle a dropdown's and a combobox's panel is resized by, per **Panels** in `user/fields.md`. It sits on
 * the panel's far edge, so dragging it away from the field grows the panel and towards the field shrinks it,
 * on either side of the field. The height it is dragged to holds across closing and opening, never goes below
 * `--formidable-panel-min-height`, and a double-click on the handle takes it back to the theme's height. A drag
 * leaves focus in the field's input.
 *
 * Every spec drags the handle as a user does, with a trusted pointer. The list is long enough to overflow any
 * height the panel is dragged to, so the panel follows the pointer rather than its rows.
 */

const OPTIONS = Array.from({ length: 60 }, (_, index) => ({ value: `o${index}`, label: `Option ${index}` }));
const SPACER = '<div style="height: 100vh"></div>';
/** Where a drag ends: the pointer is moved onto it, so wherever it is put is where the drag goes. */
const DROP_TARGET = '<div id="drop" style="position: fixed; left: 50%; top: 0; width: 2px; height: 2px"></div>';

const combobox = () => page.getByRole('combobox', { name: 'Choice' });

interface ResizeCase {
  kind: FieldKind;
  /** Opens the panel as a user does, leaving focus in the input. */
  open: () => Promise<void>;
}

const cases: ResizeCase[] = [
  {
    kind: 'dropdown',
    // The display input takes no pointer events, so a click on it lands on the field around it.
    open: () => userEvent.click(combobox(), { force: true })
  },
  {
    kind: 'combobox',
    open: async () => {
      await userEvent.click(combobox());
      await userEvent.keyboard('{ArrowDown}');
    }
  }
];

interface ResizablePanel extends BoundField {
  /** The panel's height on the page. */
  height: () => number;
  /** Whether the panel sits above the field. */
  isAbove: () => boolean;
  /** Drags the handle `by` pixels down the page, or up it for a negative number. */
  drag: (by: number) => Promise<void>;
  /** Double-clicks the handle. */
  reset: () => Promise<void>;
}

/** Binds the field under a label, with the drop target and `before` ahead of it and a button after it. */
async function bind({ kind }: ResizeCase, before = ''): Promise<ResizablePanel> {
  const field = await bindField(kind, 'signal', {
    inputs: { options: OPTIONS },
    decorated: true,
    decoration: '<div formidableFieldLabel>Choice</div>',
    before: DROP_TARGET + before,
    after: '<button type="button">Next</button>'
  });
  const panel = field.element.querySelector<HTMLElement>('.panel')!;
  const handle = panel.querySelector<HTMLElement>('.panel-resize-handle')!;
  const target = document.getElementById('drop')!;
  const centre = (rect: DOMRect) => rect.top + rect.height / 2;

  return {
    ...field,
    height: () => panel.getBoundingClientRect().height,
    isAbove: () => centre(panel.getBoundingClientRect()) < centre(combobox().element().getBoundingClientRect()),
    drag: async (by) => {
      // The target's centre `by` below the grip's, which is where the pointer is moved to.
      target.style.top = `${centre(handle.getBoundingClientRect()) + by - 1}px`;
      await userEvent.dragAndDrop(page.elementLocator(handle), page.elementLocator(target), { force: true });
    },
    reset: () => userEvent.dblClick(page.elementLocator(handle))
  };
}

/** Opens the panel and lets it finish opening. */
async function open(field: ResizablePanel, resizeCase: ResizeCase): Promise<void> {
  await resizeCase.open();
  await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
  await settle(field.fixture, 250);
}

/** Whether the panel is `by` taller than `before`, to the pixel a drag can be off by. */
const grewBy = (field: ResizablePanel, before: number, by: number) => Math.abs(field.height() - (before + by)) <= 2;

describe('panel resize', () => {
  beforeEach(() => {
    configureFormidableTestBed();
  });

  for (const resizeCase of cases) {
    describe(`of ${resizeCase.kind}-field`, () => {
      it('grows by what its handle is dragged away from the field, with focus left in the input', async () => {
        const field = await bind(resizeCase);

        await open(field, resizeCase);
        const before = field.height();

        await field.drag(80);

        await expect.poll(() => grewBy(field, before, 80)).toBe(true);
        expect(document.activeElement).toBe(combobox().element());
      });

      it('shrinks by what its handle is dragged towards the field, and no further than the theme allows', async () => {
        theme('--formidable-panel-min-height', '100px');
        const field = await bind(resizeCase);

        await open(field, resizeCase);
        const before = field.height();

        await field.drag(-40);
        await expect.poll(() => grewBy(field, before, -40)).toBe(true);

        await field.drag(-before);
        await expect.poll(() => Math.abs(field.height() - 100) <= 2).toBe(true);
      });

      it('keeps the height it was dragged to when it is opened again', async () => {
        const field = await bind(resizeCase);

        await open(field, resizeCase);
        const before = field.height();

        await field.drag(60);
        await expect.poll(() => grewBy(field, before, 60)).toBe(true);

        await userEvent.keyboard('{Escape}');
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
        await open(field, resizeCase);

        expect(grewBy(field, before, 60)).toBe(true);
      });

      it('returns to the height its theme gives it on a double-click of its handle', async () => {
        const field = await bind(resizeCase);

        await open(field, resizeCase);
        const before = field.height();

        await field.drag(60);
        await expect.poll(() => grewBy(field, before, 60)).toBe(true);

        await field.reset();

        await expect.poll(() => grewBy(field, before, 0)).toBe(true);
      });

      it('flipped above the field, grows by what its handle is dragged up', async () => {
        const field = await bind(resizeCase, SPACER);
        const input = () => combobox().element().getBoundingClientRect();

        // The field just above the fold, where the panel has no room below it.
        window.scrollBy(0, input().bottom - innerHeight + 8);
        await open(field, resizeCase);
        await expect.poll(field.isAbove).toBe(true);
        const before = field.height();

        await field.drag(-80);

        await expect.poll(() => grewBy(field, before, 80)).toBe(true);
        expect(field.isAbove()).toBe(true);
      });
    });
  }
});
