import { FIELD_KIND_VALUE_TYPES, PortalValueType } from '../model/field-capabilities';
import { PortalFieldSpec, PortalFormDefinition } from '../model/field-spec.model';
import { isIdentifier, presetHandlerName } from './markup-serializer';

/** What the shape holds for each value type, as source text. */
const SHAPE_LITERALS: Readonly<Record<PortalValueType, string>> = {
  'string': "''",
  'string[]': '[]',
  'Date': 'new Date()',
  'boolean': 'false',
  'number': '0'
};

/** One member of the model: a field, or a group holding fields. Groups come from a section's `groupName`. */
interface ModelNode {
  readonly name: string;
  readonly type?: PortalValueType;
  readonly children?: ModelNode[];
}

const key = (name: string): string => (isIdentifier(name) ? name : `'${name}'`);

/**
 * The model's members in section order, with a grouped section's fields nested under its group name.
 *
 * One key per name: two controls sharing a name share one value, and a duplicate key would not compile.
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
      for (const field of fields) {
        add(nodes, byName, { name: field.name, type: FIELD_KIND_VALUE_TYPES[field.kind] });
      }

      continue;
    }

    const existing = byName.get(section.groupName);
    const group: ModelNode = existing?.children ? existing : { name: section.groupName, children: [] };
    add(nodes, byName, group);

    const members = new Map(group.children!.map((child) => [child.name, child]));

    for (const field of fields) {
      add(group.children!, members, { name: field.name, type: FIELD_KIND_VALUE_TYPES[field.kind] });
    }
  }

  // A field whose section is not on the definition still belongs in the model, at the top level.
  for (const field of definition.fields) {
    if (!placed.has(field)) add(nodes, byName, { name: field.name, type: FIELD_KIND_VALUE_TYPES[field.kind] });
  }

  return nodes;
}

/** The interface's members, and — with `literals` — the shape's, which differ only in what follows the key. */
function memberLines(nodes: readonly ModelNode[], depth: number, literals: boolean): string[] {
  const pad = '  '.repeat(depth + 1);

  return nodes.flatMap((node, index) => {
    const tail = literals && index < nodes.length - 1 ? ',' : literals ? '' : ';';

    if (node.children) {
      return [`${pad}${key(node.name)}: {`, ...memberLines(node.children, depth + 1, literals), `${pad}}${tail}`];
    }

    return [`${pad}${key(node.name)}: ${literals ? SHAPE_LITERALS[node.type!] : node.type!}${tail}`];
  });
}

/**
 * A preset field's map and the handler the template binds to.
 *
 * The presets are the component's rather than the template's: they are data, and a template cannot hold a
 * map. That is also why a re-imported template arrives without them — see `user/studio.md`.
 */
function presetMembers(definition: PortalFormDefinition): string[] {
  return definition.fields
    .filter((field) => field.presets)
    .flatMap((field) => {
      const handler = presetHandlerName(field.name);
      const map = `${handler.replace(/^apply/, '').replace(/^./, (first) => first.toLowerCase())}s`;

      return [
        '',
        `  /** What each option of \`${field.name}\` writes into the rest of the model. */`,
        `  readonly ${map}: Record<string, Partial<MyForm>> = {`,
        ...presetEntries(field.presets!),
        '  };',
        '',
        `  ${handler}(value: string): void {`,
        `    this.model.update((model) => ({ ...model, ...this.${map}[value] }));`,
        '  }'
      ];
    });
}

/** One line per option, each a patch written as an object literal. */
function presetEntries(presets: Readonly<Record<string, Readonly<Record<string, unknown>>>>): string[] {
  const entries = Object.entries(presets);

  return entries.map(([option, patch], index) => {
    const members = Object.entries(patch)
      .map(([name, value]) => `${key(name)}: ${literal(value)}`)
      .join(', ');

    return `    ${key(option)}: { ${members} }${index < entries.length - 1 ? ',' : ''}`;
  });
}

/** A preset value as source text. The value types are the field value types, so this covers all of them. */
function literal(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`;
  if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
  if (value instanceof Date) return `new Date('${value.toISOString()}')`;

  return String(value);
}

/** The first leaf's dotted path, which the suite skeleton names as its example target. */
function firstPath(nodes: readonly ModelNode[], prefix = ''): string | null {
  for (const node of nodes) {
    const path = prefix ? `${prefix}.${node.name}` : node.name;

    if (!node.children) return path;

    const nested = firstPath(node.children, path);
    if (nested) return nested;
  }

  return null;
}

/**
 * A component for the exported template to bind to: the model, its shape and, under Vest, a suite.
 *
 * A proposal rather than a requirement. It lays the pieces out the way `user/validation.md` does, and any
 * component providing `model` and `shape` — and `suite` under Vest — serves the template just as well. The
 * Studio has no rule editor, so the suite is a skeleton and the rules are the consumer's.
 */
export function serializeComponent(definition: PortalFormDefinition): string {
  const vest = definition.options.validator === 'vest';
  const nodes = modelTree(definition);
  const counter = definition.fields.some((field) => field.kind === 'counter');
  const example = firstPath(nodes) ?? 'name';
  const exampleRead = example
    .split('.')
    .map((step) => (isIdentifier(step) ? `.${step}` : `['${step}']`))
    .join('');

  return [
    "import { Component, signal } from '@angular/core';",
    "import { DeepPartial, DeepRequired, NgxFormidableModule } from '@cynthion/ngx-formidable';",
    ...(vest
      ? [
          "import { NgxFormidableVestValidatorDirective } from '@cynthion/ngx-formidable/vest';",
          "import { create, mode, Modes, only, Suite } from 'vest';"
        ]
      : []),
    '',
    'export interface MyForm {',
    ...memberLines(nodes, 0, false),
    '}',
    '',
    'export type MyFormModel = DeepPartial<MyForm>;',
    'export type MyFormShape = DeepRequired<MyFormModel>;',
    '',
    '/** Every key the model may carry. A dev-mode typo check, not a validator. */',
    'export const myFormShape: MyFormShape = {',
    ...memberLines(nodes, 0, true),
    '};',
    ...(vest
      ? [
          '',
          'export const myFormSuite: Suite<string, string, (model: MyFormModel, field?: string) => void> = create(',
          '  (model: MyFormModel, field?: string) => {',
          "    mode(Modes.ALL); // every failing rule, not only a target's first",
          '',
          '    if (field) {',
          '      only(field); // the form validates one target at a time',
          '    }',
          '',
          '    // Your rules, for example:',
          `    // test('${example}', 'Required.', () => {`,
          `    //   enforce(model${exampleRead}).isNotBlank();`,
          '    // });',
          '  }',
          ');'
        ]
      : []),
    '',
    '@Component({',
    "  selector: 'app-my-form',",
    "  templateUrl: './my-form.component.html',",
    ...(counter
      ? ["  // <example-counter-field> is the Studio's own custom field: import yours, see user/custom-fields.md"]
      : []),
    `  imports: [NgxFormidableModule${vest ? ', NgxFormidableVestValidatorDirective' : ''}]`,
    '})',
    'export class MyFormComponent {',
    '  readonly model = signal<MyFormModel>({});',
    '  readonly shape = myFormShape;',
    ...(vest ? ['  readonly suite = myFormSuite;'] : []),
    ...presetMembers(definition),
    '}',
    ''
  ].join('\n');
}
