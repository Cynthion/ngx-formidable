import { By } from '@angular/platform-browser';
import { page, userEvent } from 'vitest/browser';
import { BindFieldOptions, bindField, BoundField, FieldKind, FORMS_APIS } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { BaseField } from './base-field';

/**
 * Per **Focus** in `user/fields.md`: `autoFocus` focuses every field once its view is ready, and so does
 * `focus()`, and **Focusing Never Opens A Panel**. A `disabled` field takes focus from neither; a `readonly`
 * one still does, and from a click too.
 */

/** **Readonly Slider Takes No Click** in `impl/backlog.md`. */
const READONLY_SLIDER_UNCLICKABLE = 'a readonly slider lets no press reach its range, so a click does not focus it';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' }
];

/** The role of what takes focus in each field. */
const ROLES: Record<FieldKind, 'textbox' | 'combobox' | 'switch' | 'slider' | 'radiogroup' | 'group'> = {
  'input': 'textbox',
  'textarea': 'textbox',
  'select': 'combobox',
  'dropdown': 'combobox',
  'autocomplete': 'combobox',
  'date': 'combobox',
  'time': 'textbox',
  'toggle': 'switch',
  'slider': 'slider',
  'radio-group': 'radiogroup',
  'checkbox-group': 'group'
};

const OPTION_FIELDS: readonly FieldKind[] = ['select', 'dropdown', 'autocomplete', 'radio-group', 'checkbox-group'];
const PANEL_FIELDS = ['dropdown', 'autocomplete', 'date'] as const;

const control = (kind: FieldKind) => page.getByRole(ROLES[kind], { name: 'Answer' });

/** Binds the field under a label, `autoFocus` set or not. */
function bind(kind: FieldKind, autoFocus: boolean, extra: BindFieldOptions = {}): Promise<BoundField> {
  return bindField(kind, 'signal', {
    inputs: { autoFocus, ...(OPTION_FIELDS.includes(kind) ? { options } : {}) },
    decorated: true,
    decoration: '<div formidableFieldLabel>Answer</div>',
    ...extra
  });
}

/** Calls the field's `focus()`, as a consumer holding it through `viewChild()` does. */
function focus({ fixture }: BoundField, kind: FieldKind): void {
  (fixture.debugElement.query(By.css(`formidable-${kind}-field`)).componentInstance as BaseField).focus();
}

describe('field focus', () => {
  beforeEach(() => {
    configureFormidableTestBed();

    // A focused element left over from a previous spec would make every assertion pass.
    (document.activeElement as HTMLElement | null)?.blur();
  });

  for (const kind of Object.keys(ROLES) as FieldKind[]) {
    describe(`${kind}-field`, () => {
      it('takes focus on load with autoFocus', async () => {
        await bind(kind, true);

        await expect.element(control(kind)).toHaveFocus();
      });

      it('leaves focus alone without autoFocus', async () => {
        const bound = await bind(kind, false);
        await settle(bound.fixture);

        expect(document.activeElement).toBe(document.body);
      });

      it('takes focus from focus()', async () => {
        const bound = await bind(kind, false);

        focus(bound, kind);

        await expect.element(control(kind)).toHaveFocus();
      });
    });
  }

  for (const kind of PANEL_FIELDS) {
    it(`opens no panel on autoFocus or focus(): ${kind}-field`, async () => {
      const bound = await bind(kind, true);
      await expect.element(control(kind)).toHaveFocus();

      focus(bound, kind);
      await settle(bound.fixture);

      expect(control(kind).element().getAttribute('aria-expanded')).toBe('false');
    });
  }

  // `ngModel` registers its control only after the first render, so it cannot hold a field disabled that early.
  for (const api of FORMS_APIS.filter((api) => api !== 'template-driven')) {
    it(`takes no focus while disabled from the first render, bound ${api}`, async () => {
      const bound = await bindField('toggle', api, { inputs: { autoFocus: true }, state: { disabled: true } });
      await settle(bound.fixture);

      expect(document.activeElement).toBe(document.body);
    });
  }

  it('ignores focus() while disabled', async () => {
    const bound = await bind('dropdown', false);
    await bound.state({ disabled: true });

    focus(bound, 'dropdown');
    await settle(bound.fixture);

    expect(document.activeElement).toBe(document.body);
  });

  it('still takes focus on load while readonly', async () => {
    await bind('date', true, { state: { readonly: true } });

    await expect.element(control('date')).toHaveFocus();
  });

  for (const kind of Object.keys(ROLES) as FieldKind[]) {
    it(`still takes focus from a click while readonly: ${kind}-field`, async ({ skip }) => {
      if (kind === 'slider') skip(READONLY_SLIDER_UNCLICKABLE);

      await bind(kind, false, { state: { readonly: true } });

      // Forced, because Playwright refuses to click a readonly control, which a user still can.
      await userEvent.click(control(kind), { force: true });

      await expect.element(control(kind)).toHaveFocus();
    });
  }
});
