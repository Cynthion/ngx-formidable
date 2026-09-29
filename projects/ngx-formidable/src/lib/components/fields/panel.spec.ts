import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { click, press } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of the panel `dropdown-field`, `autocomplete-field` and `date-field` share. A press inside it keeps
 * focus in the input, so a pick is neither a blur nor a touch; focus on a control inside it is still the
 * field's; a panel closing with focus inside hands it back to the input; a click outside the field closes it;
 * and a scroll or resize measures an open panel only.
 */

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

interface PanelCase {
  kind: FieldKind;
  inputs?: Record<string, unknown>;
  /** Opens the panel as a user does, leaving focus in the input. */
  open: (element: HTMLElement) => void;
  /** What a user clicks to pick from the open panel, and the model that pick leaves. */
  pick: (element: HTMLElement) => Element;
  picked: unknown;
}

const firstOption = (element: HTMLElement) => element.querySelector('formidable-field-option div')!;

const cases: PanelCase[] = [
  {
    kind: 'dropdown',
    inputs: { options },
    open: (element) => click(element.querySelector('.input-wrapper')!),
    pick: firstOption,
    picked: 'a'
  },
  {
    kind: 'autocomplete',
    inputs: { options },
    open: (element) => {
      const input = element.querySelector('input')!;

      input.focus();
      press(input, 'ArrowDown');
    },
    pick: firstOption,
    picked: 'a'
  },
  {
    kind: 'date',
    open: (element) => click(element.querySelector('.toggle')!),
    pick: (element) => element.querySelector('.pika-button:not(.is-empty)')!,
    picked: jasmine.any(Date)
  }
];

interface OpenPanel extends BoundField {
  input: HTMLInputElement;
  panel: HTMLElement;
  /** Whether the decorator shows the field focused. */
  isFocused: () => boolean;
}

async function openPanel({ kind, inputs, open }: PanelCase): Promise<OpenPanel> {
  const field = await bindField(kind, 'signal', { inputs, decorated: true });
  const decorator = field.element.closest('formidable-field-decorator')!;

  open(field.element);
  await settle(field.fixture);

  return {
    ...field,
    input: field.element.querySelector('input')!,
    panel: field.element.querySelector<HTMLElement>('.panel')!,
    isFocused: () => decorator.classList.contains('is-focused')
  };
}

describe('panel', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const panelCase of cases) {
    describe(`of ${panelCase.kind}-field`, () => {
      it('opens with focus in the input', async () => {
        const { input, panel, isFocused } = await openPanel(panelCase);

        expect(panel.classList).toContain('open');
        expect(document.activeElement).toBe(input);
        expect(isFocused()).toBe(true);
      });

      it('keeps focus in the input on a press inside the panel', async () => {
        const { fixture, input, panel, isFocused, events } = await openPanel(panelCase);

        click(panel);
        await settle(fixture);

        expect(document.activeElement).toBe(input);
        expect(isFocused()).toBe(true);
        expect(events()).toEqual([]);
      });

      it('takes a pick into the model without a blur or a touch', async () => {
        const { fixture, element, input, panel, isFocused, events, touched, value } = await openPanel(panelCase);

        click(panelCase.pick(element));
        await settle(fixture);

        expect(value()).toEqual(panelCase.picked);
        expect(panel.classList).not.toContain('open');
        expect(document.activeElement).toBe(input);
        expect(isFocused()).toBe(true);
        expect(events()).toEqual(['value']);
        expect(touched()).toBe(false);
      });

      it('touches once, when focus leaves the field after a pick', async () => {
        const { fixture, element, input, isFocused, events, touched } = await openPanel(panelCase);

        click(panelCase.pick(element));
        await settle(fixture);
        input.blur();
        await settle(fixture);

        expect(isFocused()).toBe(false);
        expect(events()).toEqual(['value', 'touch']);
        expect(touched()).toBe(true);
      });

      it('closes on a click outside the field', async () => {
        const { fixture, panel, isFocused } = await openPanel(panelCase);

        click(document.body);
        await settle(fixture);

        expect(panel.classList).not.toContain('open');
        expect(isFocused()).toBe(false);
      });

      describe('on a scroll or resize', () => {
        let measured: jasmine.Spy;

        // `offsetHeight` is the panel's own measurement, which placing it reads.
        const panelsMeasured = () =>
          measured.calls.all().filter((call) => (call.object as HTMLElement).classList.contains('panel')).length;

        function scrollAndResize(): void {
          document.dispatchEvent(new Event('scroll'));
          window.dispatchEvent(new Event('resize'));
        }

        it('measures no closed panel', async () => {
          const { fixture } = await bindField(panelCase.kind, 'signal', { inputs: panelCase.inputs });
          measured = spyOnProperty(HTMLElement.prototype, 'offsetHeight').and.callThrough();

          scrollAndResize();
          await settle(fixture, 60);

          expect(panelsMeasured()).toBe(0);
        });

        it('places an open panel again', async () => {
          const { fixture } = await openPanel(panelCase);
          measured = spyOnProperty(HTMLElement.prototype, 'offsetHeight').and.callThrough();

          scrollAndResize();
          await settle(fixture, 60);

          expect(panelsMeasured()).toBeGreaterThan(0);
        });
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
      const select = field.panel.querySelector<HTMLSelectElement>('.pika-select-month')!;

      click(select);
      await settle(field.fixture);

      return { ...field, select };
    }

    it('keeps the field focused, neither committed nor touched', async () => {
      const { select, isFocused, events } = await focusMonthSelect();

      expect(document.activeElement).toBe(select);
      expect(isFocused()).toBe(true);
      expect(events()).toEqual([]);
    });

    // Pikaday redraws its selects on a change, and a focused element taken out of the page blurs.
    it('keeps the field focused through a change of month', async () => {
      const { fixture, input, select, isFocused, events } = await focusMonthSelect();

      select.value = select.options[0]!.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await settle(fixture);

      expect(document.activeElement).toBe(input);
      expect(isFocused()).toBe(true);
      expect(events()).toEqual([]);
    });

    it('keeps the field focused through a step of the calendar', async () => {
      const { fixture, input, select, isFocused, events } = await focusMonthSelect();

      press(select, 'ArrowDown');
      await settle(fixture);

      expect(document.activeElement).toBe(input);
      expect(isFocused()).toBe(true);
      expect(events()).toEqual([]);
    });

    it('hands focus back to the input when a pick closes the panel', async () => {
      const { fixture, element, input, isFocused, events, value } = await focusMonthSelect();

      click(dateCase!.pick(element));
      await settle(fixture);

      expect(value()).toEqual(jasmine.any(Date));
      expect(document.activeElement).toBe(input);
      expect(isFocused()).toBe(true);
      expect(events()).toEqual(['value']);
    });

    it('touches when focus leaves the field from the select', async () => {
      const { fixture, select, isFocused, events, touched } = await focusMonthSelect();

      select.blur();
      await settle(fixture);

      expect(isFocused()).toBe(false);
      expect(events()).toEqual(['touch']);
      expect(touched()).toBe(true);
    });
  });
});
