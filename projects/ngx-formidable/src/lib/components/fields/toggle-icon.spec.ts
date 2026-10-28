import { page, userEvent } from 'vitest/browser';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { theme } from '../../testing/dom';
import { configureFormidableTestBed } from '../../testing/test-bed';

/**
 * The icons the fields draw, per **Icons** in `user/fields.md`: the toggle of the select, dropdown and date fields,
 * and the calendar's month arrows. Each is a mask on `::before`, taken from a theme variable and sized by
 * `--formidable-icon-size`. Projected `[formidableFieldToggleIcon]` content replaces the toggle's; the test host
 * does not import `FieldToggleIcon`, so a consumer who forgets to is covered too.
 */

// Icons no default is, told apart by their viewBox, so a match can only come from the variable.
const svg = (viewBox: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'%3E%3Crect width='1' height='1'/%3E%3C/svg%3E")`;
const SQUARE = svg('0 0 1 1');
const WIDE = svg('0 0 2 1');
const TALL = svg('0 0 1 2');
const viewBoxOf = (mask: string) => /viewBox='([^']*)'/.exec(mask)?.[1];

const combobox = () => page.getByRole('combobox', { name: 'Choice' });
const toggleOf = (field: BoundField) => field.element.querySelector<HTMLElement>('.toggle, .dropdown-toggle')!;
const icon = (element: Element) => getComputedStyle(element, '::before');

interface ToggleCase {
  kind: FieldKind;
  /** Opens the panel as a user does, for the fields that have one. */
  open?: (field: BoundField) => Promise<void>;
}

const cases: ToggleCase[] = [
  { kind: 'select' },
  // The display input takes no pointer events, so a click on it lands on the field around it.
  { kind: 'dropdown', open: () => userEvent.click(combobox(), { force: true }) },
  { kind: 'date', open: (field) => userEvent.click(toggleOf(field)) }
];

function bind(kind: FieldKind, content = ''): Promise<BoundField> {
  return bindField(kind, 'signal', {
    inputs: kind === 'date' ? {} : { options: [{ value: 'a', label: 'Alpha' }] },
    content,
    decorated: true,
    decoration: '<div formidableFieldLabel>Choice</div>'
  });
}

describe('toggle icon', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const { kind, open } of cases) {
    describe(`on the ${kind} field`, () => {
      it('draws the default chevron', async () => {
        const toggle = toggleOf(await bind(kind));

        expect(icon(toggle).maskImage).toContain("viewBox='0 0 24 24'");
      });

      it('takes its icon and size from the theme', async () => {
        theme('--formidable-field-toggle-icon', SQUARE);
        theme('--formidable-icon-size', '20px');
        const toggle = toggleOf(await bind(kind));

        expect(viewBoxOf(icon(toggle).maskImage)).toBe('0 0 1 1');
        expect(icon(toggle).width).toBe('20px');
        expect(icon(toggle).height).toBe('20px');
      });

      it('takes a field-scoped icon over the root one', async () => {
        theme('--formidable-field-toggle-icon', SQUARE);
        const field = await bind(kind);
        field.element.style.setProperty('--formidable-field-toggle-icon', WIDE);

        expect(viewBoxOf(icon(toggleOf(field)).maskImage)).toBe('0 0 2 1');
      });

      if (open) {
        it('takes the open icon while the panel is open', async () => {
          theme('--formidable-field-toggle-icon', SQUARE);
          theme('--formidable-field-toggle-icon-open', TALL);
          const field = await bind(kind);

          await open(field);

          await expect.poll(() => viewBoxOf(icon(toggleOf(field)).maskImage)).toBe('0 0 1 2');
        });
      }

      it('draws projected content instead of its own icon', async () => {
        const toggle = toggleOf(await bind(kind, '<span formidableFieldToggleIcon>★</span>'));

        expect(toggle.querySelector('[formidableFieldToggleIcon]')).toHaveTextContent('★');
        expect(icon(toggle).content).toBe('none');
      });
    });
  }

  // The select's toggle overlays the control, which is positioned, so the toggle has to paint above it. A hit
  // test is the one occlusion check the DOM offers, so the icon takes pointer events back for it.
  it('paints a projected select icon over the select', async () => {
    const field = await bind('select', '<span formidableFieldToggleIcon style="pointer-events: auto">★</span>');
    const projected = field.element.querySelector('[formidableFieldToggleIcon]')!;
    const rect = projected.getBoundingClientRect();

    expect(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)).toBe(projected);
  });

  // The whole box opens the list, so projected content must not turn the toggle into a target that swallows
  // the click.
  it('lets a click on a projected select icon through to the select', async () => {
    const field = await bind('select', '<span formidableFieldToggleIcon>★</span>');
    const box = combobox().element().getBoundingClientRect();
    const rect = field.element.querySelector('[formidableFieldToggleIcon]')!.getBoundingClientRect();

    await userEvent.click(combobox(), {
      position: { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 },
      timeout: 1000
    });

    await expect.element(combobox()).toHaveFocus();
  });
});

describe('calendar month arrows', () => {
  beforeEach(() => configureFormidableTestBed());

  it('take their icons and size from the theme', async () => {
    theme('--formidable-date-field-panel-previous-icon', WIDE);
    theme('--formidable-date-field-panel-next-icon', TALL);
    theme('--formidable-icon-size', '20px');
    const field = await bind('date');

    await userEvent.click(toggleOf(field));
    await expect.element(page.getByRole('dialog', { name: 'Choice' })).toBeVisible();

    const previous = icon(document.querySelector('.pika-prev')!);
    const next = icon(document.querySelector('.pika-next')!);

    expect(viewBoxOf(previous.maskImage)).toBe('0 0 2 1');
    expect(viewBoxOf(next.maskImage)).toBe('0 0 1 2');
    expect(previous.width).toBe('20px');
    expect(next.height).toBe('20px');
  });
});
