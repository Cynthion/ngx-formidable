import { PortalFormDefinition } from '../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';
import { parseMarkup } from './markup-parser';
import { serializeDefinition } from './markup-serializer';

function only(ids: readonly string[]): PortalFormDefinition {
  return {
    ...PREVIEW_FORM_DEFINITION,
    fields: PREVIEW_FORM_DEFINITION.fields.filter((field) => ids.includes(field.id))
  };
}

function roundTrip(ids: readonly string[]) {
  const definition = only(ids);

  return { definition, result: parseMarkup(serializeDefinition(definition)) };
}

describe('markup serializer', () => {
  it('emits one decorator per field, inside a formidable form', () => {
    const markup = serializeDefinition(only(['travellerName', 'temporalId']));

    expect(markup).toContain('<form');
    expect(markup).toContain('formidableForm');
    expect(markup.match(/<formidable-field-decorator>/g)?.length).toBe(2);
    expect(markup).toContain('<formidable-input-field');
  });

  it('emits a section comment before its fields', () => {
    expect(serializeDefinition(only(['travellerName']))).toContain('<!-- The Traveller -->');
  });

  it('omits the suite binding when the form is not wired to Vest', () => {
    const definition = only(['travellerName']);
    const markup = serializeDefinition({ ...definition, options: { ...definition.options, validator: 'none' } });

    expect(markup).not.toContain('[formSuite]');
  });

  it('emits options for an option field', () => {
    const markup = serializeDefinition(only(['originEra']));

    expect(markup).toContain('<formidable-field-option');
    expect(markup).toContain('[disabled]="true"');
    expect(markup).toContain('[readonly]="true"');
  });

  it('escapes what would otherwise reopen the markup', () => {
    const definition = only(['travellerName']);
    const field = definition.fields[0]!;
    const markup = serializeDefinition({ ...definition, fields: [{ ...field, label: 'A <b> & "quote"' }] });

    expect(markup).toContain('A &lt;b&gt; &amp; &quot;quote&quot;');
  });
});

describe('markup import', () => {
  it('round-trips a text field', () => {
    const { definition, result } = roundTrip(['travellerName']);
    const source = definition.fields[0]!;
    const parsed = result.fields[0]!;

    expect(result.fields.length).toBe(1);
    expect(parsed.kind).toBe('input');
    expect(parsed.name).toBe(source.name);
    expect(parsed.label).toBe(source.label);
    expect(parsed.placeholder).toBe(source.placeholder);
    expect(parsed.decoration.showRequiredMarker).toBe(true);
    expect(result.notes).toEqual([]);
  });

  it('recovers a camel-cased input the HTML parser lowercased', () => {
    const { result } = roundTrip(['temporalId']);

    expect(result.fields[0]?.mask).toBe('AAA-0000');
    expect(result.notes).toEqual([]);
  });

  it('round-trips the numeric and boolean inputs of a slider', () => {
    const { definition, result } = roundTrip(['paradoxTolerance']);
    const source = definition.fields[0]!;
    const parsed = result.fields[0]!;

    expect(parsed.min).toBe(source.min);
    expect(parsed.max).toBe(source.max);
    expect(parsed.step).toBe(source.step);
    expect(parsed.showTickMarks).toBe(true);
    expect(parsed.showTickLabels).toBe(true);
  });

  it('round-trips a quoted literal binding', () => {
    const { definition, result } = roundTrip(['arrivalDate']);

    expect(result.fields[0]?.unicodeTokenFormat).toBe(definition.fields[0]!.unicodeTokenFormat);
    expect(result.fields[0]?.panelPosition).toBe('right');
  });

  it('round-trips an option list, its disabled entry and its readonly entry', () => {
    const { definition, result } = roundTrip(['originEra']);

    expect(result.fields[0]?.options?.length).toBe(definition.fields[0]!.options!.length);
    expect(result.fields[0]?.options?.find((o) => o.value === 'permian')?.disabled).toBe(true);
    expect(result.fields[0]?.options?.find((o) => o.value === 'big-bang')?.readonly).toBe(true);
  });

  it('round-trips the readonly and disabled state', () => {
    expect(roundTrip(['luggage']).result.fields[0]?.state.readonly).toBe(true);
    expect(roundTrip(['clearance']).result.fields[0]?.state.disabled).toBe(true);
  });

  it('round-trips every field in the preview form without a note', () => {
    const { definition, result } = roundTrip(PREVIEW_FORM_DEFINITION.fields.map((field) => field.id));

    expect(result.fields.length).toBe(definition.fields.length);
    expect(result.notes).toEqual([]);
  });

  // The sections come from the comments the serializer writes, which is what lets a whole form go out and
  // come back as the same form rather than as one undifferentiated list.
  it('round-trips the sections and keeps each field in its own', () => {
    const { definition, result } = roundTrip(PREVIEW_FORM_DEFINITION.fields.map((field) => field.id));

    expect(result.sections.map((section) => section.title)).toEqual(
      definition.sections.map((section) => section.title)
    );

    for (const section of result.sections) {
      const original = definition.sections.find((candidate) => candidate.title === section.title)!;
      const expected = definition.fields.filter((field) => field.sectionId === original.id).map((f) => f.name);
      const actual = result.fields.filter((field) => field.sectionId === section.id).map((f) => f.name);

      expect(actual).toEqual(expected);
    }
  });

  it('puts fields with no section comment above them into one fallback section', () => {
    const result = parseMarkup(
      '<formidable-field-decorator><formidable-input-field name="a"></formidable-input-field></formidable-field-decorator>'
    );

    expect(result.sections.length).toBe(1);
    expect(result.fields[0]?.sectionId).toBe(result.sections[0]?.id);
  });

  it('reports a binding to an expression rather than applying it', () => {
    const result = parseMarkup(
      '<formidable-field-decorator><formidable-input-field [mask]="dynamicMask"></formidable-input-field></formidable-field-decorator>'
    );

    expect(result.fields[0]?.mask).toBeUndefined();
    expect(result.notes).toEqual([{ text: '[mask]="dynamicMask"', reason: 'dynamic-binding' }]);
  });

  it('reports an input the portal does not expose', () => {
    const result = parseMarkup(
      '<formidable-field-decorator><formidable-input-field inputmode="tel"></formidable-input-field></formidable-field-decorator>'
    );

    expect(result.notes).toEqual([{ text: 'inputmode', reason: 'unknown-attribute' }]);
  });

  it('reports control flow', () => {
    const result = parseMarkup('@if (show) { <formidable-field-decorator></formidable-field-decorator> }');

    expect(result.notes.some((note) => note.reason === 'control-flow')).toBe(true);
  });

  it('reports an element it does not know', () => {
    const result = parseMarkup('<formidable-field-decorator><my-field></my-field></formidable-field-decorator>');

    expect(result.fields).toEqual([]);
    expect(result.notes.some((note) => note.reason === 'unknown-element')).toBe(true);
  });
});
