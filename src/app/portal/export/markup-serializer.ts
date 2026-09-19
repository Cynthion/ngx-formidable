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
  lines.push('  [formValue]="model"');
  lines.push('  [formShape]="shape"');
  if (options.validator === 'vest') lines.push('  [formSuite]="suite"');
  lines.push(`  [revealOn]="'${options.revealOn}'"`);
  lines.push(`  [ngFormOptions]="{ updateOn: '${options.updateOn}' }"`);
  lines.push(`  [showRequiredMarkers]="${options.showRequiredMarkers}"`);
  lines.push('  (formValueChange)="model = $event">');

  for (const section of definition.sections) {
    const fields = definition.fields.filter((field) => field.sectionId === section.id);
    if (!fields.length) continue;

    lines.push('');
    lines.push(`  <!-- ${section.title} -->`);

    for (const field of fields) {
      lines.push(...serializeField(field, definition).map((line) => `  ${line}`));
    }
  }

  lines.push('</form>');

  return lines.join('\n') + '\n';
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

function serializeField(spec: PortalFieldSpec, definition: PortalFormDefinition): string[] {
  const capabilities = FIELD_CAPABILITIES[spec.kind];
  const selector = FIELD_KIND_SELECTORS[spec.kind];
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
  if (spec.decoration.showRequiredMarker) lines.push('    [showRequiredMarker]="true"');

  lines.push(`    [ngModel]="model.${spec.name}">`);

  if (spec.defaultOption) {
    lines.push(`    <!-- pinned first, never sorted and never filtered -->`);
  }

  for (const option of spec.options ?? []) {
    lines.push(...serializeOption(option).map((line) => `    ${line}`));
  }

  lines.push(`  </${selector}>`);

  if (definition.options.showLabels && spec.decoration.showLabel) {
    const position = capabilities.labelPositions ? spec.decoration.labelPosition : 'outside';
    lines.push(`  <div`);
    lines.push(`    formidableFieldLabel`);
    lines.push(`    position="${position}">`);
    lines.push(`    ${escape(spec.label)}`);
    lines.push(`  </div>`);
  }

  if (spec.decoration.labelAdornment !== 'none') {
    lines.push(`  <div formidableFieldLabelAdornment>${slotContent(spec.decoration.labelAdornment, 'Info')}</div>`);
  }

  if (capabilities.adornments && spec.decoration.prefix !== 'none') {
    lines.push(`  <div`);
    lines.push(`    formidableFieldPrefix`);
    lines.push(`    align="${spec.decoration.prefixAlign}">`);
    lines.push(`    ${slotContent(spec.decoration.prefix, 'Prefix')}`);
    lines.push(`  </div>`);
  }

  if (capabilities.adornments && spec.decoration.suffix !== 'none') {
    lines.push(`  <div`);
    lines.push(`    formidableFieldSuffix`);
    lines.push(`    align="${spec.decoration.suffixAlign}">`);
    lines.push(`    ${slotContent(spec.decoration.suffix, 'Suffix')}`);
    lines.push(`  </div>`);
  }

  if (definition.options.showHints && spec.decoration.hint) {
    lines.push(`  <div`);
    lines.push(`    formidableFieldHint`);
    lines.push(`    align="${spec.decoration.hintAlign}">`);
    lines.push(`    ${escape(spec.decoration.hint)}`);
    lines.push(`  </div>`);
  }

  lines.push('</formidable-field-decorator>');

  return lines;
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
