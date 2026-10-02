import { emptyValueOf, FIELD_KIND_VALUE_TYPES, PortalValueType } from '../model/field-capabilities';
import { PortalFieldSpec, PortalFormDefinition, PortalValidatorKind } from '../model/field-spec.model';
import { fieldsOf, PortalRule, rulesOn } from '../model/preview-form.validation';
import { pathOf } from '../helpers/model-path.helpers';
import { ALL_FIELD_ATTRIBUTES } from './markup-attributes';
import { accessOf, isIdentifier } from './markup-serializer';

/** One member of the model: a field, or a group holding fields. Groups come from a section's `groupName`. */
interface ModelNode {
  readonly name: string;
  readonly field?: PortalFieldSpec;
  readonly children?: ModelNode[];
}

const key = (name: string): string => (isIdentifier(name) ? name : `'${name}'`);

/**
 * The model's members in section order, with a grouped section's fields nested under its group name.
 *
 * One key per name: two fields sharing a name share one value, and a duplicate key would not compile.
 */
function modelTree(definition: PortalFormDefinition): ModelNode[] {
  const nodes: ModelNode[] = [];
  const byName = new Map<string, ModelNode>();
  const placed = new Set<PortalFieldSpec>();

  const add = (into: ModelNode[], names: Map<string, ModelNode>, node: ModelNode): void => {
    if (names.has(node.name)) return;

    names.set(node.name, node);
    into.push(node);
  };

  for (const section of definition.sections) {
    const fields = definition.fields.filter((field) => field.sectionId === section.id);
    if (!fields.length) continue;

    fields.forEach((field) => placed.add(field));

    if (!section.groupName) {
      for (const field of fields) add(nodes, byName, { name: field.name, field });

      continue;
    }

    const existing = byName.get(section.groupName);
    const group: ModelNode = existing?.children ? existing : { name: section.groupName, children: [] };
    add(nodes, byName, group);

    const members = new Map(group.children!.map((child) => [child.name, child]));

    for (const field of fields) add(group.children!, members, { name: field.name, field });
  }

  // A field whose section is not on the definition still belongs in the model, at the top level.
  for (const field of definition.fields) {
    if (!placed.has(field)) add(nodes, byName, { name: field.name, field });
  }

  return nodes;
}

/** What a key starts as, as source text. */
function emptyValue(field: PortalFieldSpec): string {
  const value = emptyValueOf(field);

  return Array.isArray(value) ? '[]' : value === null ? 'null' : literal(value);
}

/** The interface's members, and — with `values` — the initial model's, which differ only after the key. */
function memberLines(nodes: readonly ModelNode[], depth: number, values: boolean): string[] {
  const pad = '  '.repeat(depth + 1);

  return nodes.flatMap((node, index) => {
    const tail = values && index < nodes.length - 1 ? ',' : values ? '' : ';';

    if (node.children) {
      return [`${pad}${key(node.name)}: {`, ...memberLines(node.children, depth + 1, values), `${pad}}${tail}`];
    }

    const member = values ? emptyValue(node.field!) : FIELD_KIND_VALUE_TYPES[node.field!.kind];

    return [`${pad}${key(node.name)}: ${member}${tail}`];
  });
}

function literal(value: string | number | boolean): string {
  return typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value);
}

/**
 * One field's rules, in the order the preview's schema states them: its state, its required marker, its
 * limits, and its condition. A field the validator checks as required takes its marker from the checks.
 *
 * A condition naming a field that is no longer on the form states no rule, so the field renders — as it does
 * on the stage.
 */
function fieldRules(spec: PortalFieldSpec, path: string, definition: PortalFormDefinition, checked: boolean): string[] {
  const target = accessOf('path', path);
  const rules: string[] = [];

  if (spec.state.readonly) rules.push(`readonly(${target});`);
  if (spec.state.disabled) rules.push(`disabled(${target});`);
  if (spec.decoration.markRequired && !checked) rules.push(`metadata(${target}, REQUIRED, () => true);`);

  for (const attribute of ALL_FIELD_ATTRIBUTES) {
    const value = attribute.rule ? attribute.read(spec) : null;

    if (value !== null) rules.push(`${attribute.name}(${target}, ${value});`);
  }

  const condition = spec.visibleWhen;
  const watched = condition && definition.fields.find((field) => field.name === condition.field);

  if (condition && watched) {
    const source = accessOf('path', pathOf(watched.name, groupOf(watched, definition)));

    // Not `({ valueOf }) => valueOf(…)`: angular-eslint 22.5's `reactive-context-must-read-signal` looks a
    // bare call's name up on a plain object, finds `Object.prototype.valueOf` and crashes the whole lint run.
    rules.push(`hidden(${target}, (context) => context.valueOf(${source}) !== ${literal(condition.equals)});`);
  }

  return rules;
}

function groupOf(spec: PortalFieldSpec, definition: PortalFormDefinition): string | undefined {
  return definition.sections.find((section) => section.id === spec.sectionId)?.groupName;
}

/** The form's own rules, which a rule on the root hands to every field under it. */
function rootRules(definition: PortalFormDefinition): string[] {
  const { options } = definition;
  const rules: string[] = [];

  if (options.debounce !== 0) rules.push(`debounce(path, ${literal(options.debounce)});`);
  if (options.readonly) rules.push('readonly(path);');
  if (options.disabled) rules.push('disabled(path);');

  return rules;
}

/** One import, on one line where it fits the 120 columns and one name per line where it does not. */
export function importLines(names: readonly string[], from: string): string[] {
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  const line = `import { ${sorted.join(', ')} } from '${from}';`;

  if (line.length <= 120) return [line];

  return [
    'import {',
    ...sorted.map((name, index) => `  ${name}${index < sorted.length - 1 ? ',' : ''}`),
    `} from '${from}';`
  ];
}

/** Indents every line of a block that has text, so a blank line inside it stays blank. */
function indent(lines: readonly string[], depth: number): string[] {
  return lines.flatMap((line) => line.split('\n')).map((line) => (line ? `${'  '.repeat(depth)}${line}` : line));
}

/** The rules as Angular's own: `required()` marks the field it checks, and `pattern()` leaves `''` alone. */
function angularChecks(rules: readonly PortalRule[]): string[] {
  return rules.map(({ target, message, check }) => {
    // The whole form is the root itself.
    const access = target ? accessOf('path', target) : 'path';
    const text = `{ message: ${literal(message)} }`;

    switch (check.kind) {
      case 'required':
        return `required(${access}, ${text});`;
      case 'pattern':
        return `pattern(${access}, ${String(check.pattern)}, ${text});`;
      case 'maxItems':
        return `maxLength(${access}, ${check.max}, ${text});`;
      case 'cross':
        return [
          `validate(${access}, (context) => {`,
          '  const model = context.valueOf(path);',
          '',
          `  return ${check.source}`,
          '    ? undefined',
          `    : { kind: '${check.name}', message: ${literal(message)} };`,
          '});'
        ].join('\n');
    }
  });
}

/** One rule as a Vest test, reading the suite's `model`. */
function vestTest({ target, message, check }: PortalRule): string[] {
  const value = accessOf('model', target);
  const open = `test(${literal(target)}, ${literal(message)}, () => {`;

  switch (check.kind) {
    case 'required':
      return [open, `  enforce(${value}).isNotEmpty();`, '});'];
    case 'pattern':
      return [
        `omitWhen(!${value}, () => {`,
        `  ${open}`,
        `    enforce(${value}).matches(${String(check.pattern)});`,
        '  });',
        '});'
      ];
    case 'maxItems':
      return [open, `  enforce(${value}).shorterThanOrEquals(${check.max});`, '});'];
    case 'cross':
      return [
        ...(target ? [] : ['// An empty target reports on the whole form.']),
        open,
        `  enforce(${check.source}).isTruthy();`,
        '});'
      ];
  }
}

/** The rules as a Vest suite, created per form because a suite carries state across the forms it runs for. */
function vestSuite(rules: readonly PortalRule[]): string[] {
  return [
    '/**',
    " * The form's checks, as a Vest suite run through Standard Schema. A suite carries state across every form",
    ' * it has run for, so each form creates its own.',
    ' */',
    'export function createMyFormSuite() {',
    `  return create((${rules.length ? 'model: MyFormModel' : ''}) => {`,
    "    mode(Modes.ALL); // every failing rule, not only a field's first",
    ...indent(
      rules.flatMap((rule) => ['', ...vestTest(rule)]),
      2
    ),
    '  });',
    '}'
  ];
}

/** A key's Zod type, from what its field writes. */
const ZOD_TYPES: Readonly<Record<PortalValueType, string>> = {
  'string': 'z.string()',
  'string | null': 'z.string().nullable()',
  'string[]': 'z.array(z.string())',
  'Date | null': 'z.date().nullable()',
  'boolean': 'z.boolean()',
  'number': 'z.number()'
};

/** One field check, chained onto its key's Zod type. A format check leaves `''` to the required check. */
function zodCheck(type: PortalValueType, { message, check }: PortalRule): string {
  switch (check.kind) {
    case 'required':
      return type === 'string' ? `.min(1, ${literal(message)})` : `.refine((value) => !!value, ${literal(message)})`;
    case 'pattern':
      return `.refine((value) => !value || ${String(check.pattern)}.test(value), ${literal(message)})`;
    case 'maxItems':
      return `.max(${check.max}, ${literal(message)})`;
    default:
      return '';
  }
}

/** One entry per line of a list, each but the last ending in a comma. A multi-line entry takes it on its last. */
function commas(entries: readonly string[]): string[] {
  return entries.map((entry, index) => (index < entries.length - 1 ? `${entry},` : entry));
}

/**
 * The rules as a Zod schema. Its keys are the fields the rules read, in form order and nested under a group
 * as the model is; a check across fields refines the whole, reporting on the path it names.
 */
function zodSchema(rules: readonly PortalRule[], fields: readonly PlacedField[]): string[] {
  const read = new Set(rules.flatMap(fieldsOf));
  const shape = new Map<string, string | Map<string, string>>();

  for (const { spec, path } of fields.filter((field) => read.has(field.path))) {
    const type = FIELD_KIND_VALUE_TYPES[spec.kind];
    const checks = rules.filter((rule) => rule.target === path).map((rule) => zodCheck(type, rule));
    // A key with more than one check takes one line per check, which is where a second one would not fit.
    const expression =
      checks.length > 1
        ? [ZOD_TYPES[type], ...checks.map((check) => `  ${check}`)].join('\n')
        : `${ZOD_TYPES[type]}${checks.join('')}`;
    const [head, leaf] = path.split('.') as [string, string?];
    const group = shape.get(head);

    if (leaf === undefined) shape.set(head, expression);
    else if (group instanceof Map) group.set(leaf, expression);
    else shape.set(head, new Map([[leaf, expression]]));
  }

  const members = [...shape].map(([name, value]) =>
    typeof value === 'string'
      ? `${key(name)}: ${value}`
      : [
          `${key(name)}: z.object({`,
          ...indent(commas([...value].map(([member, type]) => `${key(member)}: ${type}`)), 1),
          '})'
        ].join('\n')
  );

  const refinements = rules.flatMap(({ target, message, check }) =>
    check.kind === 'cross'
      ? [
          `.refine((model) => ${check.source}, {`,
          ...indent(
            commas([
              `error: ${literal(message)}`,
              ...(target ? [`path: [${target.split('.').map(literal).join(', ')}]`] : [])
            ]),
            1
          ),
          '})'
        ]
      : []
  );

  const object = members.length ? ['object({', ...indent(commas(members), 1), '})'] : ['object({})'];

  return [
    '/**',
    " * The form's checks, as a Zod schema run through Standard Schema. It holds no state, so one serves every",
    ' * form. A check across fields refines the whole, and reports on the path it names.',
    ' */',
    ...(refinements.length
      ? ['export const myFormZodSchema = z', ...indent([`.${object[0]}`, ...object.slice(1), ...refinements], 1)]
      : [`export const myFormZodSchema = z.${object[0]}`, ...object.slice(1)]
    ).map((line, index, lines) => (index === lines.length - 1 ? `${line};` : line))
  ];
}

/** A field of the form with its model path, in section order: the order the schema states the rules in. */
interface PlacedField {
  readonly spec: PortalFieldSpec;
  readonly path: string;
}

/**
 * The rules the validator writes into the schema. Angular's are rules of the schema itself; Vest and Zod run
 * beside it through Standard Schema, and neither can tell Signal Forms a field is required, so the schema
 * marks those fields itself.
 */
function validatorRules(validator: PortalValidatorKind, rules: readonly PortalRule[]): string[] {
  if (validator === 'none') return [];
  if (validator === 'angular') return angularChecks(rules);

  return [
    ...rules
      .filter((rule) => rule.check.kind === 'required')
      .map((rule) => `metadata(${accessOf('path', rule.target)}, REQUIRED, () => true);`),
    `validateStandardSchema(path, ${validator === 'vest' ? 'createMyFormSuite()' : 'myFormZodSchema'});`
  ];
}

/**
 * The form file, `my-form.form.ts`: the model, the initial model and the schema over it.
 *
 * Everything the stage runs as a rule is here, because `[formField]` hands a field its state from the schema
 * and rejects a binding to it beside it — readonly, disabled, required and the limits alike. The sample's
 * checks follow, as the validator spells them: Angular's rules in the schema, or a Vest suite or a Zod schema
 * above it, run through Standard Schema.
 */
export function serializeSchema(definition: PortalFormDefinition): string {
  const { validator } = definition.options;
  const nodes = modelTree(definition);

  const fields: PlacedField[] = definition.sections.flatMap((section) =>
    definition.fields
      .filter((field) => field.sectionId === section.id)
      .map((spec) => ({ spec, path: pathOf(spec.name, section.groupName) }))
  );

  const types = new Map(fields.map(({ spec, path }) => [path, FIELD_KIND_VALUE_TYPES[spec.kind]]));
  const checks = validator === 'none' ? [] : rulesOn(types);
  const checked = new Set(checks.filter((rule) => rule.check.kind === 'required').map((rule) => rule.target));

  const settings = [
    ...rootRules(definition),
    ...fields.flatMap(({ spec, path }) => fieldRules(spec, path, definition, checked.has(path)))
  ];
  const written = validatorRules(validator, checks);
  const rules = [...settings, ...written];

  const used = new Set(rules.map((rule) => rule.slice(0, rule.indexOf('('))));
  if (rules.some((rule) => rule.includes('REQUIRED'))) used.add('REQUIRED');

  const vest = ['create', 'mode', 'Modes'];
  if (checks.length) vest.push('enforce', 'test');
  if (checks.some((rule) => rule.check.kind === 'pattern')) vest.push('omitWhen');

  return [
    ...importLines(['schema', ...used], '@angular/forms/signals'),
    ...(validator === 'vest' ? importLines(vest, 'vest') : []),
    ...(validator === 'zod' ? ["import * as z from 'zod';"] : []),
    '',
    '/** What the form edits: one key per field, and a grouped section nested under its group name. */',
    'export interface MyFormModel {',
    ...memberLines(nodes, 0, false),
    '}',
    '',
    '/** Every key defined, because Signal Forms drops an `undefined` one and binds a field only to a key. */',
    'export const myFormInitialModel: MyFormModel = {',
    ...memberLines(nodes, 0, true),
    '};',
    ...(validator === 'vest' ? ['', ...vestSuite(checks)] : []),
    ...(validator === 'zod' ? ['', ...zodSchema(checks, fields)] : []),
    '',
    "/** Each field's state, limits, condition and rules, which `[formField]` hands to the field. */",
    'export const myFormSchema = schema<MyFormModel>((path) => {',
    ...indent([...settings, ...(settings.length && written.length ? [''] : []), ...written], 1),
    '});',
    ''
  ].join('\n');
}
