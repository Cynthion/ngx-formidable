import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { onTestFinished } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { FieldLabel } from '../../directives/field-label';
import { bindField, BindFieldOptions, BoundField, FormsApi } from '../../testing/bind-field';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { InputField } from '../fields/input-field/input-field';
import { FieldDecorator } from './field-decorator';

/**
 * Per **State Repaints On Its Own** in `user/forms.md` and **A Label Rests Only While Nothing Occupies The Value
 * Area** in `user/decoration.md`: an `inside` label floats once the field turns readonly or disabled or takes
 * a placeholder, with nothing to call. Everything the label follows is the projected field's, and none of it
 * the decorator's own input, so this is the decorator following its field at all. `label-position.spec.ts`
 * covers where the label lands.
 *
 * `settle()` never calls `detectChanges()`, so a repaint that arrives here is the library's own doing.
 */

const input = () => page.getByRole('textbox', { name: 'Name' }).element() as HTMLInputElement;
const centre = (element: Element) => {
  const rect = element.getBoundingClientRect();

  return rect.top + rect.height / 2;
};

/** A resting label sits on the field's middle; a floating one above it. */
const isFloating = (label = input().labels![0]!) => centre(label) < centre(label.control!) - 1;

/** Whether a transition duration animates nothing. */
const STILL = /^0s(, 0s)*$/;

/** Binds a decorated input under an `inside` label. */
const bind = (api: FormsApi = 'signal', options: BindFieldOptions = {}): Promise<BoundField> =>
  bindField('input', api, {
    decorated: true,
    decoration: '<div formidableFieldLabel position="inside">Name</div>',
    ...options
  });

/** Records every transition the label starts until the test ends. */
function labelTransitions(): Event[] {
  const runs: Event[] = [];
  const record = (event: Event) => {
    if (event.target instanceof HTMLLabelElement) runs.push(event);
  };

  document.addEventListener('transitionrun', record, true);
  onTestFinished(() => document.removeEventListener('transitionrun', record, true));

  return runs;
}

/** The transition duration the label resolves to at the moment it first floats, which is what animates it. */
function durationWhenFloated(): () => string | undefined {
  let duration: string | undefined;
  const observer = new MutationObserver((mutations) => {
    for (const { target } of mutations) {
      if (duration === undefined && target instanceof HTMLLabelElement && target.control && isFloating(target)) {
        duration = getComputedStyle(target).transitionDuration;
      }
    }
  });

  observer.observe(document.body, { subtree: true, attributeFilter: ['class'] });
  onTestFinished(() => observer.disconnect());

  return () => duration;
}

/** A clearable input under a label whose text the host changes, as a language switch does. */
@Component({
  imports: [FieldDecorator, FieldLabel, InputField],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        clearable
        value="Cynthion" />
      <div formidableFieldLabel>{{ label() }}</div>
    </formidable-field-decorator>
  `
})
class LabelHost {
  readonly label = signal('Name');
}

const clearButton = () => document.querySelector('formidable-field-decorator .clear-button');

describe('decorator repaint', () => {
  beforeEach(() => configureFormidableTestBed());

  it('floats the label once the field turns readonly', async () => {
    const bound = await bind();

    expect(isFloating()).toBe(false);

    await bound.state({ readonly: true });

    await expect.poll(() => isFloating()).toBe(true);
  });

  it('floats the label once the field turns disabled', async () => {
    const bound = await bind();

    await bound.state({ disabled: true });

    await expect.poll(() => isFloating()).toBe(true);
  });

  // An `inside` label yields the value area to a placeholder.
  it('floats the label for a placeholder added at runtime', async () => {
    const bound = await bind('signal', { inputs: { placeholder: '' } });

    expect(isFloating()).toBe(false);

    await bound.set('placeholder', 'Your name');

    await expect.poll(() => isFloating()).toBe(true);
  });

  // `ngModel` registers its control across a microtask, so the first render has no value yet and the label
  // floats a moment later. Nothing animates into place on load; a change after it does.
  it('floats a value written in before the first render without animating it, and animates what follows', async () => {
    const floated = durationWhenFloated();
    const runs = labelTransitions();

    const bound = await bind('template-driven', { value: 'written in' });

    expect(isFloating()).toBe(true);
    expect(floated()).toMatch(STILL);
    // Ready to animate on its own, before anything else changes.
    expect(getComputedStyle(input().labels![0]!).transitionDuration).not.toMatch(STILL);

    await bound.write('');

    await expect.poll(() => runs.length).toBeGreaterThan(0);
  });

  // Per **Clear Button** in `user/decoration.md`.
  it('shows the clear button once the user types, and drops it once the field turns readonly', async () => {
    const bound = await bind('signal', { inputs: { clearable: true } });

    expect(clearButton()).toBeNull();

    await userEvent.type(page.getByRole('textbox', { name: 'Name' }), 'x');

    await expect.poll(clearButton).not.toBeNull();

    await bound.state({ readonly: true });

    await expect.poll(clearButton).toBeNull();
  });

  it('renames the clear button as the label’s text changes', async () => {
    const fixture = TestBed.createComponent(LabelHost);
    await settle(fixture);

    expect(clearButton()!.getAttribute('aria-label')).toBe('Clear Name');

    fixture.componentInstance.label.set('Nom');

    await expect.poll(() => clearButton()!.getAttribute('aria-label')).toBe('Clear Nom');
  });
});
