import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { AutocompleteFieldComponent } from './autocomplete-field/autocomplete-field.component';
import { BaseFieldDirective } from './base-field.directive';
import { DateFieldComponent } from './date-field/date-field.component';
import { DropdownFieldComponent } from './dropdown-field/dropdown-field.component';
import { InputFieldComponent } from './input-field/input-field.component';
import { SliderFieldComponent } from './slider-field/slider-field.component';
import { ToggleFieldComponent } from './toggle-field/toggle-field.component';

/**
 * Contract of `autoFocus` / `focus()`: the field takes focus without its panel opening.
 *
 * `fieldRef` is not the focusable element everywhere — five fields wrap their control in a `div`, which
 * is what `focusElement` exists for. The three shapes are covered here: the control itself
 * (`input-field`), a wrapped `input` (`dropdown`, `autocomplete`, `date`), and a `div` that is itself
 * focusable through `tabindex` (`toggle`).
 */

@Component({
  standalone: true,
  imports: [
    FormsModule,
    InputFieldComponent,
    DropdownFieldComponent,
    AutocompleteFieldComponent,
    DateFieldComponent,
    SliderFieldComponent,
    ToggleFieldComponent
  ],
  // Inside a `<form>`, like real usage: a standalone `ngModel` writes its value synchronously, before
  // the fields whose control sits in an `@if` branch have resolved their view refs.
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
        [autoFocus]="focused === 'date'" />
      <formidable-slider-field
        name="slider"
        ngModel
        [autoFocus]="focused === 'slider'" />
      <formidable-toggle-field
        name="toggle"
        ngModel
        [autoFocus]="focused === 'toggle'"
        [disabled]="toggleDisabled" />
    </form>
  `
})
class FocusHostComponent {
  @ViewChild(InputFieldComponent, { static: true }) input!: InputFieldComponent;
  @ViewChild(DropdownFieldComponent, { static: true }) dropdown!: DropdownFieldComponent;
  @ViewChild(AutocompleteFieldComponent, { static: true }) autocomplete!: AutocompleteFieldComponent;
  @ViewChild(DateFieldComponent, { static: true }) date!: DateFieldComponent;
  @ViewChild(SliderFieldComponent, { static: true }) slider!: SliderFieldComponent;
  @ViewChild(ToggleFieldComponent, { static: true }) toggle!: ToggleFieldComponent;

  focused: string | null = null;
  toggleDisabled = false;
}

/** The element `[autoFocus]` is expected to land on, per field. */
function expectedElement(fixture: ComponentFixture<FocusHostComponent>, field: string): HTMLElement {
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
  let fixture: ComponentFixture<FocusHostComponent>;
  let host: FocusHostComponent;

  /**
   * The field is only created once `focused` is set, so `autoFocus` is read on its first
   * `ngAfterViewInit`, exactly as it would be on page load.
   */
  function build(focused: string | null): void {
    fixture = TestBed.createComponent(FocusHostComponent);
    host = fixture.componentInstance;
    host.focused = focused;
    fixture.detectChanges();
    tick(); // the microtask the base queues, plus the fields' own mask timers
    discardPeriodicTasks(); // ngxMask keeps an interval running for as long as a field is alive
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FocusHostComponent],
      providers: [provideNgxMask()]
    }).compileComponents();

    // A focused element left over from a previous spec would make every assertion pass.
    (document.activeElement as HTMLElement | null)?.blur();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  for (const field of ['text', 'dropdown', 'autocomplete', 'date', 'slider', 'toggle']) {
    it(`focuses ${field} on load`, fakeAsync(() => {
      build(field);

      expect(document.activeElement).toBe(expectedElement(fixture, field));
    }));
  }

  it('leaves every field alone when autoFocus is not set', fakeAsync(() => {
    build(null);

    expect(document.activeElement).toBe(document.body);
  }));

  for (const field of ['dropdown', 'autocomplete', 'date'] as const) {
    it(`does not open the ${field} panel`, fakeAsync(() => {
      build(field);

      expect(host[field].isPanelOpen).toBeFalse();
    }));
  }

  it('does not focus a disabled field', fakeAsync(() => {
    fixture = TestBed.createComponent(FocusHostComponent);
    host = fixture.componentInstance;
    host.focused = 'toggle';
    host.toggleDisabled = true;
    fixture.detectChanges();
    tick();
    discardPeriodicTasks();

    expect(document.activeElement).toBe(document.body);
  }));

  it('focus() is callable on the field itself', fakeAsync(() => {
    build(null);

    (host.dropdown as BaseFieldDirective).focus();

    expect(document.activeElement).toBe(expectedElement(fixture, 'dropdown'));
  }));

  /**
   * Pins the removal of the dead `panelRef.focus()` in `date-field`'s `togglePanel`: the panel is still
   * `visibility: hidden` at that point, so it never took focus. Deferring the call until it could is
   * what this rules out — it would pull focus off the input and run its commit-on-blur path.
   */
  it('keeps focus on the date input while its panel opens', fakeAsync(() => {
    build('date');

    host.date.isPanelOpen = true;
    fixture.detectChanges();
    tick();
    discardPeriodicTasks();

    expect(host.date.isPanelOpen).toBeTrue();
    expect(document.activeElement).toBe(expectedElement(fixture, 'date'));
  }));
});
