import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { FieldDecorator } from './components/field-decorator/field-decorator';
import { AutocompleteField } from './components/fields/autocomplete-field/autocomplete-field';
import { DateField } from './components/fields/date-field/date-field';
import { DropdownField } from './components/fields/dropdown-field/dropdown-field';
import { InputField } from './components/fields/input-field/input-field';
import { FieldErrorsRenderer } from './directives/field-errors-renderer';
import { FieldLabel } from './directives/field-label';
import { FieldPrefix } from './directives/field-prefix';
import { FieldSuffix } from './directives/field-suffix';
import { NgxFormidableForm } from './forms/form.directive';
import { FORMIDABLE_DEFAULTS, FormidableDefaults } from './models/formidable.model';
import { provideNgxFormidable } from './provide-ngx-formidable';
import { fill } from './testing/dom';
import { configureFormidableTestBed, settle } from './testing/test-bed';

/**
 * Contract of the app-wide defaults: an input left unset, or bound to `undefined`, takes the app default,
 * then the library's own; a binding wins over both. Without a form directive, the decorator's required
 * marker and a field's reveal fall back to the app default too.
 */

const IMPORTS = [
  FormsModule,
  NgxFormidableForm,
  FieldDecorator,
  InputField,
  DropdownField,
  AutocompleteField,
  DateField,
  FieldLabel,
  FieldPrefix,
  FieldSuffix,
  FieldErrorsRenderer
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

@Component({ imports: IMPORTS, template: UNSET })
class UnsetHost {}

/** The same subtree, under a provider of its own. */
@Component({
  imports: IMPORTS,
  providers: [{ provide: FORMIDABLE_DEFAULTS, useValue: { labelPosition: 'outside' } }],
  template: UNSET
})
class ScopedHost {}

/** Every defaulted input, bound to `undefined` — what a dynamic template binds to mean "inherit". */
@Component({
  imports: IMPORTS,
  template: `
    <form
      formidableForm
      [revealOn]="undefined"
      [hideRequiredMarkers]="undefined"
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
class UndefinedHost {}

/** Every defaulted input, bound to a value that is neither the app default nor the library's own. */
@Component({
  imports: IMPORTS,
  template: `
    <form
      formidableForm
      revealOn="always"
      [hideRequiredMarkers]="false"
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
class ExplicitHost {}

/** A decorated field asking for its required marker, with no form directive above it. */
@Component({
  imports: IMPORTS,
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        name="a"
        [markRequired]="true" />
      <div formidableFieldLabel>A</div>
    </formidable-field-decorator>
  `
})
class MarkerWithoutFormHost {}

/** A field validated by Angular alone, with no formidable form to say when its messages appear. */
@Component({
  imports: IMPORTS,
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
class RevealWithoutFormHost {
  name = '';
}

const DEFAULTS: Required<FormidableDefaults> = {
  labelPosition: 'border',
  prefixAlign: 'value',
  suffixAlign: 'value',
  panelPosition: 'sheet',
  revealOn: 'dirty',
  hideRequiredMarkers: true,
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
  hideRequiredMarkers: boolean;
  debounceMs: number;
}

describe('app defaults', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fixture: ComponentFixture<any>;

  function configure(defaults?: FormidableDefaults): void {
    configureFormidableTestBed({
      providers: defaults ? provideNgxFormidable({ defaults }) : []
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function mount(host: Type<any>): Promise<void> {
    fixture = TestBed.createComponent(host);
    await settle(fixture);
  }

  function get<T>(type: Type<T>): T {
    return fixture.debugElement.query(By.directive(type)).injector.get(type);
  }

  function resolved(): Resolved {
    const form = get(NgxFormidableForm);

    return {
      labelPosition: get(FieldLabel).position(),
      prefixAlign: get(FieldPrefix).align(),
      suffixAlign: get(FieldSuffix).align(),
      dropdownPanel: get(DropdownField).panelPosition(),
      autocompletePanel: get(AutocompleteField).panelPosition(),
      datePanel: get(DateField).panelPosition(),
      revealOn: form.revealOn(),
      hideRequiredMarkers: form.hideRequiredMarkers(),
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
    hideRequiredMarkers: false,
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
    hideRequiredMarkers: true,
    debounceMs: 250
  };

  it('keeps the library’s own without a provider, each panel field its own', async () => {
    configure();
    await mount(UnsetHost);

    expect(resolved()).toEqual(LIBRARY_OWN);
  });

  it('applies the app default to every unset input', async () => {
    configure(DEFAULTS);
    await mount(UnsetHost);

    expect(resolved()).toEqual(APP_DEFAULTS);
  });

  it('applies the app default to an input bound to undefined', async () => {
    configure(DEFAULTS);
    await mount(UndefinedHost);

    expect(resolved()).toEqual(APP_DEFAULTS);
  });

  it('falls back to the library’s own for an input bound to undefined without a provider', async () => {
    configure();
    await mount(UndefinedHost);

    expect(resolved()).toEqual(LIBRARY_OWN);
  });

  it('lets a binding win over the app default', async () => {
    configure(DEFAULTS);
    await mount(ExplicitHost);

    expect(resolved()).toEqual({
      labelPosition: 'inside-floating',
      prefixAlign: 'center',
      suffixAlign: 'center',
      dropdownPanel: 'left',
      autocompletePanel: 'left',
      datePanel: 'left',
      revealOn: 'always',
      hideRequiredMarkers: false,
      debounceMs: 10
    });
  });

  // What the portal does to keep its own chrome on the library's defaults. It replaces, not merges.
  it('lets a component provider replace the app defaults for its subtree', async () => {
    configure(DEFAULTS);
    await mount(ScopedHost);

    expect(resolved()).toEqual({ ...LIBRARY_OWN, labelPosition: 'outside' });
  });

  describe('without a form directive', () => {
    function marker(): Element | null {
      return (fixture.nativeElement as HTMLElement).querySelector('.required-marker');
    }

    it('shows the required marker by the library’s own default', async () => {
      configure();
      await mount(MarkerWithoutFormHost);

      expect(marker()).not.toBeNull();
    });

    it('hides the required marker when the app default says so', async () => {
      configure(DEFAULTS);
      await mount(MarkerWithoutFormHost);

      expect(marker()).toBeNull();
    });

    // Dirty but never touched: only the app default's `dirty` reveals the message.
    async function typeWithoutTouching(): Promise<string[]> {
      const root = fixture.nativeElement as HTMLElement;

      fill(root.querySelector('input') as HTMLInputElement, 'ab');
      await settle(fixture);

      return Array.from(root.querySelectorAll('.error')).map((error) => error.textContent!.trim());
    }

    it('reveals on touch by the library’s own default', async () => {
      configure();
      await mount(RevealWithoutFormHost);

      expect(await typeWithoutTouching()).toEqual([]);
    });

    it('reveals on the app default', async () => {
      configure(DEFAULTS);
      await mount(RevealWithoutFormHost);

      expect(await typeWithoutTouching()).toEqual(['minlength']);
    });
  });
});
