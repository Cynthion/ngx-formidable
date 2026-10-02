import { Component, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { page, userEvent } from 'vitest/browser';
import { FieldLabel } from '../../directives/field-label';
import { FormidableOption } from '../../models/formidable.model';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { FieldDecorator } from '../field-decorator/field-decorator';
import { AutocompleteField } from './autocomplete-field/autocomplete-field';

/**
 * `filterChange` reports every move of the filter text, not only the ones the user typed, per **`filterChange`
 * Reports More Than Typing** in `user/fields.md`.
 *
 * The field narrows its own filter whenever the value moves: to the selected label, or to nothing where it
 * cannot place the value yet. A consumer who supplies the options back, the documented pattern, is the only
 * party that can put the matching option into the list. Report typing alone and the two lists drift apart: a
 * value written from outside leaves the consumer filtering by whatever was typed last, the option that value
 * names is never supplied, and the field ends up holding a value it has nothing to display.
 *
 * That is exactly the round trip an `actionOption` makes, create an option and then point the model at it, so
 * it breaks on the second lap, where a created label does not match what was typed to find it.
 *
 * The user types for real, and leaves by `Tab` for the button after the field.
 */

const ADDRESSES: FormidableOption[] = [
  { value: 'langstrasse', label: 'Langstrasse 84' },
  { value: 'seefeld', label: 'Seefeldstrasse 40' }
];

@Component({
  imports: [FormsModule, AutocompleteField, FieldDecorator, FieldLabel],
  template: `
    <form>
      <formidable-field-decorator>
        <formidable-autocomplete-field
          name="address"
          [options]="visibleOptions()"
          [ngModel]="address()"
          (filterChange)="filter.set($event)" />
        <div formidableFieldLabel>Address</div>
      </formidable-field-decorator>
      <button type="button">Next</button>
    </form>
  `
})
class FilteringHost {
  /** The consumer's own filtering, exactly as `user/fields.md` documents it. */
  readonly filter = signal('');
  readonly all = signal<FormidableOption[]>([...ADDRESSES]);
  readonly address = signal<string | null>(null);

  readonly visibleOptions = computed(() => {
    const filter = this.filter().toLowerCase();

    return filter ? this.all().filter((option) => option.label!.toLowerCase().includes(filter)) : this.all();
  });
}

describe('autocomplete filter sync', () => {
  let fixture: ComponentFixture<FilteringHost>;
  let host: FilteringHost;

  const combobox = () => page.getByRole('combobox', { name: 'Address' });

  /** The option the field marks as holding its value, though its panel is closed. */
  const selected = () => page.getByRole('option', { selected: true, includeHidden: true });

  beforeEach(async () => {
    configureFormidableTestBed({ imports: [FilteringHost] });
    (document.activeElement as HTMLElement | null)?.blur();

    fixture = TestBed.createComponent(FilteringHost);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(() => fixture.destroy());

  /** Types into the field and lets its filter through. */
  async function search(text: string): Promise<void> {
    await userEvent.click(combobox());
    await userEvent.keyboard(text);
    await settle(fixture, 200);
  }

  /** Leaves the field, as a user does for a dialog, so a write from outside lands while it is not theirs. */
  async function leave(): Promise<void> {
    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'Next' })).toHaveFocus();
  }

  it('reports the filter it narrows to when a value is written from outside', async () => {
    await search('Lang');
    expect(host.filter()).toBe('Lang');
    await leave();

    // A value written from outside, naming an option the current filter excludes.
    host.address.set('seefeld');
    await settle(fixture, 200);

    expect(host.filter()).toBe('Seefeldstrasse 40');
    await expect.element(combobox()).toHaveValue('Seefeldstrasse 40');
    await expect.element(selected()).toHaveTextContent('Seefeldstrasse 40');
  });

  it('displays an option created for a value the typed filter does not match', async () => {
    // The action-option round trip: type something nothing matches, then create an option under a different
    // label and point the model at it.
    await search('Qxzv 99');
    expect(host.filter()).toBe('Qxzv 99');
    await leave(); // the dialog the action opened has the focus now

    host.all.update((options) => [...options, { value: 'bellevueplatz-1', label: 'Bellevueplatz 1' }]);
    host.address.set('bellevueplatz-1');
    await settle(fixture, 200);

    await expect.element(combobox()).toHaveValue('Bellevueplatz 1');
    await expect.element(selected()).toHaveTextContent('Bellevueplatz 1');
  });

  // The other half of the rule: while the field is the user's, the typed text is the filter and the field keeps
  // its own narrowing to itself. Typing past an option's exact label lets that pick go again, and the text the
  // field would render for no value must not replace what is being typed, nor reach the consumer.
  it('leaves what was typed alone while the field is focused', async () => {
    await search('Seefeldstrasse 40');
    await userEvent.keyboard(' B');
    await settle(fixture, 200);

    await expect.element(combobox()).toHaveFocus();
    await expect.element(combobox()).toHaveValue('Seefeldstrasse 40 B');
    expect(host.filter()).toBe('Seefeldstrasse 40 B');
  });
});
