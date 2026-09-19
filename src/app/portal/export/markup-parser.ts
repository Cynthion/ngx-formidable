import { FieldLabelPosition } from '@cynthion/ngx-formidable';
import { FIELD_CAPABILITIES, FIELD_KIND_BY_SELECTOR } from '../model/field-capabilities';
import {
  PortalFieldDecoration,
  PortalFieldSpec,
  PortalFieldState,
  PortalOptionSpec,
  PortalSectionSpec
} from '../model/field-spec.model';
import { ATTRIBUTES_BY_LOWER_NAME, unquote } from './markup-attributes';

export interface MarkupParseNote {
  readonly text: string;
  readonly reason: 'unknown-element' | 'unknown-attribute' | 'dynamic-binding' | 'control-flow';
}

export interface MarkupParseResult {
  readonly sections: readonly PortalSectionSpec[];
  readonly fields: readonly PortalFieldSpec[];
  readonly notes: readonly MarkupParseNote[];
}

const DECORATION: PortalFieldDecoration = {
  showLabel: false,
  labelPosition: 'inside',
  showRequiredMarker: false,
  labelAdornment: 'none',
  prefix: 'none',
  prefixAlign: 'center',
  suffix: 'none',
  suffixAlign: 'center',
  hint: '',
  hintAlign: 'start'
};

const STATE: PortalFieldState = { readonly: false, disabled: false, autoFocus: false };

const LABEL_POSITIONS: readonly FieldLabelPosition[] = [
  'outside',
  'inside',
  'inside-placeholder',
  'inside-floating',
  'border',
  'border-prefix'
];

/** Attributes the serializer emits that carry no configuration of their own. */
const STRUCTURAL = new Set(['formidablefielderrors', '[ngmodel]', '#field']);

const FALLBACK_SECTION: PortalSectionSpec = { id: 'imported', title: 'Imported' };

function slugOf(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'imported'
  );
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

  if (/@(if|for|switch)\b|\*ngIf|\*ngFor/.test(source)) {
    notes.push({ text: 'Control flow', reason: 'control-flow' });
  }

  const parsed = new DOMParser().parseFromString(source, 'text/html');
  const scope = parsed.querySelector('form') ?? parsed.body;

  let current: PortalSectionSpec | null = null;
  let index = 0;

  const walk = (node: Node): void => {
    if (node.nodeType === Node.COMMENT_NODE) {
      const title = (node.textContent ?? '').trim();

      if (title && !title.startsWith('pinned')) {
        current = { id: slugOf(title), title };
        if (!sections.some((section) => section.id === current!.id)) sections.push(current);
      }

      return;
    }

    if (!(node instanceof Element)) return;

    if (node.tagName.toLowerCase() === 'formidable-field-decorator') {
      if (!current) {
        current = FALLBACK_SECTION;
        if (!sections.some((section) => section.id === current!.id)) sections.push(current);
      }

      const field = parseDecorator(node, current.id, index, notes);
      index += 1;
      if (field) fields.push(field);

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
    caption: 'Imported',
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

    if (STRUCTURAL.has(raw) || key === 'ngmodel' || raw.startsWith('(') || raw.startsWith('#')) continue;

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

  return { ...spec, id: name, name, decoration, state };
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
  'control-flow': 'Control flow is out of scope for the import'
};
