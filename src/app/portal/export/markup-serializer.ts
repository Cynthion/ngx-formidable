import { FIELD_CAPABILITIES, FIELD_KIND_SELECTORS } from '../model/field-capabilities';
import { PortalFieldSpec, PortalFormDefinition, PortalOptionSpec, PortalSlotContent } from '../model/field-spec.model';
import { pathOf } from '../helpers/model-path.helpers';
import { ALL_FIELD_ATTRIBUTES } from './markup-attributes';

/**
 * The configuration serialized to an Angular template, bound to Signal Forms.
 *
 * An Angular production build contains no template compiler, so user-authored markup cannot become live
 * components. The configuration is therefore the source of truth and this is derived from it, read-only.
 *
 * A field's state, its limits, its condition and its rules are the schema's, which `[formField]` hands to the
 * field — see `schema-serializer.ts`. What is left here is what the field is and how it is decorated.
 */
export function serializeDefinition(definition: PortalFormDefinition): string {
  const lines: string[] = ['<form [formRoot]="form">'];

  for (const section of definition.sections) {
    const fields = definition.fields.filter((field) => field.sectionId === section.id);
    if (!fields.length) continue;

    lines.push('');
    lines.push(`  <!-- ${section.title} -->`);

    for (const field of fields) {
      lines.push(...serializeField(field, definition, section.groupName).map((line) => `  ${line}`));
    }
  }

  lines.push('</form>');

  return lines.join('\n') + '\n';
}

/** Whether a model key can be written bare. A field added here is named after its kind, so `radio-group1`. */
export function isIdentifier(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name);
}

/** The handler a preset field binds to, named off the field so the template and the component agree. */
export function presetHandlerName(name: string): string {
  const identifier = name.replace(/[^A-Za-z0-9]+(.)/g, (_match, next: string) => next.toUpperCase());

  return `apply${identifier.charAt(0).toUpperCase()}${identifier.slice(1)}Preset`;
}

/**
 * A model path read off a root: `form.when.date` in the template, `path.when.date` in the schema. Dot access
 * would parse `form.radio-group1` as a subtraction, so a key that is not an identifier is read through a
 * bracket, each step of a grouped path decided on its own.
 */
export function accessOf(root: string, path: string): string {
  const steps = path.split('.').map((step) => (isIdentifier(step) ? `.${step}` : `['${step}']`));

  return `${root}${steps.join('')}`;
}

function slotContent(slot: PortalSlotContent, fallback: string): string {
  switch (slot) {
    case 'icon':
      return '<!-- your icon component -->';
    case 'button':
      return '<button type="button">Action</button>';
    default:
      return fallback;
  }
}

function serializeField(spec: PortalFieldSpec, definition: PortalFormDefinition, groupName?: string): string[] {
  const capabilities = FIELD_CAPABILITIES[spec.kind];
  const selector = FIELD_KIND_SELECTORS[spec.kind];
  const access = accessOf('form', pathOf(spec.name, groupName));
  const lines: string[] = ['<formidable-field-decorator>', `  <${selector}`];

  for (const attribute of ALL_FIELD_ATTRIBUTES) {
    if (attribute.rule) continue;
    if (attribute.name === 'placeholder' && !capabilities.placeholder) continue;

    const value = attribute.read(spec);
    if (value === null) continue;

    lines.push(attribute.binding ? `    [${attribute.name}]="${value}"` : `    ${attribute.name}="${escape(value)}"`);
  }

  if (spec.state.autoFocus) lines.push('    [autoFocus]="true"');

  lines.push(`    [formField]="${access}"`);

  // A template picker writes keys it does not own, which is a change to the model rather than to this
  // field — so it is a handler on the component, and `presetHandlerName` is the name both halves agree on.
  if (spec.presets) lines.push(`    (valueChange)="${presetHandlerName(spec.name)}($event)"`);

  const children: string[] = [];

  if (spec.defaultOption) {
    children.push(`<!-- pinned first, never sorted and never filtered -->`);
  }

  if (spec.actionOption) {
    children.push(`<!-- [actionOption]="${spec.actionOption.value}": last in the list, and runs an action -->`);
  }

  for (const option of spec.options ?? []) {
    children.push(...serializeOption(option));
  }

  if (children.length) {
    lines[lines.length - 1] += '>';
    lines.push(...children.map((line) => `    ${line}`), `  </${selector}>`);
  } else {
    lines[lines.length - 1] += ' />';
  }

  // A position, an alignment and a panel position are stated only where the field states its own; absent,
  // the app default applies. A layout that cannot honour a label position labels outside regardless.
  if (definition.options.showLabels && spec.decoration.showLabel) {
    const position = capabilities.labelPositions ? spec.decoration.labelPosition : undefined;
    lines.push(...decorationLines('formidableFieldLabel', 'position', position, escape(spec.label)));
  }

  if (spec.decoration.labelAdornment !== 'none') {
    lines.push(`  <div formidableFieldLabelAdornment>${slotContent(spec.decoration.labelAdornment, 'Info')}</div>`);
  }

  if (capabilities.adornments && spec.decoration.prefix !== 'none') {
    const content = slotContent(spec.decoration.prefix, 'Prefix');
    lines.push(...decorationLines('formidableFieldPrefix', 'align', spec.decoration.prefixAlign, content));
  }

  if (capabilities.adornments && spec.decoration.suffix !== 'none') {
    const content = slotContent(spec.decoration.suffix, 'Suffix');
    lines.push(...decorationLines('formidableFieldSuffix', 'align', spec.decoration.suffixAlign, content));
  }

  if (definition.options.showHints && spec.decoration.hint) {
    lines.push(`  <div`);
    lines.push(`    formidableFieldHint`);
    lines.push(`    align="${spec.decoration.hintAlign}">`);
    lines.push(`    ${escape(spec.decoration.hint)}`);
    lines.push(`  </div>`);
  }

  lines.push('</formidable-field-decorator>');

  // `hidden()` in the schema only takes the field out of validation; this takes it off the page. Its key
  // stays in the model either way.
  if (spec.visibleWhen) {
    return [`@if (!${access}().hidden()) {`, ...lines.map((line) => `  ${line}`), '}'];
  }

  return lines;
}

/** One projected decoration, carrying its attribute only when the field states it. */
function decorationLines(marker: string, attribute: string, value: string | undefined, content: string): string[] {
  const open = value ? ['  <div', `    ${marker}`, `    ${attribute}="${value}">`] : [`  <div ${marker}>`];

  return [...open, `    ${content}`, '  </div>'];
}

function serializeOption(option: PortalOptionSpec): string[] {
  const lines = ['<formidable-field-option', `  value="${escape(option.value)}"`, `  label="${escape(option.label)}"`];

  if (option.readonly) lines.push('  [readonly]="true"');
  if (option.disabled) lines.push('  [disabled]="true"');

  lines[lines.length - 1] += ' />';

  return lines;
}

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
