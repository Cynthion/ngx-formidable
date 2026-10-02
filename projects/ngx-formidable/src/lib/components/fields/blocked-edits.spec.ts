import { By } from '@angular/platform-browser';
import { page, userEvent } from 'vitest/browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, BoundField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of a readonly or disabled field: nothing edits it. Not a public mutator a consumer calls, not the
 * keys a native control acts on of its own accord, not a pointer press. A readonly option is the same within
 * its list: nothing picks it.
 */

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

/** Every public mutator the fields have between them, and `focus()`. */
interface Mutators {
  toggle(): void;
  selectValue(value: number): void;
  selectDate(date: Date | null): void;
  selectTime(time: Date | null): void;
  selectOption(option: FormidableOption): void;
  focus(): void;
}

/** The field, as a consumer holding it through `viewChild()` reaches it. */
const mutators = ({ fixture, element }: BoundField) =>
  fixture.debugElement.query(By.css(element.localName)).componentInstance as Mutators;

const pickFirst = (field: Mutators) => field.selectOption(options[0]!);

// Each field's public mutator, called with an edit that would change `value`.
const mutated: Record<
  string,
  { kind: FieldKind; value: unknown; hasOptions?: boolean; mutate: (field: Mutators) => void }
> = {
  'toggle': { kind: 'toggle', value: true, mutate: (field) => field.toggle() },
  'slider': { kind: 'slider', value: 40, mutate: (field) => field.selectValue(60) },
  'date': { kind: 'date', value: new Date(2020, 0, 2), mutate: (field) => field.selectDate(new Date(2024, 4, 12)) },
  'time': {
    kind: 'time',
    value: new Date(1970, 0, 1, 13, 45),
    mutate: (field) => field.selectTime(new Date(1970, 0, 1, 8, 15))
  },
  'dropdown': { kind: 'dropdown', value: 'b', hasOptions: true, mutate: pickFirst },
  'autocomplete': { kind: 'autocomplete', value: 'b', hasOptions: true, mutate: pickFirst },
  'radio group': { kind: 'radio-group', value: 'b', hasOptions: true, mutate: pickFirst },
  'checkbox group': { kind: 'checkbox-group', value: ['b'], hasOptions: true, mutate: pickFirst }
};

describe('blocked edits', () => {
  beforeEach(() => {
    configureFormidableTestBed();

    // A focused element left over from a previous spec would take the first Tab somewhere else.
    (document.activeElement as HTMLElement | null)?.blur();
  });

  for (const api of FORMS_APIS) {
    for (const [key, { kind, value, hasOptions, mutate }] of Object.entries(mutated)) {
      for (const state of ['readonly', 'disabled'] as const) {
        it(`ignores its public mutator while ${state}: ${key}, bound ${api}`, async () => {
          const bound = await bindField(kind, api, { value, inputs: hasOptions ? { options } : {} });
          await bound.state({ [state]: true });

          mutate(mutators(bound));
          await settle(bound.fixture);

          expect(bound.value()).toEqual(value);
          expect(bound.dirty()).toBe(false);
          expect(bound.events()).toEqual([]);
        });
      }
    }
  }

  // A range input ignores `readonly`, so a press on its track and its own keys would move the thumb.
  describe('slider', () => {
    const slider = () => page.getByRole('slider', { name: 'Volume' });
    const position = () => (slider().element() as HTMLInputElement).value;

    const bind = () =>
      bindField('slider', 'signal', {
        value: 40,
        decorated: true,
        decoration: '<div formidableFieldLabel>Volume</div>'
      });

    /** A press near the far end of the track, well away from the thumb. */
    const pressTrackEnd = (force = false) => {
      const { width, height } = slider().element().getBoundingClientRect();

      return userEvent.click(slider(), { position: { x: width - 2, y: height / 2 }, force });
    };

    it('moves the thumb on a press on its track and on its keys while editable', async () => {
      const bound = await bind();

      await pressTrackEnd();
      await expect.poll(bound.value).toBeGreaterThan(90);

      await userEvent.keyboard('{Home}');
      await expect.poll(bound.value).toBe(0);
    });

    for (const state of ['readonly', 'disabled'] as const) {
      it(`keeps a press on its track from moving the thumb while ${state}`, async () => {
        const bound = await bind();
        await bound.state({ [state]: true });

        // Playwright refuses to press a readonly or disabled control, which a user still can.
        await pressTrackEnd(true);
        await settle(bound.fixture);

        expect(position()).toBe('40');
        expect(bound.events()).toEqual([]);
      });
    }

    // A disabled slider takes no focus, so no key reaches it. A readonly one leaves the tab order, and a click
    // does not focus it either: **Readonly Slider Takes No Click** in `impl/backlog.md`.
    it('keeps its keys from moving the thumb while readonly', async () => {
      const bound = await bind();
      await bound.state({ readonly: true });

      mutators(bound).focus();
      await expect.element(slider()).toHaveFocus();

      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) {
        await userEvent.keyboard(`{${key}}`);
        await settle(bound.fixture);

        expect(position(), key).toBe('40');
      }

      expect(bound.events()).toEqual([]);
    });
  });

  describe('readonly option', () => {
    const lockedFirst = [{ value: 'a', label: 'Alpha', readonly: true }, ...options.slice(1)];

    for (const [kind, role] of [
      ['radio-group', 'radiogroup'],
      ['checkbox-group', 'group']
    ] as const) {
      it(`is skipped by the highlight, so Enter picks the next option: ${kind}`, async () => {
        const bound = await bindField(kind, 'signal', {
          value: kind === 'radio-group' ? null : [],
          inputs: { options: lockedFirst },
          decorated: true,
          decoration: '<div formidableFieldLabel>Letter</div>'
        });

        await userEvent.tab();
        await expect.element(page.getByRole(role, { name: 'Letter' })).toHaveFocus();
        await userEvent.keyboard('{Enter}');

        await expect.poll(bound.value).toEqual(kind === 'radio-group' ? 'b' : ['b']);
      });
    }

    // How a user brings each option up, and the role it has once there.
    const cases = [
      { kind: 'dropdown', role: 'option', open: () => userEvent.click(page.getByRole('combobox'), { force: true }) },
      {
        kind: 'autocomplete',
        role: 'option',
        open: async () => {
          await userEvent.click(page.getByRole('combobox'));
          await userEvent.keyboard('{ArrowDown}');
        }
      },
      { kind: 'radio-group', role: 'radio', open: async () => {} },
      { kind: 'checkbox-group', role: 'checkbox', open: async () => {} }
    ] as const;

    for (const { kind, role, open } of cases) {
      it(`is refused by a click: ${kind}`, async () => {
        const bound = await bindField(kind, 'signal', { inputs: { options: lockedFirst } });

        await open();
        // Forced, because an option marked `aria-disabled` is no target to Playwright, though a user can press it.
        await userEvent.click(page.getByRole(role, { name: 'Alpha' }), { force: true });
        await settle(bound.fixture);

        expect(bound.events()).toEqual([]);
      });

      it(`is refused by selectOption: ${kind}`, async () => {
        const bound = await bindField(kind, 'signal', { inputs: { options: lockedFirst } });

        mutators(bound).selectOption(lockedFirst[0]!);
        await settle(bound.fixture);

        expect(bound.events()).toEqual([]);
      });
    }
  });
});
