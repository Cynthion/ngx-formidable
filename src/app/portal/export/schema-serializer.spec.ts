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
  const open = 'schema<ExampleFormModel>((path) => {\n';
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
        'export interface ExampleFormModel {',
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
        'export const initialExampleFormModel: ExampleFormModel = {',
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

  // The sample's rules in form order, each in Angular's own terms, after the fields' own settings.
  it('writes the rules as Angular’s own, required() in place of the marker', () => {
    const definition = only(['orderName', 'phone', 'toppings', 'notes'], { validator: 'angular' });
    const source = serializeSchema(definition);

    expect(rules(definition)).toEqual([
      '  maxLength(path.notes, 200);',
      "  maxLength(path.toppings, 5, { message: 'Five toppings is the limit.' });",
      "  required(path.orderName, { message: 'We need a name for the order.' });",
      "  required(path.phone, { message: 'A phone number is required.' });",
      "  pattern(path.phone, /^\\d{10}$/, { message: 'A phone number is ten digits.' });"
    ]);
    expect(source).toContain('  maxLength(path.notes, 200);\n\n  maxLength(path.toppings');
    expect(source).not.toContain('REQUIRED');
    expect(source).not.toContain('vest');
    expect(source).not.toContain('zod');
  });

  it('writes a check across fields as validate() on the path it reports on', () => {
    const source = serializeSchema(only(['sauce', 'toppings'], { validator: 'angular' }));

    expect(source).toContain(
      [
        '  validate(path, (context) => {',
        '    const model = context.valueOf(path);',
        '',
        "    return !(model.sauce === 'bbq' && model.toppings.includes('pineapple'))",
        '      ? undefined',
        "      : { kind: 'pineappleOnBbq', message: 'Pineapple on a BBQ base is a combination this kitchen refuses.' };",
        '  });'
      ].join('\n')
    );
  });

  // The Monday rule reads the date, the opening hours the time: with only the date, only the first is there.
  it('leaves out a rule whose fields are not all on the form', () => {
    const lines = rules(only(['date'], { validator: 'angular' }));

    expect(lines).toContain('  validate(path.when, (context) => {');
    expect(lines.join('\n')).toContain('closedOnMondays');
    expect(lines.join('\n')).not.toContain('openingHours');
    expect(rules(only(['toppings'], { validator: 'angular' })).join('\n')).not.toContain('pineappleOnBbq');
  });

  // A number at the phone's path: a phone rule on it would not compile.
  it('leaves out a rule whose field writes another type than the sample’s', () => {
    const definition = only(['quantity'], { validator: 'angular' });
    const fields = definition.fields.map((field) => ({ ...field, name: 'phone' }));

    expect(rules({ ...definition, fields })).toEqual(['  min(path.phone, 1);', '  max(path.phone, 10);']);
  });

  // Neither Vest nor Zod can tell Signal Forms a field is required, so the schema marks it beside them.
  it('writes the rules into a Vest suite, one per form, and marks what it requires', () => {
    const vest = serializeSchema(only(['orderName', 'email', 'sauce', 'toppings'], { validator: 'vest' }));

    expect(vest).toContain("import { create, enforce, mode, Modes, omitWhen, test } from 'vest';");
    expect(vest).toContain('export function createExampleSuite() {\n  return create((model: ExampleFormModel) => {');
    expect(vest).toContain(
      [
        "    test('email', 'An email address is required.', () => {",
        '      enforce(model.email).isNotEmpty();',
        '    });',
        '',
        '    omitWhen(!model.email, () => {',
        "      test('email', 'That does not look like an email address.', () => {",
        '        enforce(model.email).matches(/^[^@\\s]+@[^@\\s.]+\\.[^@\\s]+$/);',
        '      });',
        '    });'
      ].join('\n')
    );
    expect(vest).toContain("    test('', 'Pineapple on a BBQ base is a combination this kitchen refuses.', () => {");
    expect(vest).toContain('  metadata(path.orderName, REQUIRED, () => true);');
    expect(vest).toContain('  validateStandardSchema(path, createExampleSuite());');
    expect(vest).not.toContain('required(');
    expect(vest).not.toContain('zod');
  });

  it('writes the rules into a Zod schema, a check across fields as a refinement of the whole', () => {
    const zod = serializeSchema(only(['date', 'time', 'orderName', 'sauce'], { validator: 'zod' }));

    expect(zod).toContain("import * as z from 'zod';");
    expect(zod).toContain(
      [
        'export const exampleZodSchema = z',
        '  .object({',
        "    sauce: z.string().nullable().refine((value) => !!value, 'Pick a sauce.'),",
        '    when: z.object({',
        '      date: z.date().nullable(),',
        '      time: z.date().nullable()',
        '    }),',
        "    orderName: z.string().min(1, 'We need a name for the order.')",
        '  })'
      ].join('\n')
    );
    expect(zod).toContain(
      [
        '  .refine((model) => model.when.date?.getDay() !== 1, {',
        "    error: 'We are closed on Mondays.',",
        "    path: ['when']",
        '  });'
      ].join('\n')
    );
    expect(zod).toContain('  metadata(path.sauce, REQUIRED, () => true);');
    expect(zod).toContain('  validateStandardSchema(path, exampleZodSchema);');
    expect(zod).not.toContain('vest');
  });

  it('writes no checks and imports no validator without one', () => {
    const none = serializeSchema(only(['orderName', 'email'], { validator: 'none' }));

    expect(rules(only(['orderName', 'email'], { validator: 'none' }))).toEqual([
      '  metadata(path.orderName, REQUIRED, () => true);',
      '  metadata(path.email, REQUIRED, () => true);'
    ]);
    expect(none).not.toContain('vest');
    expect(none).not.toContain('zod');
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
    expect(source).toContain('export interface ExampleFormModel {\n}');
    expect(source).toContain('export const exampleSchema = schema<ExampleFormModel>((path) => {\n});');
  });
});
