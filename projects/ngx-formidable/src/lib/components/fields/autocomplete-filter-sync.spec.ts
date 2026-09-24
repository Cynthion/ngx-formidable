import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IFormidableOption } from '../../models/formidable.model';
import { AutocompleteFieldComponent } from './autocomplete-field/autocomplete-field.component';

/**
 * `filterChanged` reports every move of the filter text, not only the ones the user typed.
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

const ADDRESSES: IFormidableOption[] = [
  { value: 'langstrasse', label: 'Langstrasse 84' },
  { value: 'seefeld', label: 'Seefeldstrasse 40' }
];

@Component({
  imports: [FormsModule, AutocompleteFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-autocomplete-field
        name="address"
        [options]="visibleOptions()"
        [ngModel]="address()"
        (filterChanged)="filter.set($event)" />
    </form>
  `
})
class FilteringHostComponent {
  readonly field = viewChild.required(AutocompleteFieldComponent);

  /** The consumer's own filtering, exactly as `user/fields.md` documents it. */
  readonly filter = signal('');
  readonly all = signal<IFormidableOption[]>([...ADDRESSES]);
  readonly address = signal<string | null>(null);

  readonly visibleOptions = computed(() => {
    const filter = this.filter().toLowerCase();

    return filter ? this.all().filter((option) => option.label!.toLowerCase().includes(filter)) : this.all();
  });
}

describe('autocomplete filter sync', () => {
  let fixture: ComponentFixture<FilteringHostComponent>;
  let host: FilteringHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FilteringHostComponent] }).compileComponents();

    fixture = TestBed.createComponent(FilteringHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  function settle(): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  function type(text: string): void {
    const element = input();

    element.dispatchEvent(new Event('focus'));
    element.value = text;
    element.dispatchEvent(new Event('input'));

    tick(200);
    fixture.detectChanges();
  }

  /** A write from outside lands while the field is not the user's — a dialog has the focus, or nothing has. */
  function blur(): void {
    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  it('reports the filter it narrows to when a value is written from outside', fakeAsync(() => {
    settle();
    type('Lang');
    expect(host.filter()).toBe('Lang');
    blur();

    // A value written from outside, naming an option the current filter excludes.
    host.address.set('seefeld');
    settle();
    tick(200);
    settle();

    expect(host.filter()).toBe('Seefeldstrasse 40');
    expect(input().value).toBe('Seefeldstrasse 40');
    expect(host.field().value).toBe('seefeld');
    flush();
  }));

  it('displays an option created for a value the typed filter does not match', fakeAsync(() => {
    settle();

    // The action-option round trip: type something nothing matches, then create an option under a
    // different label and point the model at it.
    type('Qxzv 99');
    expect(host.filter()).toBe('Qxzv 99');
    blur(); // the dialog the action opened has the focus now

    host.all.update((options) => [...options, { value: 'bellevueplatz-1', label: 'Bellevueplatz 1' }]);
    host.address.set('bellevueplatz-1');
    settle();
    tick(200);
    settle();

    expect(input().value).toBe('Bellevueplatz 1');
    expect(host.field().value).toBe('bellevueplatz-1');
    flush();
  }));

  // The other half of the rule: while the field is the user's, the typed text is the filter and the field
  // keeps its own narrowing to itself. Reporting it here would pull the list out from under them.
  it('leaves the consumer filtering by what was typed while the field is focused', fakeAsync(() => {
    settle();
    type('Seefeld');

    // A list change lands mid-typing, which re-applies the written value inside the field.
    host.all.update((options) => [...options]);
    settle();
    tick(200);
    settle();

    expect(host.filter()).toBe('Seefeld');
    flush();
  }));
});
