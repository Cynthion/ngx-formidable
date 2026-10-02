import { Component, signal } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { page } from 'vitest/browser';
import { openPage } from '../testing/studio';
import { SelectedValue } from './selected-value';

@Component({
  imports: [SelectedValue],
  template: `
    <select
      aria-label="Position"
      [portalSelectedValue]="value()">
      @if (value() === '') {
        <option
          value=""
          disabled>
          Mixed
        </option>
      }
      @for (option of options; track option) {
        <option [value]="option">{{ option }}</option>
      }
    </select>

    <!-- The same list, bound the way every one of these selects used to be. -->
    <select
      aria-label="Plain"
      [value]="value()">
      @for (option of options; track option) {
        <option [value]="option">{{ option }}</option>
      }
    </select>
  `
})
class TestHost {
  readonly options = ['outside', 'inside', 'border'];
  readonly value = signal('inside');
}

/** **A Select States Its Value Through `portalSelectedValue`** in `tech/portal.md`. */
describe('portalSelectedValue', () => {
  let fixture: ComponentFixture<TestHost>;

  const select = () => page.getByRole('combobox', { name: 'Position' });

  beforeEach(async () => {
    fixture = await openPage(TestHost);
  });

  it('states the value it is given rather than the first option', async () => {
    await expect.element(select()).toHaveValue('inside');
  });

  // Not a claim about Angular so much as the reason this directive exists: the plain binding is applied
  // while the `@for` has produced no options yet, and a `<select>` given a value it cannot match falls
  // back to its first. Two controls, one list, two different answers.
  it('is what `[value]` on the select cannot do', async () => {
    await expect.element(page.getByRole('combobox', { name: 'Plain' })).toHaveValue('outside');
  });

  it('follows the value', async () => {
    fixture.componentInstance.value.set('border');

    await expect.element(select()).toHaveValue('border');
  });

  // An empty value is how a form-scope control says the fields disagree. It has to land on the disabled
  // option the block adds for it, not on the first real choice.
  it('selects the mixed option for an empty value', async () => {
    fixture.componentInstance.value.set('');

    await expect.element(select()).toHaveDisplayValue(/Mixed/);
  });
});
