import { FormidableOption } from '../../models/formidable.model';
import { bindField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';

/**
 * Contract of the five option fields' value: the model names an option by its value, and the field shows
 * whichever option carries it. A value no option carries — yet, or any more — renders as no selection and
 * stays in the model untouched; the moment its option arrives, the field shows it. A user's pick is the
 * model like any other value, so a changed option list leaves it where it is.
 */

const options: FormidableOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

const zeta: FormidableOption = { value: 'z', label: 'Zeta' };

/** The labels the field shows as picked, in order. Empty for no selection. */
function selection(element: HTMLElement): string[] {
  const select = element.querySelector('select');
  if (select) return Array.from(select.selectedOptions, (option) => option.value && option.label).filter(Boolean);

  const options = element.querySelectorAll('[role="radio"], [role="checkbox"]');
  if (options.length) {
    return Array.from(options)
      .filter((option) => option.getAttribute('aria-checked') === 'true')
      .map((option) => option.textContent!.trim());
  }

  const input = element.querySelector('input')!;

  return input.value ? [input.value] : [];
}

/** The user's pick of the option at `index`: a native `change` for a select, a click on the rendered option otherwise. */
function pick(element: HTMLElement, index: number): void {
  const select = element.querySelector('select');

  if (select) {
    select.value = options[index]!.value;
    select.dispatchEvent(new Event('change'));

    return;
  }

  element
    .querySelectorAll('formidable-field-option')
    [index]!.querySelector('div')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

interface OptionFieldCase {
  kind: FieldKind;
  /** A model naming `zeta`, which no option carries until it arrives. */
  unknown: unknown;
  /** The model a pick of the first option leaves. */
  picked: unknown;
}

const fields: OptionFieldCase[] = [
  { kind: 'select', unknown: 'z', picked: 'a' },
  { kind: 'dropdown', unknown: 'z', picked: 'a' },
  { kind: 'autocomplete', unknown: 'z', picked: 'a' },
  { kind: 'radio-group', unknown: 'z', picked: 'a' },
  { kind: 'checkbox-group', unknown: ['z'], picked: ['a'] }
];

describe('option field value', () => {
  beforeEach(() => configureFormidableTestBed());

  for (const api of FORMS_APIS) {
    for (const { kind, unknown, picked } of fields) {
      describe(`${kind}, bound ${api}`, () => {
        it('renders a value no option carries as no selection, and leaves the model alone', async () => {
          const bound = await bindField(kind, api, { inputs: { options } });

          await bound.write(unknown);
          await settle(bound.fixture, 50);

          expect(selection(bound.element)).toEqual([]);
          expect(bound.value()).toEqual(unknown);
          expect(bound.dirty()).toBe(false);
          expect(bound.events()).toEqual([]);
        });

        it('shows the value once its option arrives', async () => {
          const bound = await bindField(kind, api, { inputs: { options } });

          await bound.write(unknown);
          await bound.set('options', [...options, zeta]);

          expect(selection(bound.element)).toEqual(['Zeta']);
          expect(bound.value()).toEqual(unknown);
        });

        it('shows a value written before any option exists, once the options arrive', async () => {
          const bound = await bindField(kind, api, { inputs: { options: [] } });

          await bound.write(unknown);
          await bound.set('options', [...options, zeta]);

          expect(selection(bound.element)).toEqual(['Zeta']);
          expect(bound.value()).toEqual(unknown);
          expect(bound.events()).toEqual([]);
        });

        it("keeps the user's pick when the option list changes", async () => {
          const bound = await bindField(kind, api, { inputs: { options } });

          pick(bound.element, 0);
          await settle(bound.fixture);
          await bound.set('options', [zeta, ...options]);
          await settle(bound.fixture, 50);

          expect(bound.value()).toEqual(picked);
          expect(selection(bound.element)).toEqual(['Alpha']);
        });
      });
    }
  }
});
