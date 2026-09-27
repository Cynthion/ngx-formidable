import { Component, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormidableOption } from '../../models/formidable.model';
import { press, referenced } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { CheckboxGroupField } from './checkbox-group-field/checkbox-group-field';
import { RadioGroupField } from './radio-group-field/radio-group-field';

/**
 * Contract of the highlight `BaseOptionField` owns for the four fields that walk an option list.
 *
 * Reconciling the highlight against a changed list has a fixed order: an empty list clears it, a
 * selection reclaims it, otherwise the previously highlighted **value** is followed to wherever it moved,
 * and only then does the old index get clamped into the new bounds and pushed off a disabled option.
 *
 * The selection step is a hook rather than a step: `selectedOptionValue` is `null` by default, which is
 * what keeps a multi-select field out of it — a checked checkbox must not pull the highlight, because
 * every one of them is checked-or-not independently and none of them is *the* selection.
 *
 * The two groups drive all of this, because they reconcile unconditionally; the two panel fields only do
 * so while their panel is open, and reach the same base code by the same route.
 */

const options: FormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' }
];

@Component({
  imports: [FormsModule, RadioGroupField, CheckboxGroupField],
  template: `
    <formidable-radio-group-field
      name="colour"
      [options]="options()" />
    <formidable-checkbox-group-field
      name="colours"
      [options]="options()" />
  `
})
class GroupHost {
  readonly options = signal(options);
}

describe('option field highlight', () => {
  let fixture: ComponentFixture<unknown>;
  let root: HTMLElement;

  beforeEach(() => configureFormidableTestBed());

  afterEach(() => fixture?.destroy());

  /** Options are collected in a microtask, so the first render alone is not enough to see them rendered. */
  async function build<T>(host: Type<T>): Promise<T> {
    fixture = TestBed.createComponent(host);
    await settle(fixture);

    root = fixture.nativeElement as HTMLElement;

    return fixture.componentInstance as T;
  }

  /** A new array reference is what the field reacts to; the reconcile then runs in a microtask. */
  async function setOptions(host: GroupHost, next: FormidableOption[]): Promise<void> {
    host.options.set(next);
    await settle(fixture);
  }

  /** Keydown is bound on `fieldRef` and gated on the field being focused, so the focus is a real one. */
  async function focused(selector: string): Promise<HTMLElement> {
    const control = root.querySelector(selector) as HTMLElement;
    control.focus();
    await settle(fixture);

    return control;
  }

  it('follows the highlighted option to its new place in a reordered list', async () => {
    const host = await build(GroupHost);
    const radiogroup = await focused('[role="radiogroup"]');

    press(radiogroup, 'ArrowDown'); // 'red' -> 'blue', index 1
    await settle(fixture);

    expect(referenced(radiogroup, 'aria-activedescendant')[0]?.textContent).toContain('Blue');

    // 'blue' moves to index 0, so a clamped index 1 would land on 'red' instead.
    await setOptions(host, [options[1]!, options[0]!, options[2]!]);

    expect(referenced(radiogroup, 'aria-activedescendant')[0]?.textContent).toContain('Blue');
  });

  it('lets the selection reclaim the highlight from the remembered value', async () => {
    const host = await build(GroupHost);
    const radiogroup = await focused('[role="radiogroup"]');

    press(radiogroup, 'Enter'); // selects 'red'
    press(radiogroup, 'ArrowDown'); // highlights 'blue', selection stays on 'red'
    await settle(fixture);

    expect(referenced(radiogroup, 'aria-activedescendant')[0]?.textContent).toContain('Blue');

    await setOptions(host, [...options]);

    expect(referenced(radiogroup, 'aria-activedescendant')[0]?.textContent).toContain('Red');
  });

  it('gives a checked checkbox no such claim — it is one of many, not the selection', async () => {
    const host = await build(GroupHost);
    const checkboxgroup = await focused('[role="group"]');

    press(checkboxgroup, 'Enter'); // checks 'red', at index 0
    press(checkboxgroup, 'ArrowDown'); // highlights 'blue'
    await settle(fixture);

    // 'blue' moves to index 0 and 'red' to index 1, so a checkbox that claimed the highlight for what
    // it has checked would land on 'red' — and a plain clamp would too.
    await setOptions(host, [options[1]!, options[0]!, options[2]!]);

    expect(referenced(checkboxgroup, 'aria-activedescendant')[0]?.textContent).toContain('Blue');
  });

  it('pushes the clamped highlight off a disabled option', async () => {
    const host = await build(GroupHost);
    const radiogroup = await focused('[role="radiogroup"]');

    press(radiogroup, 'ArrowDown');
    press(radiogroup, 'ArrowDown'); // 'green', the last index
    await settle(fixture);

    expect(referenced(radiogroup, 'aria-activedescendant')[0]?.textContent).toContain('Green');

    // 'green' is gone, so the old index clamps onto what is now the last option — which is disabled.
    await setOptions(host, [options[0]!, { ...options[1]!, disabled: true }]);

    expect(referenced(radiogroup, 'aria-activedescendant')[0]?.textContent).toContain('Red');
  });
});
