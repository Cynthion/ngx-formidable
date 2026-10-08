import { PortalFieldSpec, PortalFormDefinition } from '../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';
import { parseMarkup } from './markup-parser';
import { serializeDefinition } from './markup-serializer';
import { serializeSchema } from './schema-serializer';

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
  it('emits one decorator per field, each bound to its key, inside a form over the field tree', () => {
    const markup = serializeDefinition(only(['orderName', 'phone']));

    expect(markup).toContain('<form [formRoot]="form">');
    expect(markup.match(/<formidable-field-decorator>/g)?.length).toBe(2);
    expect(markup).toContain('[formField]="form.orderName" />');
    expect(markup).toContain('[formField]="form.phone" />');
  });

  // `[formField]` hands the field its name, state and limits, and the compiler rejects a binding to any of
  // them beside it — so the schema states them, and the template does not.
  it('leaves what [formField] owns to the schema', () => {
    const definition = only(['spice', 'notes', 'orderName']);
    const fields = definition.fields.map((field) => ({ ...field, state: { ...field.state, readonly: true } }));
    const markup = serializeDefinition({ ...definition, fields });

    expect(markup).not.toMatch(/\s(name|\[min\]|\[max\]|\[maxLength\]|\[readonly\]|\[required\])=/);
    expect(markup).toContain('[step]="1"');
  });

  it('emits a section comment before its fields', () => {
    expect(serializeDefinition(only(['orderName']))).toContain('<!-- Your Order -->');
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

  // The group is the model's, so a grouped field is bound to the field under its group.
  it('binds a grouped section’s fields under their group', () => {
    const markup = serializeDefinition(only(['date', 'time']));

    expect(markup).toContain('[formField]="form.when.date"');
    expect(markup).toContain('[formField]="form.when.time"');
  });

  // The export carries the behaviour, not the state the stage happens to be in: the field the preview is
  // currently hiding is still part of the form. The condition itself is a `hidden()` rule in the schema.
  it('gates a conditional field on its hidden state', () => {
    const markup = serializeDefinition(only(['address', 'branch', 'cardNumber']));

    expect(markup).toContain('@if (!form.address().hidden()) {');
    expect(markup).toContain('@if (!form.branch().hidden()) {');
    expect(markup).toContain('@if (!form.payment.cardNumber().hidden()) {');
  });

  it('reads a key that is not an identifier through a bracket', () => {
    const definition = only(['orderName']);
    const markup = serializeDefinition({ ...definition, fields: [{ ...definition.fields[0]!, name: 'radio-group1' }] });

    expect(markup).toContain(`[formField]="form['radio-group1']"`);
  });

  // What an app default is for: the template states only what a field states itself.
  it('leaves out what the field states nothing for, so the app default applies', () => {
    const markup = serializeDefinition(only(['orderName', 'date']));

    expect(markup).toContain('<div formidableFieldLabel>');
    expect(markup).not.toContain('position=');
    expect(markup).not.toContain('[panelPosition]');
  });

  it('states what the field states itself', () => {
    expect(serializeDefinition(only(['cardNumber']))).toContain('position="outside"');
  });

  // A preset writes keys the field does not own, so it is a handler on the component rather than an input.
  it('binds a preset field’s valueChange to the handler the component declares', () => {
    const markup = serializeDefinition(only(['pizza']));

    expect(markup).toContain('(valueChange)="applyPizzaPreset($event)"');
    expect(serializeDefinition(only(['size']))).not.toContain('(valueChange)');
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
    expect(result.notes).toEqual([]);
  });

  it('recovers a camel-cased input the HTML parser lowercased', () => {
    const { result } = roundTrip(['phone']);

    expect(result.fields[0]?.mask).toBe('000 000 00 00');
    expect(result.notes).toEqual([]);
  });

  // The limits are rules, so the template has none to give back.
  it('round-trips the numeric and boolean inputs of a slider, leaving its limits behind', () => {
    const { definition, result } = roundTrip(['spice']);
    const parsed = result.fields[0]!;

    expect(parsed.min).toBeUndefined();
    expect(parsed.max).toBeUndefined();
    expect(parsed.step).toBe(definition.fields[0]!.step);
    expect(parsed.showTickMarks).toBe(true);
    expect(parsed.showMinMaxLabels).toBe(true);
  });

  it('round-trips a quoted literal binding', () => {
    const { definition, result } = roundTrip(['date']);

    expect(result.fields[0]?.unicodeTokenFormat).toBe(definition.fields[0]!.unicodeTokenFormat);
  });

  it('round-trips a stated panel position, and an unstated one as unstated', () => {
    expect(roundTrip(['pizza']).result.fields[0]?.panelPosition).toBe('right');
    expect(roundTrip(['date']).result.fields[0]?.panelPosition).toBeUndefined();
  });

  it('round-trips a stated label position, and an unstated one as unstated', () => {
    expect(roundTrip(['cardNumber']).result.fields[0]?.decoration.labelPosition).toBe('outside');
    expect(roundTrip(['orderName']).result.fields[0]?.decoration.labelPosition).toBeUndefined();
  });

  it('round-trips an adornment’s stated alignment, and an unstated one as unstated', () => {
    const definition = only(['orderName']);
    const field = definition.fields[0]!;
    const decoration = { ...field.decoration, prefix: 'text', suffix: 'text', prefixAlign: 'value' } as const;
    const markup = serializeDefinition({ ...definition, fields: [{ ...field, decoration }] });
    const parsed = parseMarkup(markup).fields[0]!.decoration;

    expect(parsed.prefixAlign).toBe('value');
    expect(parsed.suffixAlign).toBeUndefined();
  });

  it('round-trips an option list, its disabled entry and its readonly entry', () => {
    const { definition, result } = roundTrip(['toppings']);

    expect(result.fields[0]?.options?.length).toBe(definition.fields[0]!.options!.length);
    expect(result.fields[0]?.options?.find((o) => o.value === 'anchovies')?.disabled).toBe(true);
    expect(result.fields[0]?.options?.find((o) => o.value === 'mozzarella')?.readonly).toBe(true);
  });

  it('round-trips autofocus', () => {
    const definition = only(['orderName']);
    const field = definition.fields[0]!;
    const markup = serializeDefinition({
      ...definition,
      fields: [{ ...field, state: { ...field.state, autoFocus: true } }]
    });

    expect(parseMarkup(markup).fields[0]?.state.autoFocus).toBe(true);
  });

  // Every field comes back, and what does not is named rather than dropped in silence: a preset map lives in
  // the component, and a condition in the schema, neither of which the import reads.
  it('round-trips every field in the preview form, naming what the component and the schema hold', () => {
    const { definition, result } = roundTrip(PREVIEW_FORM_DEFINITION.fields.map((field) => field.id));

    expect(result.fields.length).toBe(definition.fields.length);
    expect(result.notes).toEqual([
      { text: '@if (!form.address().hidden())', reason: 'in-the-schema' },
      { text: '@if (!form.branch().hidden())', reason: 'in-the-schema' },
      { text: '@if (!form.payment.cardNumber().hidden())', reason: 'in-the-schema' },
      // Lowercased, because the HTML parser lowercases every attribute name it reads.
      { text: '(valuechange)="applyPizzaPreset($event)"', reason: 'in-the-component' }
    ]);
    expect(result.fields.every((field) => field.presets === undefined && field.visibleWhen === undefined)).toBe(true);
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

  // The gate is Angular's own syntax rather than markup, so it comes out before the DOMParser reads the
  // braces as text — and the field inside it comes back, without the condition the schema holds.
  it('keeps a gated field, notes its condition, and reports no control flow for it', () => {
    const { result } = roundTrip(['pickup', 'address', 'branch']);

    expect(result.fields.map((field) => field.name)).toEqual(['pickup', 'address', 'branch']);
    expect(result.notes.map((note) => note.reason)).toEqual(['in-the-schema', 'in-the-schema']);
  });

  it('reads a grouped field’s name and group off its [formField] path', () => {
    const { result } = roundTrip(['method', 'cardNumber']);

    expect(result.fields.map((field) => field.name)).toEqual(['method', 'cardNumber']);
    expect(result.sections.map((section) => section.groupName)).toEqual(['payment']);
  });

  it('reports a [formField] that is not a path off the form', () => {
    const result = parseMarkup(
      '<formidable-field-decorator><formidable-input-field [formField]="other.name" /></formidable-field-decorator>'
    );

    expect(result.notes).toEqual([{ text: '[formfield]="other.name"', reason: 'dynamic-binding' }]);
  });

  it('puts fields with no section comment above them into one fallback section', () => {
    const result = parseMarkup(
      '<formidable-field-decorator><formidable-input-field [formField]="form.a" /></formidable-field-decorator>'
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

describe('schema import', () => {
  /** What the schema holds for a field: what `[formField]` owns, which the template cannot state. */
  const ruled = (field: PortalFieldSpec) => ({
    name: field.name,
    readonly: field.state.readonly,
    disabled: field.state.disabled,
    markRequired: field.decoration.markRequired,
    minLength: field.minLength,
    maxLength: field.maxLength,
    min: field.min,
    max: field.max,
    visibleWhen: field.visibleWhen
  });

  const withSchema = (definition: PortalFormDefinition) =>
    parseMarkup(serializeDefinition(definition), serializeSchema(definition));

  // Each validator states the marker its own way: `required()` marks the field it checks, and the others state
  // `REQUIRED` metadata. A check with a message, `maxLength(path.toppings, 5, …)`, is not a limit.
  it.each(['angular', 'vest', 'zod', 'none'] as const)(
    'round-trips every field’s rules in the preview form under %s',
    (validator) => {
      const definition = { ...PREVIEW_FORM_DEFINITION, options: { ...PREVIEW_FORM_DEFINITION.options, validator } };

      expect(withSchema(definition).fields.map(ruled)).toEqual(definition.fields.map(ruled));
    }
  );

  it('round-trips readonly, disabled, and a condition on a string, a number and a bracketed key', () => {
    const definition = only(['orderName', 'quantity', 'notes', 'method']);
    const fields = definition.fields.map((field): PortalFieldSpec => {
      switch (field.name) {
        case 'orderName':
          return { ...field, name: 'order-name', state: { ...field.state, readonly: true } };
        case 'quantity':
          return { ...field, state: { ...field.state, disabled: true } };
        case 'notes':
          return { ...field, visibleWhen: { field: 'order-name', equals: "it's" } };
        default:
          return { ...field, visibleWhen: { field: 'quantity', equals: 2 } };
      }
    });

    expect(withSchema({ ...definition, fields }).fields.map(ruled)).toEqual(fields.map(ruled));
  });

  // The root's rules are the form's settings, which stay as the Studio has them.
  it('applies no rule on the root to a field', () => {
    const definition = only(['orderName']);
    const options = { ...definition.options, readonly: true, disabled: true, debounce: 300 } as const;

    expect(withSchema({ ...definition, options }).fields[0]?.state).toEqual(definition.fields[0]!.state);
  });

  // A condition the schema states comes back, so its gate needs no note; the preset still lives in the component.
  it('notes no gate whose condition the schema states', () => {
    expect(withSchema(PREVIEW_FORM_DEFINITION).notes).toEqual([
      { text: '(valuechange)="applyPizzaPreset($event)"', reason: 'in-the-component' }
    ]);
  });

  it('still notes a gate the schema states no condition for', () => {
    const empty = 'export const exampleSchema = schema<ExampleFormModel>((path) => {\n});';

    expect(parseMarkup(serializeDefinition(only(['pickup', 'address'])), empty).notes).toEqual([
      { text: '@if (!form.address().hidden())', reason: 'in-the-schema' }
    ]);
  });
});
