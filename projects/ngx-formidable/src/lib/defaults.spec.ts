import { ChangeDetectionStrategy, Component, Type } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideNgxMask } from 'ngx-mask';
import { FieldDecoratorComponent } from './components/field-decorator/field-decorator.component';
import { AutocompleteFieldComponent } from './components/fields/autocomplete-field/autocomplete-field.component';
import { DateFieldComponent } from './components/fields/date-field/date-field.component';
import { DropdownFieldComponent } from './components/fields/dropdown-field/dropdown-field.component';
import { InputFieldComponent } from './components/fields/input-field/input-field.component';
import { FieldErrorsDirective } from './directives/field-errors.directive';
import { FieldLabelDirective } from './directives/field-label.directive';
import { FieldPrefixDirective } from './directives/field-prefix.directive';
import { FieldSuffixDirective } from './directives/field-suffix.directive';
import { NgxFormidableFormDirective } from './forms/form.directive';
import { FORMIDABLE_DEFAULTS, FormidableDefaults } from './models/formidable.model';
import { provideNgxFormidable } from './provide-ngx-formidable';

/**
 * Contract of the app-wide defaults: an input left unset, or bound to `undefined`, takes the app default,
 * then the library's own; a binding wins over both. Without a form directive, the decorator's required
 * marker and a field's reveal fall back to the app default too.
 */

const IMPORTS = [
  FormsModule,
  NgxFormidableFormDirective,
  FieldDecoratorComponent,
  InputFieldComponent,
  DropdownFieldComponent,
  AutocompleteFieldComponent,
  DateFieldComponent,
  FieldLabelDirective,
  FieldPrefixDirective,
  FieldSuffixDirective,
  FieldErrorsDirective
];

/** Every defaulted input, none of them bound. */
const UNSET = `
  <form formidableForm>
    <formidable-field-decorator>
      <formidable-input-field name="a" />
      <div formidableFieldLabel>A</div>
      <div formidableFieldPrefix>P</div>
      <div formidableFieldSuffix>S</div>
    </formidable-field-decorator>
    <formidable-dropdown-field name="d" />
    <formidable-autocomplete-field name="ac" />
    <formidable-date-field name="dt" />
  </form>
`;

@Component({ imports: IMPORTS, changeDetection: ChangeDetectionStrategy.Eager, template: UNSET })
class UnsetHostComponent {}

/** The same subtree, under a provider of its own. */
@Component({
  imports: IMPORTS,
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [{ provide: FORMIDABLE_DEFAULTS, useValue: { labelPosition: 'outside' } }],
  template: UNSET
})
class ScopedHostComponent {}

/** Every defaulted input, bound to `undefined` — what a dynamic template binds to mean "inherit". */
@Component({
  imports: IMPORTS,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      [revealOn]="undefined"
      [showRequiredMarkers]="undefined"
      [debounceMs]="undefined">
      <formidable-field-decorator>
        <formidable-input-field name="a" />
        <div
          formidableFieldLabel
          [position]="undefined">
          A
        </div>
        <div
          formidableFieldPrefix
          [align]="undefined">
          P
        </div>
        <div
          formidableFieldSuffix
          [align]="undefined">
          S
        </div>
      </formidable-field-decorator>
      <formidable-dropdown-field
        name="d"
        [panelPosition]="undefined" />
      <formidable-autocomplete-field
        name="ac"
        [panelPosition]="undefined" />
      <formidable-date-field
        name="dt"
        [panelPosition]="undefined" />
    </form>
  `
})
class UndefinedHostComponent {}

/** Every defaulted input, bound to a value that is neither the app default nor the library's own. */
@Component({
  imports: IMPORTS,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      revealOn="always"
      [showRequiredMarkers]="true"
      [debounceMs]="10">
      <formidable-field-decorator>
        <formidable-input-field name="a" />
        <div
          formidableFieldLabel
          position="inside-floating">
          A
        </div>
        <div
          formidableFieldPrefix
          align="center">
          P
        </div>
        <div
          formidableFieldSuffix
          align="center">
          S
        </div>
      </formidable-field-decorator>
      <formidable-dropdown-field
        name="d"
        panelPosition="left" />
      <formidable-autocomplete-field
        name="ac"
        panelPosition="left" />
      <formidable-date-field
        name="dt"
        panelPosition="left" />
    </form>
  `
})
class ExplicitHostComponent {}

/** A decorated field asking for its required marker, with no form directive above it. */
@Component({
  imports: IMPORTS,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        name="a"
        [showRequiredMarker]="true" />
      <div formidableFieldLabel>A</div>
    </formidable-field-decorator>
  `
})
class MarkerWithoutFormHostComponent {}

/** A field validated by Angular alone, with no formidable form to say when its messages appear. */
@Component({
  imports: IMPORTS,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-field-decorator>
        <formidable-input-field
          formidableFieldErrors
          name="name"
          [minlength]="3"
          [(ngModel)]="name" />
      </formidable-field-decorator>
    </form>
  `
})
class RevealWithoutFormHostComponent {
  name = '';
}

const DEFAULTS: Required<FormidableDefaults> = {
  labelPosition: 'border',
  prefixAlign: 'value',
  suffixAlign: 'value',
  panelPosition: 'sheet',
  revealOn: 'dirty',
  showRequiredMarkers: false,
  debounceMs: 250
};

/** What every defaulted input resolved to, keyed as `FormidableDefaults` is. */
interface Resolved {
  labelPosition: string;
  prefixAlign: string;
  suffixAlign: string;
  dropdownPanel: string;
  autocompletePanel: string;
  datePanel: string;
  revealOn: string;
  showRequiredMarkers: boolean;
  debounceMs: number;
}

describe('app defaults', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fixture: ComponentFixture<any>;

  function configure(defaults?: FormidableDefaults): void {
    TestBed.configureTestingModule({
      providers: defaults ? provideNgxFormidable({ defaults }) : [provideNgxMask()]
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mount(host: Type<any>): void {
    fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function get<T>(type: Type<T>): T {
    return fixture.debugElement.query(By.directive(type)).injector.get(type);
  }

  function resolved(): Resolved {
    const form = get(NgxFormidableFormDirective);

    return {
      labelPosition: get(FieldLabelDirective).position(),
      prefixAlign: get(FieldPrefixDirective).align(),
      suffixAlign: get(FieldSuffixDirective).align(),
      dropdownPanel: get(DropdownFieldComponent).panelPosition(),
      autocompletePanel: get(AutocompleteFieldComponent).panelPosition(),
      datePanel: get(DateFieldComponent).panelPosition(),
      revealOn: form.revealOn(),
      showRequiredMarkers: form.showRequiredMarkers(),
      debounceMs: form.debounceMs()
    };
  }

  const LIBRARY_OWN: Resolved = {
    labelPosition: 'inside',
    prefixAlign: 'center',
    suffixAlign: 'center',
    dropdownPanel: 'full',
    autocompletePanel: 'full',
    datePanel: 'right',
    revealOn: 'touched',
    showRequiredMarkers: true,
    debounceMs: 0
  };

  const APP_DEFAULTS: Resolved = {
    labelPosition: 'border',
    prefixAlign: 'value',
    suffixAlign: 'value',
    dropdownPanel: 'sheet',
    autocompletePanel: 'sheet',
    datePanel: 'sheet',
    revealOn: 'dirty',
    showRequiredMarkers: false,
    debounceMs: 250
  };

  it('keeps the library’s own without a provider, each panel field its own', fakeAsync(() => {
    configure();
    mount(UnsetHostComponent);

    expect(resolved()).toEqual(LIBRARY_OWN);
  }));

  it('applies the app default to every unset input', fakeAsync(() => {
    configure(DEFAULTS);
    mount(UnsetHostComponent);

    expect(resolved()).toEqual(APP_DEFAULTS);
  }));

  it('applies the app default to an input bound to undefined', fakeAsync(() => {
    configure(DEFAULTS);
    mount(UndefinedHostComponent);

    expect(resolved()).toEqual(APP_DEFAULTS);
  }));

  it('falls back to the library’s own for an input bound to undefined without a provider', fakeAsync(() => {
    configure();
    mount(UndefinedHostComponent);

    expect(resolved()).toEqual(LIBRARY_OWN);
  }));

  it('lets a binding win over the app default', fakeAsync(() => {
    configure(DEFAULTS);
    mount(ExplicitHostComponent);

    expect(resolved()).toEqual({
      labelPosition: 'inside-floating',
      prefixAlign: 'center',
      suffixAlign: 'center',
      dropdownPanel: 'left',
      autocompletePanel: 'left',
      datePanel: 'left',
      revealOn: 'always',
      showRequiredMarkers: true,
      debounceMs: 10
    });
  }));

  // What the portal does to keep its own chrome on the library's defaults. It replaces, not merges.
  it('lets a component provider replace the app defaults for its subtree', fakeAsync(() => {
    configure(DEFAULTS);
    mount(ScopedHostComponent);

    expect(resolved()).toEqual({ ...LIBRARY_OWN, labelPosition: 'outside' });
  }));

  describe('without a form directive', () => {
    function marker(): Element | null {
      return (fixture.nativeElement as HTMLElement).querySelector('.required-marker');
    }

    it('shows the required marker by the library’s own default', fakeAsync(() => {
      configure();
      mount(MarkerWithoutFormHostComponent);

      expect(marker()).not.toBeNull();
    }));

    it('hides the required marker when the app default says so', fakeAsync(() => {
      configure(DEFAULTS);
      mount(MarkerWithoutFormHostComponent);

      expect(marker()).toBeNull();
    }));

    // Dirty but never touched: only the app default's `dirty` reveals the message.
    function typeWithoutTouching(): string[] {
      const root = fixture.nativeElement as HTMLElement;
      const input = root.querySelector('input') as HTMLInputElement;

      input.value = 'ab';
      input.dispatchEvent(new Event('input'));
      tick();
      fixture.detectChanges();

      return Array.from(root.querySelectorAll('.error')).map((error) => error.textContent!.trim());
    }

    it('reveals on touch by the library’s own default', fakeAsync(() => {
      configure();
      mount(RevealWithoutFormHostComponent);

      expect(typeWithoutTouching()).toEqual([]);
    }));

    it('reveals on the app default', fakeAsync(() => {
      configure(DEFAULTS);
      mount(RevealWithoutFormHostComponent);

      expect(typeWithoutTouching()).toEqual(['minlength']);
    }));
  });
});
