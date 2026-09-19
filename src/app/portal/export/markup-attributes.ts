import { PortalFieldSpec } from '../model/field-spec.model';

/**
 * One template attribute, in both directions. The serializer and the `DOMParser` import read the same table,
 * so a field input cannot be emitted in a form the import then ignores.
 *
 * `binding` decides the syntax: a plain attribute for a string, a one-way binding with a literal for anything
 * that is not one. `read` returns `null` where the attribute is omitted.
 */
interface MarkupAttribute {
  readonly name: string;
  readonly binding: boolean;
  readonly read: (spec: PortalFieldSpec) => string | null;
  readonly write: (raw: string) => Partial<PortalFieldSpec>;
}

const text = (value: string | undefined): string | null => (value ? value : null);
const flag = (value: boolean | undefined, whenOmitted: boolean): string | null =>
  value === undefined || value === whenOmitted ? null : String(value);
const num = (value: number | undefined): string | null => (value === undefined ? null : String(value));

const parseBool = (raw: string): boolean => raw.trim() === 'true';
const parseNum = (raw: string): number => Number(raw.trim());
/** Strips the quotes a one-way binding to a string literal carries. */
export const unquote = (raw: string): string =>
  raw
    .trim()
    .replace(/^'(.*)'$/s, '$1')
    .replace(/^"(.*)"$/s, '$1');

/** The attributes every field carries, whatever its kind. */
const COMMON_ATTRIBUTES: readonly MarkupAttribute[] = [
  { name: 'name', binding: false, read: (s) => s.name, write: (raw) => ({ name: raw }) },
  { name: 'placeholder', binding: false, read: (s) => text(s.placeholder), write: (raw) => ({ placeholder: raw }) }
];

/** The kind-specific inputs, keyed by the member they map to. */
const FIELD_ATTRIBUTES: readonly MarkupAttribute[] = [
  { name: 'mask', binding: false, read: (s) => text(s.mask), write: (raw) => ({ mask: raw }) },
  { name: 'minLength', binding: true, read: (s) => num(s.minLength), write: (raw) => ({ minLength: parseNum(raw) }) },
  { name: 'maxLength', binding: true, read: (s) => num(s.maxLength), write: (raw) => ({ maxLength: parseNum(raw) }) },
  {
    name: 'enableAutosize',
    binding: true,
    read: (s) => flag(s.enableAutosize, true),
    write: (raw) => ({ enableAutosize: parseBool(raw) })
  },
  {
    name: 'showLengthIndicator',
    binding: true,
    read: (s) => flag(s.showLengthIndicator, false),
    write: (raw) => ({ showLengthIndicator: parseBool(raw) })
  },
  {
    name: 'panelPosition',
    binding: true,
    read: (s) => (s.panelPosition ? `'${s.panelPosition}'` : null),
    write: (raw) => ({ panelPosition: unquote(raw) as PortalFieldSpec['panelPosition'] })
  },
  {
    name: 'noOptionsText',
    binding: false,
    read: (s) => text(s.noOptionsText),
    write: (raw) => ({ noOptionsText: raw })
  },
  {
    name: 'defaultOptionMode',
    binding: true,
    read: (s) => (s.defaultOptionMode ? `'${s.defaultOptionMode}'` : null),
    write: (raw) => ({ defaultOptionMode: unquote(raw) as PortalFieldSpec['defaultOptionMode'] })
  },
  {
    name: 'unicodeTokenFormat',
    binding: true,
    read: (s) => (s.unicodeTokenFormat ? `'${s.unicodeTokenFormat}'` : null),
    write: (raw) => ({ unicodeTokenFormat: unquote(raw) })
  },
  {
    name: 'emptyHint',
    binding: true,
    read: (s) => (s.emptyHint ? `'${s.emptyHint}'` : null),
    write: (raw) => ({ emptyHint: unquote(raw) as PortalFieldSpec['emptyHint'] })
  },
  {
    name: 'labelPosition',
    binding: true,
    read: (s) => (s.toggleLabelPosition ? `'${s.toggleLabelPosition}'` : null),
    write: (raw) => ({ toggleLabelPosition: unquote(raw) as PortalFieldSpec['toggleLabelPosition'] })
  },
  { name: 'onLabel', binding: false, read: (s) => text(s.onLabel), write: (raw) => ({ onLabel: raw }) },
  { name: 'offLabel', binding: false, read: (s) => text(s.offLabel), write: (raw) => ({ offLabel: raw }) },
  { name: 'min', binding: true, read: (s) => num(s.min), write: (raw) => ({ min: parseNum(raw) }) },
  { name: 'max', binding: true, read: (s) => num(s.max), write: (raw) => ({ max: parseNum(raw) }) },
  { name: 'step', binding: true, read: (s) => num(s.step), write: (raw) => ({ step: parseNum(raw) }) },
  { name: 'minLabel', binding: false, read: (s) => text(s.minLabel), write: (raw) => ({ minLabel: raw }) },
  { name: 'maxLabel', binding: false, read: (s) => text(s.maxLabel), write: (raw) => ({ maxLabel: raw }) },
  {
    name: 'showThumbLabel',
    binding: true,
    read: (s) => flag(s.showThumbLabel, true),
    write: (raw) => ({ showThumbLabel: parseBool(raw) })
  },
  {
    name: 'showTickMarks',
    binding: true,
    read: (s) => flag(s.showTickMarks, false),
    write: (raw) => ({ showTickMarks: parseBool(raw) })
  },
  {
    name: 'showMinMaxLabels',
    binding: true,
    read: (s) => flag(s.showMinMaxLabels, false),
    write: (raw) => ({ showMinMaxLabels: parseBool(raw) })
  },
  {
    name: 'showTickLabels',
    binding: true,
    read: (s) => flag(s.showTickLabels, false),
    write: (raw) => ({ showTickLabels: parseBool(raw) })
  },
  {
    name: 'tickInterval',
    binding: true,
    read: (s) => num(s.tickInterval),
    write: (raw) => ({ tickInterval: parseNum(raw) })
  }
];

export const ALL_FIELD_ATTRIBUTES: readonly MarkupAttribute[] = [...COMMON_ATTRIBUTES, ...FIELD_ATTRIBUTES];

/**
 * Lookup by the lowercased attribute name. The HTML parser lowercases every attribute it reads, so a
 * camel-cased input has to be recovered rather than matched.
 */
export const ATTRIBUTES_BY_LOWER_NAME: ReadonlyMap<string, MarkupAttribute> = new Map(
  ALL_FIELD_ATTRIBUTES.map((attribute) => [attribute.name.toLowerCase(), attribute])
);
