import { By } from '@angular/platform-browser';
import { FormidableOption } from '../../models/formidable.model';
import { bindField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { press } from '../../testing/dom';
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

/** Every public mutator the fields have between them. */
interface Mutators {
  toggle(): void;
  selectValue(value: number): void;
  selectDate(date: Date | null): void;
  selectTime(time: Date | null): void;
  selectOption(option: FormidableOption): void;
}

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
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const [key, { kind, value, hasOptions, mutate }] of Object.entries(mutated)) {
      for (const state of ['readonly', 'disabled'] as const) {
        it(`ignores its public mutator while ${state}: ${key}, bound ${api}`, async () => {
          const bound = await bindField(kind, api, { value, inputs: hasOptions ? { options } : {} });
          await bound.state({ [state]: true });

          mutate(bound.fixture.debugElement.query(By.css(`formidable-${kind}-field`)).componentInstance as Mutators);
          await settle(bound.fixture);

          expect(bound.value()).toEqual(value);
          expect(bound.dirty()).toBe(false);
          expect(bound.events()).toEqual([]);
        });
      }
    }
  }

  describe('slider', () => {
    const range = (element: HTMLElement) => element.querySelector<HTMLInputElement>('input[type="range"]')!;

    for (const state of ['readonly', 'disabled'] as const) {
      // A range input ignores `readonly`, so its own keys would move the thumb.
      it(`keeps the native range from stepping while ${state}`, async () => {
        const bound = await bindField('slider', 'signal', { value: 40 });
        await bound.state({ [state]: true });

        for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) {
          expect(press(range(bound.element), key).defaultPrevented, key).toBe(true);
        }
      });

      it(`keeps a pointer from dragging the thumb while ${state}`, async () => {
        const bound = await bindField('slider', 'signal', { value: 40 });
        await bound.state({ [state]: true });

        const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
        range(bound.element).dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
      });
    }

    it('leaves the native range its keys while editable', async () => {
      const bound = await bindField('slider', 'signal', { value: 40 });

      expect(press(range(bound.element), 'ArrowRight').defaultPrevented).toBe(false);
    });
  });

  describe('readonly option', () => {
    const lockedFirst = [{ value: 'a', label: 'Alpha', readonly: true }, ...options.slice(1)];

    for (const [kind, focusable] of [
      ['radio-group', '[role="radiogroup"]'],
      ['checkbox-group', '[role="group"]']
    ] as const) {
      it(`is skipped by the highlight, so Enter picks the next option: ${kind}`, async () => {
        const bound = await bindField(kind, 'signal', {
          value: kind === 'radio-group' ? null : [],
          inputs: { options: lockedFirst }
        });
        const group = bound.element.querySelector<HTMLElement>(focusable)!;

        group.focus();
        press(group, 'Enter');
        await settle(bound.fixture);

        expect(bound.value()).toEqual(kind === 'radio-group' ? 'b' : ['b']);
      });
    }

    for (const kind of ['dropdown', 'autocomplete', 'radio-group', 'checkbox-group'] as const) {
      it(`is refused by selectOption: ${kind}`, async () => {
        const bound = await bindField(kind, 'signal', { inputs: { options: lockedFirst } });

        (
          bound.fixture.debugElement.query(By.css(`formidable-${kind}-field`)).componentInstance as Mutators
        ).selectOption(lockedFirst[0]!);
        await settle(bound.fixture);

        expect(bound.events()).toEqual([]);
      });
    }
  });
});
