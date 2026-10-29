import { Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { FormidableIcons } from '../../models/formidable.model';
import { provideNgxFormidable } from '../../provide-ngx-formidable';
import { bindField, BoundField, FieldKind } from '../../testing/bind-field';
import { theme } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { DateField } from './date-field/date-field';
import { DropdownField } from './dropdown-field/dropdown-field';
import { SelectField } from './select-field/select-field';

/**
 * The icons the fields draw, per **Icons** in `user/fields.md`: the toggle of the select, dropdown and date
 * fields, and the calendar's month arrows. Each is the library's inline-SVG chevron unless
 * `provideNgxFormidable({ icons })` provides one, and projected `[formidableFieldToggleIcon]` content replaces
 * the toggle's either way, for as long as it renders. The test host does not import `FieldToggleIcon`, so a consumer who forgets to is
 * covered too.
 */

// The library's chevrons, told apart by their points.
const DOWN = '4.25 7.75 12 15.5 19.75 7.75';
const UP = '4.25 16.25 12 8.5 19.75 16.25';
const LEFT = '16.25 4.25 8.5 12 16.25 19.75';
const RIGHT = '7.75 4.25 15.5 12 7.75 19.75';

/** A consumer's icon component, configured through an input and sized in `em`, as an icon library's is. */
@Component({ template: '<i class="test-icon" style="display: block; width: 1em; height: 1em">{{ glyph() }}</i>' })
class TestIcon {
  readonly glyph = input('');
}

/** A toggle icon projected under a condition, as a consumer's template may switch it. */
@Component({
  imports: [DateField, DropdownField, SelectField],
  template: `
    <formidable-select-field>
      @if (custom()) {
        <span formidableFieldToggleIcon>★</span>
      }
    </formidable-select-field>
    <formidable-dropdown-field>
      @if (custom()) {
        <span formidableFieldToggleIcon>★</span>
      }
    </formidable-dropdown-field>
    <formidable-date-field>
      @if (custom()) {
        <span formidableFieldToggleIcon>★</span>
      }
    </formidable-date-field>
  `
})
class ConditionalIconHost {
  readonly custom = signal(false);
}

const iconOf = (glyph: string) => ({ component: TestIcon, inputs: { glyph } });

/** Adds the icons to the test bed `configureFormidableTestBed` set up, as a consumer's app config would. */
const provideIcons = (icons: FormidableIcons) =>
  TestBed.configureTestingModule({ providers: provideNgxFormidable({ icons }) });

const combobox = () => page.getByRole('combobox', { name: 'Choice' });
const toggleOf = (field: BoundField) => field.element.querySelector<HTMLElement>('.toggle, .dropdown-toggle')!;
const chevronOf = (element: Element) => element.querySelector('formidable-field-icon polyline')?.getAttribute('points');
const glyphsOf = (element: Element) => [...element.querySelectorAll('.test-icon')].map((icon) => icon.textContent);
const sizeOf = (element: Element) => {
  const rect = element.querySelector('.test-icon')!.getBoundingClientRect();

  return [rect.width, rect.height];
};
/** Whether the toggle draws its own icon, the library's or a provided one, rather than projected content. */
const drawsIcon = (toggle: Element) => toggle.querySelector('formidable-field-icon')!.checkVisibility();

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
      it("draws the library's chevron in the text color", async () => {
        const toggle = toggleOf(await bind(kind));
        const chevron = toggle.querySelector('polyline')!;

        expect(chevronOf(toggle)).toBe(DOWN);
        expect(getComputedStyle(chevron).stroke).toBe(getComputedStyle(toggle).color);
      });

      it('sizes its icon from the theme', async () => {
        theme('--formidable-icon-size', '20px');
        const icon = toggleOf(await bind(kind))
          .querySelector('formidable-field-icon')!
          .getBoundingClientRect();

        expect(icon.width).toBe(20);
        expect(icon.height).toBe(20);
      });

      it('draws a provided icon with its inputs, `1em` being the icon size', async () => {
        provideIcons({ fieldToggle: iconOf('▼') });
        theme('--formidable-icon-size', '20px');
        const toggle = toggleOf(await bind(kind));

        expect(glyphsOf(toggle)).toEqual(['▼']);
        expect(sizeOf(toggle)).toEqual([20, 20]);
        expect(chevronOf(toggle)).toBeUndefined();
      });

      if (open) {
        it('flips its chevron while the panel is open', async () => {
          const field = await bind(kind);

          await open(field);

          await expect.poll(() => chevronOf(toggleOf(field))).toBe(UP);
        });

        it('takes the provided open icon while the panel is open', async () => {
          provideIcons({ fieldToggle: iconOf('▼'), fieldToggleOpen: iconOf('▲') });
          const field = await bind(kind);

          await open(field);

          await expect.poll(() => glyphsOf(toggleOf(field))).toEqual(['▲']);
        });

        it('keeps the provided icon open when no open one is provided', async () => {
          provideIcons({ fieldToggle: iconOf('▼') });
          const field = await bind(kind);

          await open(field);

          await expect.element(combobox()).toHaveAttribute('aria-expanded', 'true');
          expect(glyphsOf(toggleOf(field))).toEqual(['▼']);
          expect(chevronOf(toggleOf(field))).toBeUndefined();
        });
      }

      it('draws projected content instead of any icon', async () => {
        provideIcons({ fieldToggle: iconOf('▼') });
        const toggle = toggleOf(await bind(kind, '<span formidableFieldToggleIcon>★</span>'));

        expect(toggle.querySelector('[formidableFieldToggleIcon]')).toHaveTextContent('★');
        expect(drawsIcon(toggle)).toBe(false);
      });
    });
  }

  // Angular settles an `<ng-content>` fallback once, and counts an `@if` as content even while it renders
  // nothing, so a fallback would leave all three toggles empty here.
  it('draws its icon while a projected @if renders nothing, and gives way while it renders', async () => {
    const fixture = TestBed.createComponent(ConditionalIconHost);
    await settle(fixture);
    const toggles = (): HTMLElement[] => [...fixture.nativeElement.querySelectorAll('.toggle, .dropdown-toggle')];

    expect(toggles().map(drawsIcon)).toEqual([true, true, true]);

    fixture.componentInstance.custom.set(true);
    await settle(fixture);

    expect(toggles().map(drawsIcon)).toEqual([false, false, false]);
    expect(toggles().map((toggle) => toggle.textContent?.trim())).toEqual(['★', '★', '★']);

    fixture.componentInstance.custom.set(false);
    await settle(fixture);

    expect(toggles().map(drawsIcon)).toEqual([true, true, true]);
  });

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

  const previous = () => document.querySelector<HTMLElement>('.pika-prev')!;
  const next = () => document.querySelector<HTMLElement>('.pika-next')!;
  const month = () => document.querySelector<HTMLSelectElement>('.pika-select-month')!.value;

  async function openCalendar(): Promise<void> {
    const field = await bind('date');

    await userEvent.click(toggleOf(field));
    await expect.element(page.getByRole('dialog', { name: 'Choice' })).toBeVisible();
  }

  it("draw the library's chevrons, sized from the theme", async () => {
    theme('--formidable-icon-size', '20px');
    await openCalendar();

    expect(chevronOf(previous())).toBe(LEFT);
    expect(chevronOf(next())).toBe(RIGHT);
    expect(next().querySelector('formidable-field-icon')!.getBoundingClientRect().width).toBe(20);
  });

  // The buttons zero their font size to hide their label, which an icon sized in `em` must not inherit.
  it('draw the provided icons, `1em` being the icon size', async () => {
    provideIcons({ dateFieldPanelPrevious: iconOf('◀'), dateFieldPanelNext: iconOf('▶') });
    theme('--formidable-icon-size', '20px');
    await openCalendar();

    expect(glyphsOf(previous())).toEqual(['◀']);
    expect(glyphsOf(next())).toEqual(['▶']);
    expect(sizeOf(previous())).toEqual([20, 20]);
    expect(sizeOf(next())).toEqual([20, 20]);
  });

  // Pikaday turns the month only when the press lands on the button itself, and rebuilds both buttons as it
  // does, so the icon must let the press through and come back exactly once.
  it('turn the month on a click on the icon, and keep one icon each through the redraw', async () => {
    await openCalendar();
    const before = month();

    await userEvent.click(next());

    await expect.poll(month).not.toBe(before);
    expect(previous().querySelectorAll('formidable-field-icon')).toHaveLength(1);
    expect(next().querySelectorAll('formidable-field-icon')).toHaveLength(1);
  });
});
