import { PortalFieldSpec } from '../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';
import { describeFieldSettings } from './field-summary';

function fieldById(id: string): PortalFieldSpec {
  const field = PREVIEW_FORM_DEFINITION.fields.find((entry) => entry.id === id);

  if (!field) throw new Error(`No preview field named ${id}.`);

  return field;
}

function namesOf(id: string): string[] {
  return describeFieldSettings(fieldById(id)).map((setting) => setting.name);
}

function valueOf(id: string, name: string): string | undefined {
  return describeFieldSettings(fieldById(id)).find((setting) => setting.name === name)?.value;
}

describe('describeFieldSettings', () => {
  it('reads the inputs a field actually carries', () => {
    expect(namesOf('date')).toEqual(jasmine.arrayContaining(['unicodeTokenFormat', 'emptyHint', 'locale']));
  });

  it('separates two fields of one kind by what each is set to', () => {
    expect(valueOf('phone', 'mask')).toBe('000 000 00 00');
    expect(namesOf('orderName')).not.toContain('mask');
  });

  it('strips the quotes a one-way binding to a string literal carries', () => {
    expect(valueOf('date', 'unicodeTokenFormat')).toBe('dd . MM . yyyy');
  });

  it('never states the name, which is the field’s identity rather than one of its settings', () => {
    for (const field of PREVIEW_FORM_DEFINITION.fields) {
      expect(describeFieldSettings(field).map((setting) => setting.name)).not.toContain('name');
    }
  });

  it('states each setting once', () => {
    for (const field of PREVIEW_FORM_DEFINITION.fields) {
      const names = describeFieldSettings(field).map((setting) => setting.name);

      expect(names.length).toBe(new Set(names).size);
    }
  });

  it('carries the state flags, which the serializer emits outside the attribute table', () => {
    const base = fieldById('orderName');

    expect(describeFieldSettings({ ...base, state: { ...base.state, disabled: true } }).map((s) => s.name)).toContain(
      'disabled'
    );
    expect(describeFieldSettings({ ...base, state: { ...base.state, readonly: true } }).map((s) => s.name)).toContain(
      'readonly'
    );
    expect(namesOf('orderName')).not.toContain('disabled');
  });

  it('carries the sort, which is a function input the markup cannot express', () => {
    expect(valueOf('toppings', 'sortFn')).toBe('alphabetical');
    expect(namesOf('sauce')).not.toContain('sortFn');
  });

  // Neither of these is an input on the field: the filter is the consumer's matching and the condition is
  // the `@if` around the field. Both change what the visitor sees, so the chip has to state them.
  it('carries the filter strategy and the visibility condition', () => {
    expect(valueOf('address', 'filter')).toBe('fuzzy');
    expect(valueOf('address', '@if')).toBe('pickup === false');
    expect(valueOf('branch', '@if')).toBe('pickup === true');
    expect(namesOf('orderName')).not.toContain('@if');
  });

  it('says nothing for a field sitting entirely on its defaults', () => {
    const bare: PortalFieldSpec = {
      id: 'bare',
      kind: 'input',
      sectionId: 'pizza',
      name: 'bare',
      label: 'Bare',
      placeholder: '',
      span: 1,
      decoration: { ...fieldById('orderName').decoration, showRequiredMarker: false },
      state: { readonly: false, disabled: false, autoFocus: false }
    };

    expect(describeFieldSettings(bare)).toEqual([]);
  });
});
