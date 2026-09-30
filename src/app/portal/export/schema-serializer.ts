import { FIELD_KIND_VALUE_TYPES, PortalValueType } from '../model/field-capabilities';
import { PortalFieldSpec, PortalFormDefinition } from '../model/field-spec.model';
import { ANGULAR_MIN_LENGTHS, ANGULAR_REQUIRED_FIELDS } from '../model/preview-form.validation';
import { pathOf } from '../helpers/model-path.helpers';
import { ALL_FIELD_ATTRIBUTES } from './markup-attributes';
import { accessOf, isIdentifier } from './markup-serializer';

/** What a key starts as, for each value type, as source text. A number starts at its field's `min` instead. */
const EMPTY_VALUES: Readonly<Record<PortalValueType, string>> = {
  'string': "''",
  'string | null': 'null',
  'string[]': '[]',
  'Date | null': 'null',
  'boolean': 'false',
  'number': '0'
};

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

function emptyValue(field: PortalFieldSpec): string {
  const type = FIELD_KIND_VALUE_TYPES[field.kind];

  return type === 'number' ? String(field.min ?? 0) : EMPTY_VALUES[type];
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

/** The first leaf's dotted path, which the suite names as its example target. */
function firstPath(nodes: readonly ModelNode[], prefix = ''): string | null {
  for (const node of nodes) {
    const path = prefix ? `${prefix}.${node.name}` : node.name;

    if (!node.children) return path;

    const nested = firstPath(node.children, path);
    if (nested) return nested;
  }

  return null;
}

function literal(value: string | number | boolean): string {
  return typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value);
}

/**
 * One field's rules, in the order the preview's schema states them: its state, its required marker or the
 * built-in mode's `required()`, its limits, and its condition.
 *
 * A condition naming a field that is no longer on the form states no rule, so the field renders — as it does
 * on the stage.
 */
function fieldRules(spec: PortalFieldSpec, path: string, definition: PortalFormDefinition): string[] {
  const target = accessOf('path', path);
  const angular = definition.options.validator === 'angular';
  const rules: string[] = [];

  if (spec.state.readonly) rules.push(`readonly(${target});`);
  if (spec.state.disabled) rules.push(`disabled(${target});`);

  if (angular && ANGULAR_REQUIRED_FIELDS.has(spec.name)) rules.push(`required(${target});`);
  else if (spec.decoration.markRequired) rules.push(`metadata(${target}, REQUIRED, () => true);`);

  for (const attribute of ALL_FIELD_ATTRIBUTES) {
    const value = attribute.rule ? attribute.read(spec) : null;

    if (value !== null) rules.push(`${attribute.name}(${target}, ${value});`);
  }

  const length = angular ? ANGULAR_MIN_LENGTHS.get(spec.name) : undefined;
  if (length) rules.push(`minLength(${target}, ${length});`);

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

/**
 * The form file, `my-form.form.ts`: the model, the initial model and the schema over it.
 *
 * Everything the stage runs as a rule is here, because `[formField]` hands a field its state from the schema
 * and rejects a binding to it beside it — readonly, disabled, required and the limits alike. Under Vest the
 * suite is a skeleton, since the Studio has no rule editor; under Angular's built-in rules, they are stated.
 */
export function serializeSchema(definition: PortalFormDefinition): string {
  const vest = definition.options.validator === 'vest';
  const nodes = modelTree(definition);

  const rules = [...rootRules(definition)];

  for (const section of definition.sections) {
    for (const field of definition.fields.filter((candidate) => candidate.sectionId === section.id)) {
      rules.push(...fieldRules(field, pathOf(field.name, section.groupName), definition));
    }
  }

  if (vest) rules.push('validateStandardSchema(path, createMyFormSuite());');

  const used = new Set(rules.map((rule) => rule.slice(0, rule.indexOf('('))));
  if (rules.some((rule) => rule.includes('REQUIRED'))) used.add('REQUIRED');

  const example = firstPath(nodes) ?? 'name';

  return [
    ...importLines(['schema', ...used], '@angular/forms/signals'),
    ...(vest ? ["import { create, mode, Modes } from 'vest';"] : []),
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
    ...(vest
      ? [
          '',
          '/**',
          ' * Your rules, run through Standard Schema. A suite carries state across every form it has run for, so',
          ' * each form creates its own. The Studio has no rule editor, so there are none yet: give the callback its',
          ` * \`model: MyFormModel\` and add them, for example`,
          ` * \`test('${example}', 'Required.', () => enforce(${accessOf('model', example)}).isNotBlank())\`.`,
          ' */',
          'export function createMyFormSuite() {',
          '  return create(() => {',
          "    mode(Modes.ALL); // every failing rule, not only a field's first",
          '  });',
          '}'
        ]
      : []),
    '',
    "/** Each field's state, limits, condition and rules, which `[formField]` hands to the field. */",
    'export const myFormSchema = schema<MyFormModel>((path) => {',
    ...rules.map((rule) => `  ${rule}`),
    '});',
    ''
  ].join('\n');
}
