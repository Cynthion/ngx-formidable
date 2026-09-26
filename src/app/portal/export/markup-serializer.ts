import { FIELD_CAPABILITIES, FIELD_KIND_SELECTORS } from '../model/field-capabilities';
import { PortalFieldSpec, PortalFormDefinition, PortalOptionSpec, PortalSlotContent } from '../model/field-spec.model';
import { ALL_FIELD_ATTRIBUTES } from './markup-attributes';

/**
 * The configuration serialized to an Angular template.
 *
 * An Angular production build contains no template compiler, so user-authored markup cannot become live
 * components. The configuration is therefore the source of truth and this is derived from it, read-only.
 */
export function serializeDefinition(definition: PortalFormDefinition): string {
  const lines: string[] = [];
  const { options } = definition;

  lines.push('<form');
  lines.push('  formidableForm');
  lines.push('  formidableValidateWholeForm');
  lines.push('  [formValue]="model()"');
  lines.push('  [formShape]="shape"');
  if (options.validator === 'vest') lines.push('  [formSuite]="suite"');
  // Stated only where the form states them: absent, the app default applies, which is the App Config's.
  if (options.revealOn) lines.push(`  [revealOn]="'${options.revealOn}'"`);
  lines.push(`  [ngFormOptions]="{ updateOn: '${options.updateOn}' }"`);
  if (options.hideRequiredMarkers !== undefined) {
    lines.push(`  [hideRequiredMarkers]="${options.hideRequiredMarkers}"`);
  }
  lines.push('  (formValueChange)="model.set($event)">');

  for (const section of definition.sections) {
    const fields = definition.fields.filter((field) => field.sectionId === section.id);
    if (!fields.length) continue;

    lines.push('');
    lines.push(`  <!-- ${section.title} -->`);

    // A grouped section is one `ngModelGroup` around its fields, which is what nests their values and gives
    // a rule reading two of them a target of its own.
    const indent = section.groupName ? '    ' : '  ';

    if (section.groupName) {
      lines.push('  <div');
      lines.push('    formidableFieldErrors');
      lines.push(`    ngModelGroup="${escape(section.groupName)}">`);
    }

    for (const field of fields) {
      lines.push(...serializeField(field, definition, section.groupName).map((line) => `${indent}${line}`));
    }

    if (section.groupName) lines.push('  </div>');
  }

  lines.push('</form>');

  return lines.join('\n') + '\n';
}

/**
 * The `@if` a conditional field is wrapped in.
 *
 * Emitted rather than resolved: the export has to carry the behaviour, not the state the preview happens to
 * be in — a field the stage is currently hiding is still part of the form. The condition is written in the
 * one grammar the import reads back, so the whole form round-trips.
 *
 * The watched field is named rather than pathed on the specification, so its group is resolved here: a
 * condition on a field inside an `ngModelGroup` has to read the model where the group put it.
 */
function conditionOf(spec: PortalFieldSpec, definition: PortalFormDefinition): string | null {
  const condition = spec.visibleWhen;
  if (!condition) return null;

  const value = typeof condition.equals === 'string' ? `'${condition.equals}'` : String(condition.equals);

  return `${modelAccess(modelPathOf(condition.field, definition))} === ${value}`;
}

/** Where a field's value sits in the model, which is `group.name` when its section carries a group. */
function modelPathOf(name: string, definition: PortalFormDefinition): string {
  const field = definition.fields.find((candidate) => candidate.name === name);
  if (!field) return name;

  const group = definition.sections.find((section) => section.id === field.sectionId)?.groupName;

  return group ? `${group}.${name}` : name;
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
 * The model key as the template reads it. Dot access would parse `model().radio-group1` as a subtraction, so
 * a key that is not an identifier is read through a bracket. A grouped field arrives as a dotted path, and
 * each step of it is decided on its own.
 */
function modelAccess(path: string): string {
  const steps = path.split('.').map((step) => (isIdentifier(step) ? `.${step}` : `['${step}']`));

  return `model()${steps.join('')}`;
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
  const condition = conditionOf(spec, definition);
  const lines: string[] = ['<formidable-field-decorator>', `  <${selector}`, '    formidableFieldErrors'];

  for (const attribute of ALL_FIELD_ATTRIBUTES) {
    if (attribute.name === 'placeholder' && !capabilities.placeholder) continue;

    const value = attribute.read(spec);
    if (value === null) continue;

    lines.push(attribute.binding ? `    [${attribute.name}]="${value}"` : `    ${attribute.name}="${escape(value)}"`);
  }

  if (spec.state.readonly) lines.push('    [readonly]="true"');
  if (spec.state.disabled) lines.push('    [disabled]="true"');
  if (spec.state.autoFocus) lines.push('    [autoFocus]="true"');
  if (spec.decoration.markRequired) lines.push('    [markRequired]="true"');

  lines.push(`    [ngModel]="${modelAccess(groupName ? `${groupName}.${spec.name}` : spec.name)}"`);

  // A template picker writes keys it does not own, which is a change to the model rather than to this
  // field — so it is a handler on the component, and `presetHandlerName` is the name both halves agree on.
  if (spec.presets) {
    lines.push(`    (ngModelChange)="${presetHandlerName(spec.name)}($event)">`);
  } else {
    lines[lines.length - 1] += '>';
  }

  if (spec.defaultOption) {
    lines.push(`    <!-- pinned first, never sorted and never filtered -->`);
  }

  if (spec.actionOption) {
    lines.push(`    <!-- [actionOption]="${spec.actionOption.value}": last in the list, and runs an action -->`);
  }

  for (const option of spec.options ?? []) {
    lines.push(...serializeOption(option).map((line) => `    ${line}`));
  }

  lines.push(`  </${selector}>`);

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

  // `@if` destroys the control, so the model loses the key while the condition does not hold. The rules that
  // target it need `omitWhen` — see `user/validation.md`, Conditional Fields.
  if (condition) {
    return [`@if (${condition}) {`, ...lines.map((line) => `  ${line}`), '}'];
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

  lines.push('/>');

  return lines;
}

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
