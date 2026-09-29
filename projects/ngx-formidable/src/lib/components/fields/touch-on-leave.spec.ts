import { bindField, FieldKind } from '../../testing/bind-field';
import { click, press } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of `touch` for the fields that edit without a panel: an edit while focus stays in the field
 * reaches the model and touches nothing, and leaving the field touches once — as the panel fields do.
 */

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

interface EditCase {
  kind: FieldKind;
  inputs?: Record<string, unknown>;
  value?: unknown;
  /** What takes focus. */
  focusable: (element: HTMLElement) => HTMLElement;
  /** An edit that leaves focus where it is. */
  edit: (element: HTMLElement) => void;
}

const pickFirst = (element: HTMLElement) => click(element.querySelector('formidable-field-option div')!);

const cases: EditCase[] = [
  {
    kind: 'radio-group',
    inputs: { options },
    focusable: (element) => element.querySelector('[role="radiogroup"]')!,
    edit: pickFirst
  },
  {
    kind: 'checkbox-group',
    inputs: { options },
    value: [],
    focusable: (element) => element.querySelector('[role="group"]')!,
    edit: pickFirst
  },
  {
    kind: 'time',
    value: new Date(1970, 0, 1, 13, 45),
    focusable: (element) => element.querySelector('input')!,
    edit: (element) => press(element.querySelector('input')!, 'ArrowUp')
  }
];

describe('touch on leave', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const { kind, inputs, value = null, focusable, edit } of cases) {
    describe(kind, () => {
      it('takes an edit into the model without a touch while focus stays', async () => {
        const bound = await bindField(kind, 'signal', { value, inputs });

        focusable(bound.element).focus();
        edit(bound.element);
        await settle(bound.fixture);

        expect(document.activeElement).toBe(focusable(bound.element));
        expect(bound.events()).toEqual(['value']);
        expect(bound.touched()).toBe(false);
      });

      it('touches once, when focus leaves the field after an edit', async () => {
        const bound = await bindField(kind, 'signal', { value, inputs });

        focusable(bound.element).focus();
        edit(bound.element);
        await settle(bound.fixture);
        focusable(bound.element).blur();
        await settle(bound.fixture);

        expect(bound.events()).toEqual(['value', 'touch']);
        expect(bound.touched()).toBe(true);
      });
    });
  }
});
