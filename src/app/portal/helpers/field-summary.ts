import { ALL_FIELD_ATTRIBUTES, unquote } from '../export/markup-attributes';
import { PortalFieldSpec } from '../model/field-spec.model';

/** One input a field carries, as the chip's tooltip states it. */
interface FieldSetting {
  readonly name: string;
  readonly value: string;
}

/**
 * The inputs set on a field, over and above its defaults.
 *
 * Derived rather than written: a hand-authored description of a field goes stale the moment the field is
 * edited, and says nothing at all about a field added in the structure editor. `ALL_FIELD_ATTRIBUTES` is the
 * table the markup serializer and the import already share, and each entry's `read` already answers `null`
 * for an input sitting at its default — so what the export would emit is exactly what is worth stating here.
 *
 * `name` is skipped: it is the field's identity rather than one of its settings. The three that the
 * serializer emits outside that table are added back, because each is a difference the preview demonstrates.
 */
export function describeFieldSettings(spec: PortalFieldSpec): readonly FieldSetting[] {
  const settings: FieldSetting[] = [];

  for (const attribute of ALL_FIELD_ATTRIBUTES) {
    if (attribute.name === 'name') continue;

    const value = attribute.read(spec);

    if (value !== null) settings.push({ name: attribute.name, value: unquote(value) });
  }

  if (spec.sortAlphabetically) settings.push({ name: 'sortFn', value: 'alphabetical' });
  if (spec.locale) settings.push({ name: 'locale', value: spec.locale });

  if (spec.state.readonly) settings.push({ name: 'readonly', value: 'true' });
  if (spec.state.disabled) settings.push({ name: 'disabled', value: 'true' });
  if (spec.state.autoFocus) settings.push({ name: 'autoFocus', value: 'true' });

  return settings;
}
