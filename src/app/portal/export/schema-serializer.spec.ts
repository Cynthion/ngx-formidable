import { PortalFormDefinition, PortalFormOptions } from '../model/field-spec.model';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';
import { serializeSchema } from './schema-serializer';

function only(ids: readonly string[], options: Partial<PortalFormOptions> = {}): PortalFormDefinition {
  return {
    ...PREVIEW_FORM_DEFINITION,
    fields: PREVIEW_FORM_DEFINITION.fields.filter((field) => ids.includes(field.id)),
    options: { ...PREVIEW_FORM_DEFINITION.options, ...options }
  };
}

/** The schema's body, one rule per line. */
function rules(definition: PortalFormDefinition): string[] {
  const source = serializeSchema(definition);
  const open = 'schema<MyFormModel>((path) => {\n';
  const body = source.slice(source.indexOf(open) + open.length, source.lastIndexOf('});'));

  return body.split('\n').filter(Boolean);
}

describe('schema serializer', () => {
  // Keys follow the definition's section and field order, not the order asked for here, and only the last
  // drops its comma — so the blocks are asserted whole rather than a line at a time.
  it('types each key by what its field writes, and starts it empty', () => {
    const source = serializeSchema(only(['orderName', 'pickup', 'spice', 'toppings', 'quantity', 'size']));

    expect(source).toContain(
      [
        'export interface MyFormModel {',
        '  size: string | null;',
        '  toppings: string[];',
        '  spice: number;',
        '  pickup: boolean;',
        '  orderName: string;',
        '  quantity: number;',
        '}'
      ].join('\n')
    );
    // A number starts at its field's `min`, so the form does not open outside its own limits.
    expect(source).toContain(
      [
        'export const myFormInitialModel: MyFormModel = {',
        '  size: null,',
        '  toppings: [],',
        '  spice: 0,',
        '  pickup: false,',
        "  orderName: '',",
        '  quantity: 1',
        '};'
      ].join('\n')
    );
  });

  it('nests a grouped section under its group name', () => {
    const source = serializeSchema(only(['date', 'time', 'orderName']));

    expect(source).toContain(['  when: {', '    date: Date | null;', '    time: Date | null;', '  };'].join('\n'));
    expect(source).toContain(['  when: {', '    date: null,', '    time: null', '  },', "  orderName: ''"].join('\n'));
  });

  it('declares a shared name once', () => {
    const definition = only(['orderName', 'phone']);
    const fields = definition.fields.map((field) => ({ ...field, name: 'shared' }));

    expect(serializeSchema({ ...definition, fields }).match(/ {2}shared: string;/g)?.length).toBe(1);
  });

  it('quotes a key that is not an identifier, and reads it through a bracket', () => {
    const definition = only(['orderName']);
    const source = serializeSchema({ ...definition, fields: [{ ...definition.fields[0]!, name: 'radio-group1' }] });

    expect(source).toContain("  'radio-group1': string;");
    expect(source).toContain("  metadata(path['radio-group1'], REQUIRED, () => true);");
  });

  // `[formField]` hands these to the field and rejects a binding to them beside it, so they are rules.
  it('states a field’s state, marker and limits as rules', () => {
    const definition = only(['orderName', 'spice', 'notes'], { validator: 'none' });
    const fields = definition.fields.map((field) =>
      field.id === 'orderName' ? { ...field, state: { ...field.state, readonly: true, disabled: true } } : field
    );

    expect(rules({ ...definition, fields })).toEqual([
      '  min(path.spice, 0);',
      '  max(path.spice, 4);',
      '  readonly(path.orderName);',
      '  disabled(path.orderName);',
      '  metadata(path.orderName, REQUIRED, () => true);',
      '  maxLength(path.notes, 200);'
    ]);
  });

  // `visibleWhen` names a field, not a path, so the group the watched field sits in is resolved here.
  it('states a condition as a hidden() rule, reading the watched field through its group', () => {
    const lines = rules(only(['pickup', 'address', 'method', 'cardNumber'], { validator: 'none' }));

    expect(lines).toContain('  hidden(path.address, (context) => context.valueOf(path.pickup) !== false);');
    expect(lines).toContain(
      "  hidden(path.payment.cardNumber, (context) => context.valueOf(path.payment.method) !== 'card');"
    );
  });

  // As on the stage: a condition naming a field that is no longer on the form renders rather than hides.
  it('states no condition on a field that is no longer on the form', () => {
    expect(rules(only(['address'], { validator: 'none' })).join('\n')).not.toContain('hidden(');
  });

  it('states the built-in mode’s rules, required() in place of the marker', () => {
    const definition = only(['orderName', 'phone', 'toppings'], { validator: 'angular' });
    const source = serializeSchema(definition);

    expect(rules(definition)).toEqual([
      '  required(path.orderName);',
      '  required(path.phone);',
      '  minLength(path.phone, 13);'
    ]);
    expect(source).not.toContain('REQUIRED');
    expect(source).not.toContain('vest');
  });

  it('runs a Vest suite through Standard Schema, and leaves its rules to the consumer', () => {
    const vest = serializeSchema(only(['date'], { validator: 'vest' }));

    expect(vest).toContain("import { create, mode, Modes } from 'vest';");
    expect(vest).toContain("test('when.date', 'Required.', () => enforce(model.when.date).isNotBlank())");
    // One suite per form: the schema runs once for each `form()`, and a suite carries state across forms.
    expect(vest).toContain('export function createMyFormSuite() {');
    expect(vest).toContain('  validateStandardSchema(path, createMyFormSuite());');
    expect(vest).not.toMatch(/^\s*test\(/m);

    expect(serializeSchema(only(['date'], { validator: 'none' }))).not.toContain('vest');
  });

  it('states the form’s own debounce, readonly and disabled on the root', () => {
    expect(rules(only([], { validator: 'none', debounce: 'blur', readonly: true, disabled: true }))).toEqual([
      "  debounce(path, 'blur');",
      '  readonly(path);',
      '  disabled(path);'
    ]);
    expect(rules(only([], { validator: 'none', debounce: 300 }))).toEqual(['  debounce(path, 300);']);
  });

  it('still produces a schema for a blank form', () => {
    const source = serializeSchema(only([], { validator: 'none' }));

    expect(source).toContain("import { schema } from '@angular/forms/signals';");
    expect(source).toContain('export interface MyFormModel {\n}');
    expect(source).toContain('export const myFormSchema = schema<MyFormModel>((path) => {\n});');
  });
});
