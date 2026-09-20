import { FieldLabelPosition } from '@cynthion/ngx-formidable';
import { FIELD_CAPABILITIES, FIELD_KIND_BY_SELECTOR } from '../model/field-capabilities';
import {
  DEFAULT_DECORATION,
  DEFAULT_STATE,
  LABEL_POSITION_LABELS,
  PortalFieldDecoration,
  PortalFieldSpec,
  PortalFieldState,
  PortalOptionSpec,
  PortalSectionSpec,
  PortalVisibilitySpec
} from '../model/field-spec.model';
import { slugify } from '../helpers/slug.helpers';
import { ATTRIBUTES_BY_LOWER_NAME, unquote } from './markup-attributes';

interface MarkupParseNote {
  readonly text: string;
  readonly reason: 'unknown-element' | 'unknown-attribute' | 'dynamic-binding' | 'control-flow' | 'in-the-component';
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

/** Attributes the serializer emits that carry no configuration of their own. */
const STRUCTURAL = new Set(['formidablefielderrors', '[ngmodel]', '#field']);

const FALLBACK_SECTION: PortalSectionSpec = { id: 'imported', title: 'Imported' };

/** Where a lifted `@if` condition is parked so the `DOMParser` carries it to its decorator. */
const CONDITION_ATTRIBUTE = 'data-portal-visible-when';

function slugOf(title: string): string {
  return slugify(title) || 'imported';
}

/**
 * The one `@if` condition the import reads: a key of the model against a literal, which is what
 * `visibleWhen` serializes to. Anything else stays in the source and is reported as control flow.
 *
 * The key may be a path, because the watched field can be inside an `ngModelGroup`. Only its last step is
 * kept: `visibleWhen` names a field, and the group is resolved from wherever that field ends up.
 */
function parseCondition(expression: string): PortalVisibilitySpec | null {
  const match = /^model\(\)((?:\.[A-Za-z_$][\w$]*|\['[^']*'\])+)\s*===\s*(.+)$/.exec(expression.trim());
  if (!match) return null;

  const steps = match[1]!.match(/\.[A-Za-z_$][\w$]*|\['[^']*'\]/g) ?? [];
  const last = steps[steps.length - 1];
  if (!last) return null;

  const field = last.startsWith('.') ? last.slice(1) : last.slice(2, -2);
  const raw = match[2]!.trim();

  if (raw === 'true' || raw === 'false') return { field, equals: raw === 'true' };
  if (/^-?\d+(\.\d+)?$/.test(raw)) return { field, equals: Number(raw) };

  const quoted = /^'([^']*)'$/.exec(raw);

  return quoted ? { field, equals: quoted[1]! } : null;
}

/**
 * Lifts every `@if` the import understands onto the decorator it wraps, as an attribute.
 *
 * A line pass before the `DOMParser`, because `@if` is Angular's own syntax and not markup: the parser reads
 * the braces as text and would drop the condition while keeping the field. An `@if` whose condition does not
 * parse is left exactly where it is, so it still reaches the control-flow note.
 */
function liftConditions(source: string): string {
  const lines = source.split('\n');
  const output: string[] = [];
  // One frame per `@if`, holding whether this pass consumed it, so the matching `}` goes the same way.
  const frames: boolean[] = [];
  let pending: string | null = null;

  for (const line of lines) {
    const opened = /^\s*@if\s*\((.+)\)\s*\{\s*$/.exec(line);

    if (opened) {
      const expression = opened[1]!.trim();
      const understood = parseCondition(expression) !== null;
      frames.push(understood);

      if (understood) {
        pending = expression;
      } else {
        output.push(line);
      }

      continue;
    }

    if (/^\s*\}\s*$/.test(line) && frames.length) {
      if (!frames.pop()) output.push(line);

      continue;
    }

    if (pending && line.includes('<formidable-field-decorator')) {
      output.push(
        line.replace('<formidable-field-decorator', `<formidable-field-decorator ${CONDITION_ATTRIBUTE}="${pending}"`)
      );
      pending = null;

      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

/**
 * Parses a pasted Angular template back into a whole form: its sections and their fields.
 *
 * It handles a **static, attribute-only subset**: one `formidable-field-decorator` per field, with literal
 * attributes and one-way bindings to literals. Bindings to expressions and control flow are out of scope and
 * are reported rather than failing silently, because a template that half-imports is worse than one that
 * says what it dropped.
 *
 * Sections come from the comments the serializer writes above each run of fields, which is what lets the
 * whole form round-trip rather than landing in one undifferentiated list.
 */
export function parseMarkup(source: string): MarkupParseResult {
  const notes: MarkupParseNote[] = [];
  const fields: PortalFieldSpec[] = [];
  const sections: PortalSectionSpec[] = [];

  // The conditions the import understands are lifted onto their decorators first, so what is left under the
  // control-flow test is only what really was dropped.
  const lifted = liftConditions(source);

  if (/@(if|for|switch)\b|\*ngIf|\*ngFor/.test(lifted)) {
    notes.push({ text: 'Control flow', reason: 'control-flow' });
  }

  const parsed = new DOMParser().parseFromString(lifted, 'text/html');
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

      const field = parseDecorator(node, current!.id, index, notes);
      index += 1;
      if (field) fields.push(field);

      return;
    }

    // An `ngModelGroup` around a section's fields belongs to the section, which is where the portal keeps it.
    const groupName = node.getAttribute('ngModelGroup') ?? node.getAttribute('ngmodelgroup');
    if (groupName && current) setCurrent({ ...(current as PortalSectionSpec), groupName });

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
): PortalFieldSpec | null {
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

    if (STRUCTURAL.has(raw) || key === 'ngmodel' || raw.startsWith('#')) continue;

    if (key === 'readonly' || key === 'disabled' || key === 'autofocus') {
      const on = attribute.value.trim() === 'true' || attribute.value === '';
      state = {
        ...state,
        readonly: key === 'readonly' ? on : state.readonly,
        disabled: key === 'disabled' ? on : state.disabled,
        autoFocus: key === 'autofocus' ? on : state.autoFocus
      };
      continue;
    }

    if (key === 'showrequiredmarker') {
      decoration = { ...decoration, showRequiredMarker: attribute.value.trim() === 'true' };
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

  if (decorator.querySelector('[formidablefieldprefix]')) decoration = { ...decoration, prefix: 'text' };
  if (decorator.querySelector('[formidablefieldsuffix]')) decoration = { ...decoration, suffix: 'text' };
  if (decorator.querySelector('[formidablefieldlabeladornment]')) {
    decoration = { ...decoration, labelAdornment: 'text' };
  }

  const name = spec.name || `imported${index + 1}`;
  const visibleWhen = parseCondition(decorator.getAttribute(CONDITION_ATTRIBUTE) ?? '') ?? undefined;

  return { ...spec, id: name, name, decoration, state, visibleWhen };
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
  'in-the-component': 'Behaviour that lives in the component, which the import does not read'
};
