import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { page, userEvent } from 'vitest/browser';
import { FieldDecorator } from './components/field-decorator/field-decorator';
import { AutocompleteField } from './components/fields/autocomplete-field/autocomplete-field';
import { DateField } from './components/fields/date-field/date-field';
import { DropdownField } from './components/fields/dropdown-field/dropdown-field';
import { InputField } from './components/fields/input-field/input-field';
import { FieldLabel } from './directives/field-label';
import { FieldPrefix } from './directives/field-prefix';
import { FieldSuffix } from './directives/field-suffix';
import { FORMIDABLE_DEFAULTS, FormidableDefaults } from './models/formidable.model';
import { provideNgxFormidable } from './provide-ngx-formidable';
import { BoundField, bindField, FieldFlags } from './testing/bind-field';
import { configureFormidableTestBed, settle } from './testing/test-bed';

/**
 * Contract of the app-wide defaults: an input left unset, or bound to `undefined`, takes the app default,
 * then the library's own; a binding wins over both. The decorator's required marker and a field's reveal
 * fall back to the app default too, for the state a forms API holds.
 */

const IMPORTS = [
  FieldDecorator,
  InputField,
  DropdownField,
  AutocompleteField,
  DateField,
  FieldLabel,
  FieldPrefix,
  FieldSuffix
];

/** Every defaulted input, none of them bound. */
const UNSET = `
  <formidable-field-decorator>
    <formidable-input-field name="a" />
    <div formidableFieldLabel>A</div>
    <div formidableFieldPrefix>P</div>
    <div formidableFieldSuffix>S</div>
  </formidable-field-decorator>
  <formidable-dropdown-field name="d" />
  <formidable-autocomplete-field name="ac" />
  <formidable-date-field name="dt" />
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
  `
})
class UndefinedHost {}

/** Every defaulted input, bound to a value that is neither the app default nor the library's own. */
@Component({
  imports: IMPORTS,
  template: `
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
  `
})
class ExplicitHost {}

const DEFAULTS: Required<FormidableDefaults> = {
  labelPosition: 'border',
  prefixAlign: 'value',
  suffixAlign: 'value',
  panelPosition: 'sheet',
  revealOn: 'dirty',
  hideRequiredMarkers: true
};

/** What every readable defaulted input resolved to. The reveal and the marker are asserted by what renders. */
interface Resolved {
  labelPosition: string;
  prefixAlign: string;
  suffixAlign: string;
  dropdownPanel: string;
  autocompletePanel: string;
  datePanel: string;
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
    return {
      labelPosition: get(FieldLabel).position(),
      prefixAlign: get(FieldPrefix).align(),
      suffixAlign: get(FieldSuffix).align(),
      dropdownPanel: get(DropdownField).panelPosition(),
      autocompletePanel: get(AutocompleteField).panelPosition(),
      datePanel: get(DateField).panelPosition()
    };
  }

  const LIBRARY_OWN: Resolved = {
    labelPosition: 'inside',
    prefixAlign: 'center',
    suffixAlign: 'center',
    dropdownPanel: 'full',
    autocompletePanel: 'full',
    datePanel: 'right'
  };

  const APP_DEFAULTS: Resolved = {
    labelPosition: 'border',
    prefixAlign: 'value',
    suffixAlign: 'value',
    dropdownPanel: 'sheet',
    autocompletePanel: 'sheet',
    datePanel: 'sheet'
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
      datePanel: 'left'
    });
  });

  // What the portal does to keep its own chrome on the library's defaults. It replaces, not merges.
  it('lets a component provider replace the app defaults for its subtree', async () => {
    configure(DEFAULTS);
    await mount(ScopedHost);

    expect(resolved()).toEqual({ ...LIBRARY_OWN, labelPosition: 'outside' });
  });

  describe('the required marker and the reveal', () => {
    /** A decorated input, under a label, in the state Signal Forms holds for it. */
    const bind = (state: Partial<FieldFlags>) =>
      bindField('input', 'signal', { decorated: true, decoration: '<div formidableFieldLabel>Name</div>', state });

    const marker = ({ element }: BoundField) =>
      element.closest('formidable-field-decorator')!.querySelector('.required-marker');

    const messages = () =>
      page
        .getByRole('listitem')
        .elements()
        .map((message) => message.textContent!.trim());

    /** An invalid field the user has typed into without leaving it: dirty, never touched. */
    async function editWithoutLeaving(): Promise<void> {
      const bound = await bind({ invalid: true });

      await userEvent.type(page.getByRole('textbox', { name: 'Name' }), 'x');
      await expect.poll(bound.dirty).toBe(true);
      await settle(bound.fixture);

      expect(bound.touched()).toBe(false);
    }

    it('shows the required marker by the library’s own default', async () => {
      configure();

      expect(marker(await bind({ required: true }))).not.toBeNull();
    });

    it('hides the required marker when the app default says so', async () => {
      configure(DEFAULTS);

      expect(marker(await bind({ required: true }))).toBeNull();
    });

    it('waits for the touch to reveal by the library’s own default', async () => {
      configure();
      await editWithoutLeaving();

      expect(messages()).toEqual([]);
    });

    it('reveals on the app default', async () => {
      configure(DEFAULTS);
      await editWithoutLeaving();

      expect(messages()).toEqual(['invalid']);
    });
  });
});
