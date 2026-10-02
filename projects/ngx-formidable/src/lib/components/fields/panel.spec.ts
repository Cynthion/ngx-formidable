import { By } from '@angular/platform-browser';
import { Locator, page, userEvent } from 'vitest/browser';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { DateField } from './date-field/date-field';

/**
 * The panel `dropdown-field`, `autocomplete-field` and `date-field` share, per **Panels** and **Keyboard** in
 * `user/fields.md`. Focus stays in the field's input while the panel is used: a press inside it keeps focus
 * there, so a pick is neither a blur nor a touch, and the touch comes once focus leaves the field. The panel
 * closes on a pick, on `Tab` and on a click outside the field, and an open one is placed again as the page
 * scrolls.
 *
 * Every spec opens the panel and picks from it as a user does, with trusted clicks and keys.
 */

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma', disabled: true }
];

/** **Tab Out Of An Open Calendar** in `impl/backlog.md`. */
const TAB_INTO_CLOSING_CALENDAR = "Tab moves focus into the calendar's first button as the panel closes over it";

const combobox = () => page.getByRole('combobox', { name: 'Choice' });
const calendar = () => page.getByRole('dialog', { name: 'Choice' });
const next = () => page.getByRole('button', { name: 'Next' });

interface PanelCase {
  kind: FieldKind;
  inputs?: Record<string, unknown>;
  /** Opens the panel as a user does, leaving focus in the input. */
  open: (field: BoundField) => Promise<void>;
  /** A spot inside the open panel that a press picks nothing from, such as a disabled option. */
  inert: () => Locator;
  /** What a user clicks to pick from the open panel, and the model that pick leaves. */
  pick: () => Locator;
  picked: unknown;
}

const cases: PanelCase[] = [
  {
    kind: 'dropdown',
    inputs: { options: OPTIONS },
    // The display input takes no pointer events, so a click on it lands on the field around it.
    open: () => userEvent.click(combobox(), { force: true }),
    inert: () => page.getByRole('option', { name: 'Gamma' }),
    pick: () => page.getByRole('option', { name: 'Alpha' }),
    picked: 'a'
  },
  {
    kind: 'autocomplete',
    inputs: { options: OPTIONS },
    open: async () => {
      await userEvent.click(combobox());
      await userEvent.keyboard('{ArrowDown}');
    },
    inert: () => page.getByRole('option', { name: 'Gamma' }),
    pick: () => page.getByRole('option', { name: 'Alpha' }),
    picked: 'a'
  },
  {
    kind: 'date',
    open: (field) => userEvent.click(field.element.querySelector('.toggle')!),
    inert: () => calendar().getByTitle('Monday'),
    pick: () => calendar().getByRole('button', { name: '15', exact: true }),
    picked: expect.any(Date)
  }
];

interface OpenPanel extends BoundField {
  /** Whether the decorator shows the field focused. */
  isFocused: () => boolean;
}

/** Binds the field under a label, with a button after it unless `layout` puts something else around it. */
function bind({ kind, inputs }: PanelCase, layout: { before?: string; after?: string } = {}): Promise<BoundField> {
  return bindField(kind, 'signal', {
    inputs,
    decorated: true,
    decoration: '<div formidableFieldLabel>Choice</div>',
    after: '<button type="button">Next</button>',
    ...layout
  });
}

/** Binds the field and opens its panel. */
async function openPanel(panelCase: PanelCase, layout: { before?: string } = {}): Promise<OpenPanel> {
  const field = await bind(panelCase, layout);
  const decorator = field.element.closest('formidable-field-decorator')!;

  await panelCase.open(field);
  await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');

  return {
    ...field,
    isFocused: () => decorator.classList.contains('is-focused')
  };
}

describe('panel', () => {
  beforeEach(() => {
    configureFormidableTestBed();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  for (const panelCase of cases) {
    describe(`of ${panelCase.kind}-field`, () => {
      it('opens with focus in the input', async () => {
        const { isFocused } = await openPanel(panelCase);

        await expect.element(combobox()).toHaveFocus();
        expect(isFocused()).toBe(true);
      });

      it('keeps focus in the input on a press inside the panel', async () => {
        const { fixture, isFocused, events } = await openPanel(panelCase);

        // Forced, because a disabled option is no target to Playwright, though a user can still press it.
        await userEvent.click(panelCase.inert(), { force: true });
        await settle(fixture);

        await expect.element(combobox()).toHaveFocus();
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
        expect(isFocused()).toBe(true);
        expect(events()).toEqual([]);
      });

      it('takes a pick into the model without a blur or a touch', async () => {
        const { fixture, isFocused, events, touched, value } = await openPanel(panelCase);

        await userEvent.click(panelCase.pick());
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
        await settle(fixture);

        expect(value()).toEqual(panelCase.picked);
        await expect.element(combobox()).toHaveFocus();
        expect(isFocused()).toBe(true);
        expect(events()).toEqual(['value']);
        expect(touched()).toBe(false);
      });

      it('touches once, when focus leaves the field after a pick', async () => {
        const { fixture, isFocused, events, touched } = await openPanel(panelCase);

        await userEvent.click(panelCase.pick());
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
        await userEvent.tab();
        await expect.element(next()).toHaveFocus();
        await settle(fixture);

        expect(isFocused()).toBe(false);
        expect(events()).toEqual(['value', 'touch']);
        expect(touched()).toBe(true);
      });

      it('closes on Tab, and focus moves on', async ({ skip }) => {
        if (panelCase.kind === 'date') skip(TAB_INTO_CLOSING_CALENDAR);

        await openPanel(panelCase);

        await userEvent.tab();

        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
        await expect.element(next()).toHaveFocus();
      });

      // Above the field, where no panel covers it.
      it('closes on a click outside the field', async () => {
        const { isFocused } = await openPanel(panelCase, { before: '<button type="button">Elsewhere</button>' });

        await userEvent.click(page.getByRole('button', { name: 'Elsewhere' }));

        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
        expect(isFocused()).toBe(false);
      });

      it('places an open panel again as the page scrolls', async () => {
        const spacer = '<div style="height: 100vh"></div>';
        const field = await bind(panelCase, { before: spacer, after: spacer });
        const panel = field.element.querySelector('.panel')!;
        const input = () => combobox().element().getBoundingClientRect();
        const centre = (rect: DOMRect) => rect.top + rect.height / 2;
        const isAbove = () => centre(panel.getBoundingClientRect()) < centre(input());

        // The field just above the fold, where the panel has no room below it.
        window.scrollBy(0, input().bottom - innerHeight + 8);
        await panelCase.open(field);
        await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
        await expect.poll(isAbove).toBe(true);

        // The field at the top of the viewport, with room below it again.
        window.scrollBy(0, input().top - 8);
        await expect.poll(isAbove).toBe(false);
      });
    });
  }

  /**
   * The calendar is the one panel with controls of its own that take focus: its month and year selects, which
   * open only on a press they keep.
   */
  describe('of date-field, with focus on its month select', () => {
    const [, , dateCase] = cases;

    async function focusMonthSelect(): Promise<OpenPanel & { select: HTMLSelectElement }> {
      const field = await openPanel(dateCase!);
      const select = calendar().getByRole('combobox', { name: 'Month' }).element() as HTMLSelectElement;

      await userEvent.click(select);
      await expect.element(select).toHaveFocus();

      return { ...field, select };
    }

    it('keeps the field focused, neither committed nor touched', async () => {
      const { fixture, isFocused, events } = await focusMonthSelect();
      await settle(fixture);

      expect(isFocused()).toBe(true);
      expect(events()).toEqual([]);
    });

    // Pikaday redraws its selects on a change, and a focused element taken out of the page blurs.
    it('keeps the field focused through a change of month', async () => {
      const { fixture, select, isFocused, events } = await focusMonthSelect();

      await userEvent.selectOptions(select, select.options[0]!.value);
      await expect.element(combobox()).toHaveFocus();
      await settle(fixture);

      expect(isFocused()).toBe(true);
      expect(events()).toEqual([]);
    });

    it('keeps the field focused through a step of the calendar', async () => {
      const { fixture, isFocused, events } = await focusMonthSelect();

      await userEvent.keyboard('{ArrowDown}');
      await expect.element(combobox()).toHaveFocus();
      await settle(fixture);

      expect(isFocused()).toBe(true);
      expect(events()).toEqual([]);
    });

    it('hands focus back to the input when a pick closes the panel', async () => {
      const { fixture, isFocused, events, value } = await focusMonthSelect();

      await userEvent.click(dateCase!.pick());
      await expect.element(combobox()).toHaveFocus();
      await settle(fixture);

      expect(value()).toEqual(expect.any(Date));
      expect(isFocused()).toBe(true);
      expect(events()).toEqual(['value']);
    });

    // A consumer reaches `togglePanel` through a `viewChild()`, as `focus()` is reached.
    it('hands focus back to the input when its consumer closes the panel', async () => {
      const { fixture, isFocused, events } = await focusMonthSelect();

      fixture.debugElement.query(By.directive(DateField)).injector.get(DateField).togglePanel(false);
      await expect.element(combobox()).toHaveFocus();
      await settle(fixture);

      await expect.element(combobox()).toHaveAttribute('aria-expanded', 'false');
      expect(isFocused()).toBe(true);
      expect(events()).toEqual([]);
    });

    it('touches when focus leaves the field from the select', async () => {
      const { fixture, isFocused, events, touched } = await focusMonthSelect();

      await userEvent.click(next());
      await expect.element(next()).toHaveFocus();
      await settle(fixture);

      expect(isFocused()).toBe(false);
      expect(events()).toEqual(['touch']);
      expect(touched()).toBe(true);
    });
  });
});
