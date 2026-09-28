import { Component, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormidableOption } from '../../models/formidable.model';
import { fill } from '../../testing/dom';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { AutocompleteField } from './autocomplete-field/autocomplete-field';

/**
 * `filterChange` reports every move of the filter text, not only the ones the user typed.
 *
 * The field narrows its own filter whenever the value moves — to the selected label, or to nothing where it
 * cannot place the value yet. A consumer who supplies the options back (the documented pattern, and the only
 * one an autocomplete has) is the only party that can put the matching option into the list. Report typing
 * alone and the two lists drift apart: a value written from outside leaves the consumer filtering by
 * whatever was typed last, the option that value names is never supplied, and the field ends up holding a
 * value it has nothing to display.
 *
 * That is exactly the round trip an `actionOption` makes — create an option, then point the model at it —
 * so it breaks on the second lap where a created label does not match what was typed to find it.
 */

const ADDRESSES: FormidableOption[] = [
  { value: 'langstrasse', label: 'Langstrasse 84' },
  { value: 'seefeld', label: 'Seefeldstrasse 40' }
];

@Component({
  imports: [FormsModule, AutocompleteField],
  template: `
    <form>
      <formidable-autocomplete-field
        name="address"
        [options]="visibleOptions()"
        [ngModel]="address()"
        (filterChange)="filter.set($event)" />
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

  beforeEach(() => {
    configureFormidableTestBed({ imports: [FilteringHost] });

    fixture = TestBed.createComponent(FilteringHost);
    host = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  async function search(text: string): Promise<void> {
    input().dispatchEvent(new Event('focus'));
    fill(input(), text);

    await settle(fixture, 200);
  }

  /** The option the field marks as holding its value. */
  function selectedOption(): Element | null {
    return fixture.nativeElement.querySelector('formidable-field-option[aria-selected="true"]');
  }

  /** A write from outside lands while the field is not the user's — a dialog has the focus, or nothing has. */
  function blur(): void {
    input().dispatchEvent(new Event('blur'));
  }

  it('reports the filter it narrows to when a value is written from outside', async () => {
    await settle(fixture);
    await search('Lang');
    expect(host.filter()).toBe('Lang');
    blur();

    // A value written from outside, naming an option the current filter excludes.
    host.address.set('seefeld');
    await settle(fixture);
    await settle(fixture, 200);

    expect(host.filter()).toBe('Seefeldstrasse 40');
    expect(input().value).toBe('Seefeldstrasse 40');
    expect(selectedOption()?.textContent?.trim()).toBe('Seefeldstrasse 40');
  });

  it('displays an option created for a value the typed filter does not match', async () => {
    await settle(fixture);

    // The action-option round trip: type something nothing matches, then create an option under a
    // different label and point the model at it.
    await search('Qxzv 99');
    expect(host.filter()).toBe('Qxzv 99');
    blur(); // the dialog the action opened has the focus now

    host.all.update((options) => [...options, { value: 'bellevueplatz-1', label: 'Bellevueplatz 1' }]);
    host.address.set('bellevueplatz-1');
    await settle(fixture);
    await settle(fixture, 200);

    expect(input().value).toBe('Bellevueplatz 1');
    expect(selectedOption()?.textContent?.trim()).toBe('Bellevueplatz 1');
  });

  // The other half of the rule: while the field is the user's, the typed text is the filter and the field
  // keeps its own narrowing to itself. Reporting it here would pull the list out from under them.
  it('leaves the consumer filtering by what was typed while the field is focused', async () => {
    await settle(fixture);
    await search('Seefeld');

    // A list change lands mid-typing, which re-applies the written value inside the field.
    host.all.update((options) => [...options]);
    await settle(fixture);
    await settle(fixture, 200);

    expect(host.filter()).toBe('Seefeld');
  });
});
