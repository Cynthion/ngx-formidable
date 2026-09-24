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
    const markup = serializeDefinition(only(['orderName', 'phone']));

    expect(markup).toContain('<form');
    expect(markup).toContain('formidableForm');
    expect(markup.match(/<formidable-field-decorator>/g)?.length).toBe(2);
    expect(markup).toContain('<formidable-input-field');
  });

  it('emits a section comment before its fields', () => {
    expect(serializeDefinition(only(['orderName']))).toContain('<!-- Your Order -->');
  });

  it('omits the suite binding when the form is not wired to Vest', () => {
    const definition = only(['orderName']);
    const markup = serializeDefinition({ ...definition, options: { ...definition.options, validator: 'none' } });

    expect(markup).not.toContain('[formSuite]');
  });

  it('emits options for an option field', () => {
    const markup = serializeDefinition(only(['toppings']));

    expect(markup).toContain('<formidable-field-option');
    expect(markup).toContain('[disabled]="true"');
    expect(markup).toContain('[readonly]="true"');
  });

  it('escapes what would otherwise reopen the markup', () => {
    const definition = only(['orderName']);
    const field = definition.fields[0]!;
    const markup = serializeDefinition({ ...definition, fields: [{ ...field, label: 'A <b> & "quote"' }] });

    expect(markup).toContain('A &lt;b&gt; &amp; &quot;quote&quot;');
  });

  // The group is on the section, so the wrapper and the nested model access both come from one place.
  it('wraps a grouped section in an ngModelGroup and nests its model access', () => {
    const markup = serializeDefinition(only(['date', 'time']));

    expect(markup).toContain('ngModelGroup="when"');
    expect(markup).toContain('[ngModel]="model().when.date"');
    expect(markup).toContain('[ngModel]="model().when.time"');
  });

  // The export carries the behaviour, not the state the stage happens to be in: the field the preview is
  // currently hiding is still part of the form.
  it('wraps a conditional field in the @if its condition states', () => {
    const markup = serializeDefinition(only(['address', 'branch']));

    expect(markup).toContain('@if (model().pickup === false) {');
    expect(markup).toContain('@if (model().pickup === true) {');
  });

  // `visibleWhen` names a field, not a path, so the group the watched field sits in is resolved here — a
  // condition reading `model().method` would read a key that does not exist.
  it('resolves a condition on a grouped field through its group', () => {
    const markup = serializeDefinition(only(['method', 'cardNumber']));

    expect(markup).toContain("@if (model().payment.method === 'card') {");
  });

  // A preset writes keys the field does not own, so it is a handler on the component rather than an input.
  it('binds a preset field to the handler the component declares', () => {
    const markup = serializeDefinition(only(['pizza']));

    expect(markup).toContain('(ngModelChange)="applyPizzaPreset($event)"');
    expect(serializeDefinition(only(['size']))).not.toContain('(ngModelChange)');
  });
});

describe('markup import', () => {
  it('round-trips a text field', () => {
    const { definition, result } = roundTrip(['orderName']);
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
    const { result } = roundTrip(['phone']);

    expect(result.fields[0]?.mask).toBe('000 000 00 00');
    expect(result.notes).toEqual([]);
  });

  it('round-trips the numeric and boolean inputs of a slider', () => {
    const { definition, result } = roundTrip(['spice']);
    const source = definition.fields[0]!;
    const parsed = result.fields[0]!;

    expect(parsed.min).toBe(source.min);
    expect(parsed.max).toBe(source.max);
    expect(parsed.step).toBe(source.step);
    expect(parsed.showTickMarks).toBe(true);
    expect(parsed.showMinMaxLabels).toBe(true);
  });

  it('round-trips a quoted literal binding', () => {
    const { definition, result } = roundTrip(['date']);

    expect(result.fields[0]?.unicodeTokenFormat).toBe(definition.fields[0]!.unicodeTokenFormat);
    expect(result.fields[0]?.panelPosition).toBe('right');
  });

  it('round-trips an option list, its disabled entry and its readonly entry', () => {
    const { definition, result } = roundTrip(['toppings']);

    expect(result.fields[0]?.options?.length).toBe(definition.fields[0]!.options!.length);
    expect(result.fields[0]?.options?.find((o) => o.value === 'anchovies')?.disabled).toBe(true);
    expect(result.fields[0]?.options?.find((o) => o.value === 'mozzarella')?.readonly).toBe(true);
  });

  it('round-trips the readonly and disabled state', () => {
    const definition = only(['orderName']);
    const field = definition.fields[0]!;

    const readonly = parseMarkup(
      serializeDefinition({ ...definition, fields: [{ ...field, state: { ...field.state, readonly: true } }] })
    );
    const disabled = parseMarkup(
      serializeDefinition({ ...definition, fields: [{ ...field, state: { ...field.state, disabled: true } }] })
    );

    expect(readonly.fields[0]?.state.readonly).toBe(true);
    expect(disabled.fields[0]?.state.disabled).toBe(true);
  });

  // Every field comes back, and the one thing that does not is named rather than dropped in silence: a
  // preset map is data and lives in the component, which the import does not read.
  it('round-trips every field in the preview form, naming only what the component holds', () => {
    const { definition, result } = roundTrip(PREVIEW_FORM_DEFINITION.fields.map((field) => field.id));

    expect(result.fields.length).toBe(definition.fields.length);
    // Lowercased, because the HTML parser lowercases every attribute name it reads.
    expect(result.notes).toEqual([{ text: '(ngmodelchange)="applyPizzaPreset($event)"', reason: 'in-the-component' }]);
    expect(result.fields.every((field) => field.presets === undefined)).toBeTrue();
  });

  it('round-trips a field with no behaviour behind it without a note at all', () => {
    expect(roundTrip(['orderName', 'email', 'phone']).result.notes).toEqual([]);
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

  it('round-trips a section’s group name', () => {
    const { result } = roundTrip(['date', 'time']);

    expect(result.sections.map((section) => section.groupName)).toEqual(['when']);
  });

  // The condition is Angular's own syntax rather than markup, so it is lifted onto the decorator before the
  // DOMParser reads the braces as text and drops them.
  it('round-trips a conditional field’s condition, and reports no control flow for it', () => {
    const { result } = roundTrip(['pickup', 'address', 'branch']);

    expect(result.fields.find((field) => field.name === 'address')?.visibleWhen).toEqual({
      field: 'pickup',
      equals: false
    });
    expect(result.fields.find((field) => field.name === 'branch')?.visibleWhen).toEqual({
      field: 'pickup',
      equals: true
    });
    expect(result.fields.find((field) => field.name === 'pickup')?.visibleWhen).toBeUndefined();
    expect(result.notes).toEqual([]);
  });

  // The condition comes back naming the field, not the path: the group is the section's, and the import
  // rebuilds it from the `ngModelGroup` it found rather than from the condition.
  it('round-trips a condition on a grouped field as the field it names', () => {
    const { result } = roundTrip(['method', 'cardNumber']);

    expect(result.fields.find((field) => field.name === 'cardNumber')?.visibleWhen).toEqual({
      field: 'method',
      equals: 'card'
    });
    expect(result.sections.map((section) => section.groupName)).toEqual(['payment']);
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

  it('reports control flow it cannot read as a condition', () => {
    const result = parseMarkup('@if (show) {\n<formidable-field-decorator></formidable-field-decorator>\n}');

    expect(result.notes.some((note) => note.reason === 'control-flow')).toBe(true);
  });

  it('reports an element it does not know', () => {
    const result = parseMarkup('<formidable-field-decorator><my-field></my-field></formidable-field-decorator>');

    expect(result.fields).toEqual([]);
    expect(result.notes.some((note) => note.reason === 'unknown-element')).toBe(true);
  });
});
