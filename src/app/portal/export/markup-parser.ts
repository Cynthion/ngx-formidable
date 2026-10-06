import { FieldAdornmentAlignment, FieldLabelPosition } from '@cynthion/ngx-formidable';
import { FIELD_CAPABILITIES, FIELD_KIND_BY_SELECTOR } from '../model/field-capabilities';
import {
  DEFAULT_DECORATION,
  DEFAULT_STATE,
  LABEL_POSITION_LABELS,
  PortalFieldDecoration,
  PortalFieldSpec,
  PortalFieldState,
  PortalOptionSpec,
  PortalSectionSpec
} from '../model/field-spec.model';
import { pathOf } from '../helpers/model-path.helpers';
import { slugify } from '../helpers/slug.helpers';
import { ATTRIBUTES_BY_LOWER_NAME, unquote } from './markup-attributes';

interface MarkupParseNote {
  readonly text: string;
  readonly reason:
    'unknown-element' | 'unknown-attribute' | 'dynamic-binding' | 'control-flow' | 'in-the-component' | 'in-the-schema';
}

export interface MarkupParseResult {
  readonly sections: readonly PortalSectionSpec[];
  readonly fields: readonly PortalFieldSpec[];
  readonly notes: readonly MarkupParseNote[];
}

// An imported field shows no label until a `formidableFieldLabel` is found for it, which is the one place
// the import differs from the defaults every other field starts at.
const DECORATION: PortalFieldDecoration = { ...DEFAULT_DECORATION, showLabel: false };

const STATE: PortalFieldState = DEFAULT_STATE;

const LABEL_POSITIONS = Object.keys(LABEL_POSITION_LABELS) as readonly FieldLabelPosition[];

const FALLBACK_SECTION: PortalSectionSpec = { id: 'imported', title: 'Imported' };

/** One step of a model path: `.name`, or `['radio-group1']` for a key that is not an identifier. */
const STEP = /\.[A-Za-z_$][\w$]*|\['[^']*'\]/g;

/** The `@if` the serializer writes around a conditional field. Its condition is a `hidden()` rule. */
const HIDDEN_GATE = /^!form((?:\.[A-Za-z_$][\w$]*|\['[^']*'\])+)\(\)\.hidden\(\)$/;

/** A field as the schema names it, `path.when.date`. The bare `path` is the form's own, and no field's. */
const TARGET = String.raw`path((?:${STEP.source})+)`;

/**
 * The rules `schema-serializer.ts` writes for one field, one statement to a line: its state, its required
 * marker, a limit and its condition. A required check marks the field it checks, which is why the export
 * leaves the marker off such a field. A limit takes exactly two arguments, so a check with a message is none.
 */
const STATE_RULE = new RegExp(String.raw`^(readonly|disabled)\(${TARGET}\);$`);
const REQUIRED_RULE = new RegExp(
  String.raw`^(?:metadata|required)\(${TARGET}, (?:REQUIRED, \(\) => true|\{ message: .*\})\);$`
);
const LIMIT_RULE = new RegExp(String.raw`^(\w+)\(${TARGET}, (-?\d+(?:\.\d+)?)\);$`);
const CONDITION_RULE = new RegExp(
  String.raw`^hidden\(${TARGET}, \(context\) => context\.valueOf\(${TARGET}\) !== ('(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|true|false)\);$`
);

/** What one of the schema's rules sets on its field: some of the field's own members, state or decoration. */
type FieldRule = Partial<Omit<PortalFieldSpec, 'state' | 'decoration'>> & {
  readonly state?: Partial<PortalFieldState>;
  readonly decoration?: Partial<PortalFieldDecoration>;
};

function slugOf(title: string): string {
  return slugify(title) || 'imported';
}

/** The keys a run of steps names: `.when.date` is `when`, then `date`. */
function keysOf(steps: string): readonly string[] {
  return (steps.match(STEP) ?? []).map((step) => (step.startsWith('.') ? step.slice(1) : step.slice(2, -2)));
}

/** The keys of a `[formField]` path off the field tree, `form.when.date`, or `null` for any other expression. */
function fieldPathOf(expression: string): readonly string[] | null {
  const match = /^form((?:\.[A-Za-z_$][\w$]*|\['[^']*'\])+)$/.exec(expression.trim());

  return match ? keysOf(match[1]!) : null;
}

/** A condition's value as the serializer's `literal()` writes it: a quoted string, a number or a boolean. */
function literalValue(literal: string): string | number | boolean {
  if (literal.startsWith("'")) return literal.slice(1, -1).replace(/\\'/g, "'");
  if (literal === 'true' || literal === 'false') return literal === 'true';

  return Number(literal);
}

/**
 * Each field's rules in the schema, keyed by its model path. Only the grammar the serializer writes for a field
 * is read: the checks are the validator's, which writes them again, and a rule on the root is a form setting.
 */
function readSchema(source: string): ReadonlyMap<string, readonly FieldRule[]> {
  const rules = new Map<string, FieldRule[]>();

  const add = (steps: string, rule: FieldRule): void => {
    const path = keysOf(steps).join('.');

    rules.set(path, [...(rules.get(path) ?? []), rule]);
  };

  for (const line of source.split('\n').map((text) => text.trim())) {
    const state = STATE_RULE.exec(line);
    const required = REQUIRED_RULE.exec(line);
    const limit = LIMIT_RULE.exec(line);
    const condition = CONDITION_RULE.exec(line);
    // The attribute table marks the inputs `[formField]` owns, which are the limits the schema states.
    const attribute = limit ? ATTRIBUTES_BY_LOWER_NAME.get(limit[1]!.toLowerCase()) : undefined;

    if (state) add(state[2]!, state[1] === 'readonly' ? { state: { readonly: true } } : { state: { disabled: true } });
    else if (required) add(required[1]!, { decoration: { markRequired: true } });
    else if (limit && attribute?.rule) add(limit[2]!, attribute.write(limit[3]!));
    else if (condition) {
      const field = keysOf(condition[2]!).at(-1)!;

      add(condition[1]!, { visibleWhen: { field, equals: literalValue(condition[3]!) } });
    }
  }

  return rules;
}

function withRule(field: PortalFieldSpec, rule: FieldRule): PortalFieldSpec {
  return {
    ...field,
    ...rule,
    state: { ...field.state, ...rule.state },
    decoration: { ...field.decoration, ...rule.decoration }
  };
}

/**
 * Takes out every `@if` gating a field on its `hidden()` state. The condition behind it is a rule in the
 * schema, so a gate is noted unless the schema pasted beside the template states it: without one the field
 * comes back unconditional.
 *
 * A line pass before the `DOMParser`, because `@if` is Angular's own syntax and not markup: the parser reads
 * the braces as text. Any other `@if` is left exactly where it is, so it still reaches the control-flow note.
 */
function stripHiddenGates(source: string, notes: MarkupParseNote[], conditioned: (path: string) => boolean): string {
  const output: string[] = [];
  // One frame per `@if`, holding whether this pass took it out, so the matching `}` goes the same way.
  const frames: boolean[] = [];

  for (const line of source.split('\n')) {
    const opened = /^\s*@if\s*\((.+)\)\s*\{\s*$/.exec(line);

    if (opened) {
      const expression = opened[1]!.trim();
      const gate = HIDDEN_GATE.exec(expression);
      frames.push(!!gate);

      if (!gate) output.push(line);
      else if (!conditioned(keysOf(gate[1]!).join('.'))) {
        notes.push({ text: `@if (${expression})`, reason: 'in-the-schema' });
      }

      continue;
    }

    if (/^\s*\}\s*$/.test(line) && frames.length) {
      if (!frames.pop()) output.push(line);

      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

/**
 * Parses a pasted Angular template back into a whole form: its sections and their fields.
 *
 * It handles a **static, attribute-only subset**: one `formidable-field-decorator` per field bound by
 * `[formField]`, with literal attributes and one-way bindings to literals. Bindings to expressions and control
 * flow are out of scope and are reported rather than failing silently, because a template that half-imports
 * is worse than one that says what it dropped.
 *
 * Sections come from the comments the serializer writes above each run of fields, which is what lets the
 * whole form round-trip rather than landing in one undifferentiated list. A section's group comes from the
 * `[formField]` paths of its fields.
 *
 * The schema exported beside it, `schema`, gives back what `[formField]` owns and the template therefore
 * cannot state: each field's readonly and disabled state, its required marker, its limits and its condition.
 */
export function parseMarkup(source: string, schema = ''): MarkupParseResult {
  const notes: MarkupParseNote[] = [];
  const fields: PortalFieldSpec[] = [];
  const sections: PortalSectionSpec[] = [];
  const rules = readSchema(schema);

  // The gates the serializer writes come out first, so what is left under the control-flow test is only what
  // really was dropped.
  const stripped = stripHiddenGates(source, notes, (path) => !!rules.get(path)?.some((rule) => rule.visibleWhen));

  if (/@(if|for|switch)\b|\*ngIf|\*ngFor/.test(stripped)) {
    notes.push({ text: 'Control flow', reason: 'control-flow' });
  }

  const parsed = new DOMParser().parseFromString(stripped, 'text/html');
  const scope = parsed.querySelector('form') ?? parsed.body;

  let current: PortalSectionSpec | null = null;
  let index = 0;

  /** Replaces the section being filled, which is how a group name found mid-section reaches it. */
  const setCurrent = (section: PortalSectionSpec): void => {
    current = section;
    const at = sections.findIndex((candidate) => candidate.id === section.id);

    if (at < 0) sections.push(section);
    else sections[at] = section;
  };

  const walk = (node: Node): void => {
    if (node.nodeType === Node.COMMENT_NODE) {
      const title = (node.textContent ?? '').trim();

      if (title && !title.startsWith('pinned')) setCurrent({ id: slugOf(title), title });

      return;
    }

    if (!(node instanceof Element)) return;

    if (node.tagName.toLowerCase() === 'formidable-field-decorator') {
      if (!current) setCurrent(FALLBACK_SECTION);

      const parsedField = parseDecorator(node, current!.id, index, notes);
      index += 1;

      if (parsedField) {
        const { field, groupName } = parsedField;

        fields.push((rules.get(pathOf(field.name, groupName)) ?? []).reduce(withRule, field));

        // A group belongs to the section, which is where the portal keeps it.
        if (groupName) setCurrent({ ...current!, groupName });
      }

      return;
    }

    node.childNodes.forEach(walk);
  };

  scope.childNodes.forEach(walk);

  if (!fields.length && !notes.some((note) => note.reason === 'unknown-element')) {
    notes.push({ text: 'No formidable-field-decorator found', reason: 'unknown-element' });
  }

  return { sections, fields, notes };
}

function parseDecorator(
  decorator: Element,
  sectionId: string,
  index: number,
  notes: MarkupParseNote[]
): { field: PortalFieldSpec; groupName?: string } | null {
  const fieldElement = Array.from(decorator.children).find((child) =>
    FIELD_KIND_BY_SELECTOR.has(child.tagName.toLowerCase())
  );

  if (!fieldElement) {
    notes.push({ text: decorator.outerHTML.slice(0, 60), reason: 'unknown-element' });

    return null;
  }

  const kind = FIELD_KIND_BY_SELECTOR.get(fieldElement.tagName.toLowerCase())!;
  const capabilities = FIELD_CAPABILITIES[kind];

  let spec: PortalFieldSpec = {
    id: `imported-${index + 1}`,
    kind,
    sectionId,
    name: `imported${index + 1}`,
    label: '',
    placeholder: '',
    span: 1,
    decoration: DECORATION,
    state: STATE
  };

  let state = STATE;
  let decoration = DECORATION;
  let path: readonly string[] = [];

  for (const attribute of Array.from(fieldElement.attributes)) {
    const raw = attribute.name.toLowerCase();
    const bound = raw.startsWith('[') && raw.endsWith(']');
    const key = bound ? raw.slice(1, -1) : raw;

    // A handler names behaviour the component holds — a preset map, for instance — and the import reads
    // only the template, so it says what it is leaving behind rather than dropping it in silence.
    if (raw.startsWith('(')) {
      notes.push({ text: `${attribute.name}="${attribute.value}"`, reason: 'in-the-component' });
      continue;
    }

    if (raw.startsWith('#')) continue;

    if (key === 'formfield') {
      const steps = fieldPathOf(attribute.value);

      if (steps) path = steps;
      else notes.push({ text: `${attribute.name}="${attribute.value}"`, reason: 'dynamic-binding' });

      continue;
    }

    if (key === 'autofocus') {
      state = { ...state, autoFocus: attribute.value.trim() === 'true' || attribute.value === '' };
      continue;
    }

    const known = ATTRIBUTES_BY_LOWER_NAME.get(key);
    if (!known) {
      notes.push({ text: attribute.name, reason: 'unknown-attribute' });
      continue;
    }

    if (bound && !isLiteral(attribute.value)) {
      notes.push({ text: `${attribute.name}="${attribute.value}"`, reason: 'dynamic-binding' });
      continue;
    }

    spec = { ...spec, ...known.write(attribute.value) };
  }

  const options = parseOptions(fieldElement);
  if (options.length && capabilities.options) {
    spec = { ...spec, options };
  }

  const label = decorator.querySelector('[formidablefieldlabel]');
  if (label) {
    const position = (label.getAttribute('position') ?? unquote(label.getAttribute('[position]') ?? '')).trim();
    decoration = {
      ...decoration,
      showLabel: true,
      labelPosition: LABEL_POSITIONS.includes(position as FieldLabelPosition)
        ? (position as FieldLabelPosition)
        : decoration.labelPosition
    };
    spec = { ...spec, label: (label.textContent ?? '').trim() };
  }

  const hint = decorator.querySelector('[formidablefieldhint]');
  if (hint) {
    decoration = { ...decoration, hint: (hint.textContent ?? '').trim() };
  }

  const prefix = decorator.querySelector('[formidablefieldprefix]');
  if (prefix) decoration = { ...decoration, prefix: 'text', prefixAlign: alignOf(prefix) };

  const suffix = decorator.querySelector('[formidablefieldsuffix]');
  if (suffix) decoration = { ...decoration, suffix: 'text', suffixAlign: alignOf(suffix) };
  if (decorator.querySelector('[formidablefieldlabeladornment]')) {
    decoration = { ...decoration, labelAdornment: 'text' };
  }

  // The first key of a two-key path is the group, which is as deep as a section nests.
  const name = path[path.length - 1] ?? spec.name;
  const groupName = path.length > 1 ? path[0] : undefined;

  return { field: { ...spec, id: name, name, decoration, state }, groupName };
}

/** A prefix or suffix's stated `align`, or `undefined` where it states none and the app default applies. */
function alignOf(adornment: Element): FieldAdornmentAlignment | undefined {
  const align = (adornment.getAttribute('align') ?? unquote(adornment.getAttribute('[align]') ?? '')).trim();

  return align === 'center' || align === 'value' ? align : undefined;
}

function parseOptions(fieldElement: Element): PortalOptionSpec[] {
  return Array.from(fieldElement.querySelectorAll('formidable-field-option')).map((element) => {
    const value = element.getAttribute('value') ?? unquote(element.getAttribute('[value]') ?? '');
    const label = element.getAttribute('label') ?? unquote(element.getAttribute('[label]') ?? '');

    return {
      value,
      label: label || (element.textContent ?? '').trim() || value,
      readonly: element.getAttribute('[readonly]')?.trim() === 'true',
      disabled: element.getAttribute('[disabled]')?.trim() === 'true'
    };
  });
}

/** A binding the import can read: a quoted string, a number, or a boolean. Anything else is an expression. */
function isLiteral(value: string): boolean {
  const trimmed = value.trim();

  return (
    /^'[^']*'$/.test(trimmed) ||
    /^"[^"]*"$/.test(trimmed) ||
    /^-?\d+(\.\d+)?$/.test(trimmed) ||
    /^(true|false)$/.test(trimmed)
  );
}

export const MARKUP_NOTE_LABELS: Readonly<Record<MarkupParseNote['reason'], string>> = {
  'unknown-element': 'Not a field the portal knows',
  'unknown-attribute': 'Not an input the portal exposes',
  'dynamic-binding': 'A binding to an expression, not a literal',
  'control-flow': 'Control flow is out of scope for the import',
  'in-the-component': 'Behaviour that lives in the component, which the import does not read',
  'in-the-schema': 'A rule that lives in the schema: paste the schema beside the template to keep it'
};
