import { Component, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { form, FormField, max, min, readonly } from '@angular/forms/signals';
import { FieldDecorator, FieldLabel } from '@cynthion/ngx-formidable';
import { ExampleCounterField } from './example-counter-field';

/**
 * The contract a custom field on `BaseField` must hold, proven on the demo's own reference
 * implementation — which is what `user/custom-fields.md` quotes. It is decorated, bound and stepped exactly
 * like a library field, so if any of this breaks, that guide is wrong.
 */

@Component({
  imports: [FormField, FieldDecorator, FieldLabel, ExampleCounterField],
  template: `
    <formidable-field-decorator>
      <example-counter-field [formField]="form.pets" />
      <div formidableFieldLabel>Pets</div>
    </formidable-field-decorator>
  `
})
class CounterHost {
  readonly model = signal({ pets: 1 });
  readonly readonly = signal(false);
  readonly form = form(this.model, (path) => {
    min(path.pets, 0);
    max(path.pets, 3);
    readonly(path.pets, () => this.readonly());
  });
}

describe('custom field contract: example-counter-field', () => {
  let fixture: ComponentFixture<CounterHost>;
  let host: CounterHost;
  let root: HTMLElement;

  function settle(): void {
    fixture.detectChanges();
    tick(50);
    fixture.detectChanges();
  }

  function counter(): HTMLElement {
    return root.querySelector('.counter') as HTMLElement;
  }

  function displayedValue(): string {
    return (root.querySelector('.counter-value') as HTMLElement).textContent!.trim();
  }

  function press(key: string): void {
    counter().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    settle();
  }

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [CounterHost] });
    fixture = TestBed.createComponent(CounterHost);
    host = fixture.componentInstance;
    root = fixture.nativeElement as HTMLElement;
    settle();
  }));

  it('renders the value the model holds', fakeAsync(() => {
    expect(displayedValue()).toBe('1');
  }));

  it('is found by the decorator, which names it', fakeAsync(() => {
    // The decorator mints the label's id; the field binds it back. Resolving it proves the two agree.
    const labelId = counter().getAttribute('aria-labelledby');

    expect(labelId).toBeTruthy();
    // An attribute selector, not `#id`: the assertion is about the idref, never the id's spelling.
    expect(root.querySelector(`[id="${labelId}"]`)?.textContent?.trim()).toBe('Pets');
  }));

  it('steps up on ArrowUp and reports the new value to the model', fakeAsync(() => {
    counter().dispatchEvent(new Event('focus'));
    settle();

    press('ArrowUp');

    expect(displayedValue()).toBe('2');
    expect(host.model().pets).toBe(2);
  }));

  it('steps down on ArrowDown', fakeAsync(() => {
    counter().dispatchEvent(new Event('focus'));
    settle();

    press('ArrowDown');

    expect(displayedValue()).toBe('0');
    expect(host.model().pets).toBe(0);
  }));

  it('clamps at both ends rather than running past them', fakeAsync(() => {
    counter().dispatchEvent(new Event('focus'));
    settle();

    press('ArrowDown');
    press('ArrowDown');
    expect(displayedValue()).toBe('0');

    press('ArrowUp');
    press('ArrowUp');
    press('ArrowUp');
    press('ArrowUp');
    expect(displayedValue()).toBe('3');
  }));

  it('ignores the keys while readonly', fakeAsync(() => {
    host.readonly.set(true);
    settle();

    counter().dispatchEvent(new Event('focus'));
    settle();

    press('ArrowUp');

    expect(displayedValue()).toBe('1');
  }));
});
