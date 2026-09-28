import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { configureFormidableTestBed, settle } from '../../testing/test-bed';
import { AutocompleteField } from './autocomplete-field/autocomplete-field';
import { BaseField } from './base-field';
import { DateField } from './date-field/date-field';
import { DropdownField } from './dropdown-field/dropdown-field';
import { InputField } from './input-field/input-field';
import { SliderField } from './slider-field/slider-field';
import { ToggleField } from './toggle-field/toggle-field';

/**
 * Contract of `autoFocus` / `focus()`: the field takes focus without its panel opening.
 *
 * `fieldRef` is not the focusable element everywhere — five fields wrap their control in a `div`, which
 * is what `focusElement` exists for. The three shapes are covered here: the control itself
 * (`input-field`), a wrapped `input` (`dropdown`, `autocomplete`, `date`), and a `div` that is itself
 * focusable through `tabindex` (`toggle`).
 */

@Component({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    InputField,
    DropdownField,
    AutocompleteField,
    DateField,
    SliderField,
    ToggleField
  ],
  // Inside a `<form>`, like real usage.
  template: `
    <form>
      <formidable-input-field
        name="text"
        ngModel
        [autoFocus]="focused === 'text'" />
      <formidable-dropdown-field
        name="dropdown"
        ngModel
        [autoFocus]="focused === 'dropdown'"
        [options]="[{ value: 'a' }, { value: 'b' }]" />
      <formidable-autocomplete-field
        name="autocomplete"
        ngModel
        [autoFocus]="focused === 'autocomplete'"
        [options]="[{ value: 'a' }, { value: 'b' }]" />
      <formidable-date-field
        name="date"
        ngModel
        [autoFocus]="focused === 'date'"
        [readonly]="dateReadonly" />
      <formidable-slider-field
        name="slider"
        ngModel
        [autoFocus]="focused === 'slider'" />
      <!-- A control disabled from the start reaches the field on its first pass, before it would focus. -->
      <formidable-toggle-field
        [formControl]="toggle"
        [autoFocus]="focused === 'toggle'" />
    </form>
  `
})
class FocusHost {
  readonly input = viewChild.required(InputField);
  readonly dropdown = viewChild.required(DropdownField);
  readonly autocomplete = viewChild.required(AutocompleteField);
  readonly date = viewChild.required(DateField);
  readonly slider = viewChild.required(SliderField);

  focused: string | null = null;
  readonly toggle = new FormControl(false);
  dateReadonly = false;
}

/** The element `[autoFocus]` is expected to land on, per field. */
function expectedElement(fixture: ComponentFixture<FocusHost>, field: string): HTMLElement {
  const host = fixture.nativeElement as HTMLElement;

  switch (field) {
    case 'text':
      return host.querySelector('formidable-input-field input') as HTMLElement;
    case 'dropdown':
      return host.querySelector('formidable-dropdown-field input') as HTMLElement;
    case 'autocomplete':
      return host.querySelector('formidable-autocomplete-field input') as HTMLElement;
    case 'date':
      return host.querySelector('formidable-date-field input') as HTMLElement;
    case 'slider':
      return host.querySelector('formidable-slider-field input[type="range"]') as HTMLElement;
    default:
      return host.querySelector('formidable-toggle-field [role="switch"]') as HTMLElement;
  }
}

describe('field focus', () => {
  let fixture: ComponentFixture<FocusHost>;
  let host: FocusHost;

  /**
   * The field is only created once `focused` is set, so `autoFocus` is read on its first
   * `ngAfterViewInit`, exactly as it would be on page load.
   */
  async function build(focused: string | null): Promise<void> {
    fixture = TestBed.createComponent(FocusHost);
    host = fixture.componentInstance;
    host.focused = focused;
    await settle(fixture); // the microtask the base queues, plus the fields' own mask timers
  }

  beforeEach(() => {
    configureFormidableTestBed({ imports: [FocusHost] });

    // A focused element left over from a previous spec would make every assertion pass.
    (document.activeElement as HTMLElement | null)?.blur();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  for (const field of ['text', 'dropdown', 'autocomplete', 'date', 'slider', 'toggle']) {
    it(`focuses ${field} on load`, async () => {
      await build(field);

      expect(document.activeElement).toBe(expectedElement(fixture, field));
    });
  }

  it('leaves every field alone when autoFocus is not set', async () => {
    await build(null);

    expect(document.activeElement).toBe(document.body);
  });

  for (const field of ['dropdown', 'autocomplete', 'date'] as const) {
    it(`does not open the ${field} panel`, async () => {
      await build(field);

      expect(expectedElement(fixture, field).getAttribute('aria-expanded')).toBe('false');
    });
  }

  it('does not focus a disabled field', async () => {
    fixture = TestBed.createComponent(FocusHost);
    host = fixture.componentInstance;
    host.focused = 'toggle';
    host.toggle.disable();
    await settle(fixture);

    expect(document.activeElement).toBe(document.body);
  });

  // Unlike a disabled one: readonly guards what the field does with focus, never focus itself.
  it('still focuses a readonly field', async () => {
    fixture = TestBed.createComponent(FocusHost);
    host = fixture.componentInstance;
    host.focused = 'date';
    host.dateReadonly = true;
    await settle(fixture);

    expect(document.activeElement).toBe(expectedElement(fixture, 'date'));
  });

  it('focus() is callable on the field itself', async () => {
    await build(null);

    (host.dropdown() as BaseField).focus();

    expect(document.activeElement).toBe(expectedElement(fixture, 'dropdown'));
  });

  /**
   * Pins the removal of the dead `panelRef.focus()` in `date-field`'s `togglePanel`: the panel is still
   * `visibility: hidden` at that point, so it never took focus. Deferring the call until it could is
   * what this rules out — it would pull focus off the input and run its commit-on-blur path.
   */
  it('keeps focus on the date input while its panel opens', async () => {
    await build('date');

    host.date().togglePanel(true);
    await settle(fixture);

    expect(expectedElement(fixture, 'date').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(expectedElement(fixture, 'date'));
  });
});
