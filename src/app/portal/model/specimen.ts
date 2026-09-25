import { FieldLabelPosition } from '@cynthion/ngx-formidable';
import { slugify } from '../helpers/slug.helpers';
import { FIELD_CAPABILITIES } from './field-capabilities';
import { PortalFieldKind, PortalFieldSpec, PortalFormOptions } from './field-spec.model';
import { PREVIEW_FIELDS, PREVIEW_FORM_DEFINITION, PREVIEW_INITIAL_MODEL } from './preview-form.definition';
import { FONT_FAMILY_TOKEN } from './presets';

/** One declaration of the ladder, added on top of every step before it. */
export interface LadderStep {
  readonly name: string;
  readonly value: string;
}

/**
 * From the library's defaults to a finished theme, one declaration at a time. Each step sets a base rather than
 * a derived variable, so every step also moves whatever derives from it — the radius reaches the panel too.
 */
export const LADDER_STEPS: readonly LadderStep[] = [
  { name: '--formidable-color-field-border-focus', value: '#0f766e' },
  { name: '--formidable-color-field-label-floating', value: '#115e59' },
  { name: '--formidable-color-field-background', value: '#f0fdfa' },
  { name: '--formidable-color-field-border', value: '#5eead4' },
  { name: '--formidable-border-radius', value: '20px' },
  { name: '--formidable-field-height', value: '72px' },
  { name: '--formidable-field-border-thickness', value: '2px' },
  { name: FONT_FAMILY_TOKEN, value: "'Avenir Next', Avenir, sans-serif" }
];

/**
 * One labelled part of the anatomy: the element it points at, where on that element's box, and the variable
 * that paints it. `at` is a fraction of the box, `content` measures the content box instead of the border box.
 */
export interface AnatomyPart {
  readonly variable: string;
  readonly selector: string;
  readonly at: readonly [number, number];
  readonly side: 'left' | 'right';
  readonly content?: boolean;
}

/** What kind of value a variable holds, which is how the anatomy groups its callouts. */
export type AnatomyGroup = 'colour' | 'geometry' | 'content';

export function anatomyGroup(variable: string): AnatomyGroup {
  if (variable.includes('-color-')) return 'colour';
  return variable === '--formidable-label-required-marker' ? 'content' : 'geometry';
}

// The selectors are the decorator's and the input's own DOM. `specimen.spec.ts` requires each to match, so a
// change to that DOM fails a test rather than silently dropping a callout.
export const ANATOMY_PARTS: readonly AnatomyPart[] = [
  { variable: '--formidable-field-border-radius', selector: '.container-horizontal', at: [0, 1], side: 'left' },
  {
    variable: '--formidable-color-field-label-floating',
    selector: '.label-wrapper > div',
    at: [0, 0.5],
    side: 'left'
  },
  { variable: '--formidable-field-padding-x', selector: '[formidableFieldPrefix]', at: [0, 0.5], side: 'left' },
  { variable: '--formidable-color-field-text', selector: 'input.field', at: [0, 0.5], side: 'left', content: true },
  { variable: '--formidable-color-field-hint', selector: '.hint-wrapper', at: [0, 0.5], side: 'left' },
  { variable: '--formidable-label-required-marker', selector: '.required-marker', at: [1, 0], side: 'left' },
  { variable: '--formidable-color-field-border', selector: '.container-horizontal', at: [0.7, 0], side: 'right' },
  {
    variable: '--formidable-color-field-background',
    selector: '.container-horizontal',
    at: [0.85, 0.5],
    side: 'right'
  },
  { variable: '--formidable-field-height', selector: '.container-horizontal', at: [1, 0.5], side: 'right' },
  { variable: '--formidable-field-border-thickness', selector: '.container-horizontal', at: [0.8, 1], side: 'right' }
];

// #region Fields

/**
 * The field of the Studio's sample form each kind is shown with, so the Specimen and the Studio show the same
 * pizza order. Picked rather than taken first: each is the plainest field of its kind.
 */
const SAMPLE_IDS: Readonly<Record<PortalFieldKind, string>> = {
  'input': 'orderName',
  'textarea': 'notes',
  'select': 'size',
  'dropdown': 'pizza',
  'autocomplete': 'address',
  'date': 'date',
  'time': 'time',
  'toggle': 'pickup',
  'slider': 'spice',
  'radio-group': 'method',
  'checkbox-group': 'toppings',
  'counter': 'quantity'
};

/** Every kind the portal renders, the demo's own custom field last. */
export const SPECIMEN_KINDS = Object.keys(SAMPLE_IDS) as PortalFieldKind[];

/** Three options are enough to show a list, and keep a row of a matrix short. */
const MATRIX_OPTION_COUNT = 3;

/** The sample model with its two groups flattened, since each cell stands alone. */
const SAMPLE_VALUES: Readonly<Record<string, unknown>> = Object.entries(PREVIEW_INITIAL_MODEL).reduce<
  Record<string, unknown>
>(
  (values, [key, value]) =>
    value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
      ? { ...values, ...(value as Record<string, unknown>) }
      : { ...values, [key]: value },
  {}
);

/** The sample field of a kind, reduced to one cell: no span, no hint, no condition, a short list. */
export function sampleSpec(kind: PortalFieldKind): PortalFieldSpec {
  const { visibleWhen: _visibleWhen, ...spec } = PREVIEW_FIELDS.find((field) => field.id === SAMPLE_IDS[kind])!;

  return {
    ...spec,
    span: 1,
    options: spec.options?.slice(0, MATRIX_OPTION_COUNT),
    decoration: { ...spec.decoration, hint: '', labelPosition: undefined }
  };
}

/** What the sample form holds for a kind. */
export function sampleValue(kind: PortalFieldKind): unknown {
  return SAMPLE_VALUES[SAMPLE_IDS[kind]] ?? null;
}

/** What a kind holds when nothing is entered. */
export function emptyValue(kind: PortalFieldKind): unknown {
  return kind === 'checkbox-group' ? [] : null;
}

/** The Studio's own form options, with the adornments the Adornments section projects allowed through. */
export const SPECIMEN_FORM_OPTIONS: PortalFormOptions = { ...PREVIEW_FORM_DEFINITION.options, showAdornments: true };

// #endregion

// #region Matrices

/** One column of a matrix: its title, and what it does to the row's sample field and value. */
export interface MatrixColumn {
  readonly title: string;
  readonly value: (kind: PortalFieldKind) => unknown;
  readonly spec?: (spec: PortalFieldSpec) => PortalFieldSpec;
  /** Rendered in a form whose validator reports the field as required, so the library shows it invalid. */
  readonly invalid?: boolean;
}

function withState(state: 'readonly' | 'disabled'): (spec: PortalFieldSpec) => PortalFieldSpec {
  return (spec) => ({ ...spec, state: { ...spec.state, [state]: true } });
}

export const STATE_COLUMNS: readonly MatrixColumn[] = [
  { title: 'Empty', value: emptyValue },
  { title: 'Filled', value: sampleValue },
  { title: 'Readonly', value: sampleValue, spec: withState('readonly') },
  { title: 'Disabled', value: sampleValue, spec: withState('disabled') },
  { title: 'Invalid', value: emptyValue, invalid: true }
];

/** Every label position, in the order `user/decoration.md` lists them. */
export const LABEL_POSITIONS: readonly FieldLabelPosition[] = [
  'outside',
  'inside',
  'inside-placeholder',
  'inside-floating',
  'border',
  'border-prefix'
];

/** A prefix on every cell, so `border-prefix` has something to align with and differs from `border`. */
export function labelColumns(filled: boolean): readonly MatrixColumn[] {
  return LABEL_POSITIONS.map((position) => ({
    title: position,
    value: filled ? sampleValue : emptyValue,
    spec: (spec) => ({
      ...spec,
      placeholder: spec.placeholder || 'Placeholder',
      decoration: { ...spec.decoration, labelPosition: position, prefix: 'icon' }
    })
  }));
}

export const ADORNMENT_COLUMNS: readonly MatrixColumn[] = [
  {
    title: 'Icon Prefix',
    value: sampleValue,
    spec: (spec) => ({ ...spec, decoration: { ...spec.decoration, prefix: 'icon' } })
  },
  {
    title: 'Text Prefix And Suffix',
    value: sampleValue,
    spec: (spec) => ({ ...spec, decoration: { ...spec.decoration, prefix: 'text', suffix: 'text' } })
  },
  {
    title: 'Button, Label Adornment, Hint',
    value: sampleValue,
    spec: (spec) => ({
      ...spec,
      decoration: { ...spec.decoration, suffix: 'button', labelAdornment: 'icon', hint: 'A hint below the field.' }
    })
  }
];

// What each matrix opens on: a few kinds that between them cover the three layouts — `horizontal`, `vertical`
// and `inline` — and a panel field, since that is where the rule of each matrix differs.
export const STATE_FEATURED: readonly PortalFieldKind[] = ['input', 'dropdown', 'checkbox-group', 'toggle'];
export const LABEL_FEATURED: readonly PortalFieldKind[] = ['input', 'dropdown', 'date'];
export const ADORNMENT_FEATURED: readonly PortalFieldKind[] = ['input', 'date', 'toggle'];

/** The kinds whose layout honours a label position other than `outside`. */
export const LABEL_POSITION_KINDS = SPECIMEN_KINDS.filter((kind) => FIELD_CAPABILITIES[kind].labelPositions);

/** The kinds whose layout renders a prefix and a suffix. */
export const ADORNMENT_KINDS = SPECIMEN_KINDS.filter((kind) => FIELD_CAPABILITIES[kind].adornments);

// #endregion

// #region Links

/** Where a variable is described: its own row of the Theme Reference. */
export function variableLink(name: string): readonly string[] {
  return ['/docs', 'theme-reference', slugify(name)];
}

/** Where a kind is described: its entry in the Components reference, or the guide for a field of your own. */
export function kindLink(kind: PortalFieldKind): readonly string[] {
  return kind === 'counter' ? ['/docs', 'custom-fields'] : ['/docs', 'components', `${kind}-field`];
}

// #endregion
