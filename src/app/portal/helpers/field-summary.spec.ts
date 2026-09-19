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
    expect(namesOf('arrivalDate')).toEqual(
      jasmine.arrayContaining(['panelPosition', 'unicodeTokenFormat', 'emptyHint', 'locale'])
    );
  });

  it('separates the two halves of a pair by what each is set to', () => {
    expect(valueOf('arrivalDate', 'locale')).toBe('en-GB');
    expect(valueOf('returnDate', 'locale')).toBe('ja-JP');
    expect(valueOf('arrivalDate', 'panelPosition')).toBe('right');
    expect(valueOf('returnDate', 'panelPosition')).toBe('left');
  });

  it('strips the quotes a one-way binding to a string literal carries', () => {
    expect(valueOf('arrivalDate', 'unicodeTokenFormat')).toBe('dd . MM . yyyy');
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
    expect(namesOf('clearance')).toContain('disabled');
    expect(namesOf('luggage')).toContain('readonly');
    expect(namesOf('travellerName')).not.toContain('disabled');
  });

  it('carries the sort, which is a function input the markup cannot express', () => {
    expect(valueOf('originSector', 'sortFn')).toBe('alphabetical');
    expect(namesOf('originEra')).not.toContain('sortFn');
  });

  it('says nothing for a field sitting entirely on its defaults', () => {
    const bare: PortalFieldSpec = {
      id: 'bare',
      kind: 'input',
      sectionId: 'traveller',
      name: 'bare',
      label: 'Bare',
      placeholder: '',
      span: 1,
      decoration: fieldById('travellerName').decoration,
      state: { readonly: false, disabled: false, autoFocus: false }
    };

    expect(describeFieldSettings(bare)).toEqual([]);
  });
});
