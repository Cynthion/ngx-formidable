import { Component, Type } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IFormidableOption } from '../../models/formidable.model';
import { CheckboxGroupFieldComponent } from './checkbox-group-field/checkbox-group-field.component';
import { RadioGroupFieldComponent } from './radio-group-field/radio-group-field.component';

/**
 * Contract of the highlight `BaseOptionFieldDirective` owns for the four fields that walk an option list.
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

const options: IFormidableOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' }
];

@Component({
  standalone: true,
  imports: [FormsModule, RadioGroupFieldComponent, CheckboxGroupFieldComponent],
  template: `
    <formidable-radio-group-field
      name="colour"
      [options]="options" />
    <formidable-checkbox-group-field
      name="colours"
      [options]="options" />
  `
})
class GroupHostComponent {
  options: IFormidableOption[] = options;
}

describe('option field highlight', () => {
  let fixture: ComponentFixture<unknown>;
  let root: HTMLElement;

  afterEach(() => fixture?.destroy());

  /** Options are collected in a microtask, so one `detectChanges()` is not enough to see them rendered. */
  function build<T>(host: Type<T>): T {
    fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    discardPeriodicTasks();

    root = fixture.nativeElement as HTMLElement;

    return fixture.componentInstance as T;
  }

  /** Keydown is bound on `fieldRef` and gated on the field being focused, so both steps are real here. */
  function press(field: HTMLElement, key: string): void {
    field.dispatchEvent(new KeyboardEvent('keydown', { key }));
    flush();
    fixture.detectChanges();
  }

  /** A new array reference is what `ngOnChanges` reacts to; the reconcile then runs in a microtask. */
  function setOptions(host: { options: IFormidableOption[] }, next: IFormidableOption[]): void {
    host.options = next;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  /** The option `aria-activedescendant` resolves to, rather than the id string. Ids may start with a digit. */
  function activeOption(control: HTMLElement): HTMLElement | null {
    const id = control.getAttribute('aria-activedescendant');

    return id ? root.querySelector(`[id="${id}"]`) : null;
  }

  function focused(selector: string): HTMLElement {
    const control = root.querySelector(selector) as HTMLElement;
    control.focus();
    fixture.detectChanges();

    return control;
  }

  it('follows the highlighted option to its new place in a reordered list', fakeAsync(() => {
    const host = build(GroupHostComponent);
    const radiogroup = focused('[role="radiogroup"]');

    press(radiogroup, 'ArrowDown'); // 'red' -> 'blue', index 1

    expect(activeOption(radiogroup)?.textContent).toContain('Blue');

    // 'blue' moves to index 0, so a clamped index 1 would land on 'red' instead.
    setOptions(host, [options[1]!, options[0]!, options[2]!]);

    expect(activeOption(radiogroup)?.textContent).toContain('Blue');
  }));

  it('lets the selection reclaim the highlight from the remembered value', fakeAsync(() => {
    const host = build(GroupHostComponent);
    const radiogroup = focused('[role="radiogroup"]');

    press(radiogroup, 'Enter'); // selects 'red'
    press(radiogroup, 'ArrowDown'); // highlights 'blue', selection stays on 'red'

    expect(activeOption(radiogroup)?.textContent).toContain('Blue');

    setOptions(host, [...options]);

    expect(activeOption(radiogroup)?.textContent).toContain('Red');
  }));

  it('gives a checked checkbox no such claim — it is one of many, not the selection', fakeAsync(() => {
    const host = build(GroupHostComponent);
    const checkboxgroup = focused('[role="group"]');

    press(checkboxgroup, 'Enter'); // checks 'red', at index 0
    press(checkboxgroup, 'ArrowDown'); // highlights 'blue'

    // 'blue' moves to index 0 and 'red' to index 1, so a checkbox that claimed the highlight for what
    // it has checked would land on 'red' — and a plain clamp would too.
    setOptions(host, [options[1]!, options[0]!, options[2]!]);

    expect(activeOption(checkboxgroup)?.textContent).toContain('Blue');
  }));

  it('pushes the clamped highlight off a disabled option', fakeAsync(() => {
    const host = build(GroupHostComponent);
    const radiogroup = focused('[role="radiogroup"]');

    press(radiogroup, 'ArrowDown');
    press(radiogroup, 'ArrowDown'); // 'green', the last index

    expect(activeOption(radiogroup)?.textContent).toContain('Green');

    // 'green' is gone, so the old index clamps onto what is now the last option — which is disabled.
    setOptions(host, [options[0]!, { ...options[1]!, disabled: true }]);

    expect(activeOption(radiogroup)?.textContent).toContain('Red');
  }));
});
