import { FieldLabelPosition } from '@cynthion/ngx-formidable';
import { slugify } from '../helpers/slug.helpers';
import { FIELD_CAPABILITIES } from './field-capabilities';
import { PortalFieldKind, PortalFieldSpec, PortalFormOptions } from './field-spec.model';
import { PREVIEW_FIELDS, PREVIEW_FORM_DEFINITION, PREVIEW_INITIAL_MODEL } from './preview-form.definition';
import { FONT_FAMILY_TOKEN, PageSurface, PRESETS_BY_KEY, presetVars } from './presets';

/** One declaration of the ladder. */
export interface LadderDeclaration {
  readonly name: string;
  readonly value: string;
}

/** One step of the ladder: the declarations of one concern, added on top of every step before it. */
export interface LadderStep {
  readonly title: string;
  readonly caption: string;
  readonly declarations: readonly LadderDeclaration[];
  /** The page behind the form from this step on. The step that darkens the fill takes the preset's own. */
  readonly page?: PageSurface;
}

/** Where the ladder ends: a whole preset, so its last step is what picking that preset paints. */
const LADDER_PRESET = PRESETS_BY_KEY.get('midnight')!;

const LADDER_VARS = presetVars(LADDER_PRESET);

/**
 * From the library's defaults to Midnight, one variable per step wherever one variable leaves a readable frame. The
 * fill and the ink change together, since a dark fill under dark ink, or light ink on a light fill, is unreadable;
 * every step a light page can show comes before them. Each step sets a base rather than a derived variable, so it
 * also moves whatever derives from it — the radius reaches the panel too. The values are read off the preset
 * rather than restated, so the two cannot disagree.
 */
export const LADDER_STEPS: readonly LadderStep[] = (
  [
    {
      title: 'Height',
      caption: 'Taller fields; the inner height and the label offsets follow. The padding restates the library’s own.',
      names: ['--formidable-field-height', '--formidable-field-padding-x']
    },
    {
      title: 'Radius',
      caption: 'Rounder corners. The groups and the open panel round with the fields.',
      names: ['--formidable-border-radius']
    },
    {
      title: 'Type',
      caption: 'One family for every field, its panel and its messages.',
      names: [FONT_FAMILY_TOKEN]
    },
    {
      title: 'Ring Width',
      caption: 'A wider focus ring, on the dropdown that has focus.',
      names: ['--formidable-field-focus-ring-width']
    },
    {
      title: 'Soft Ring',
      caption: 'The ring turns translucent: one composite for a field, one for a group, one for an invalid field.',
      names: [
        '--formidable-color-field-focus-box-shadow',
        '--formidable-color-field-group-focus-box-shadow',
        '--formidable-color-field-focus-box-shadow-invalid'
      ]
    },
    {
      title: 'Dark Fill',
      caption: 'A dark fill and light ink, on a dark page. Either alone is unreadable, so they change together.',
      names: ['--formidable-color-field-background', '--formidable-color-field-text'],
      page: LADDER_PRESET.page
    },
    {
      title: 'Placeholder',
      caption: 'A lighter placeholder. The hints are drawn in it too.',
      names: ['--formidable-color-field-placeholder']
    },
    {
      title: 'Border',
      caption: 'A quieter border, which the groups, the toggle and the slider share.',
      names: ['--formidable-color-field-border']
    },
    {
      title: 'Tints',
      caption:
        'The selection colour, and the tints a dark fill restates: the open panel’s rows, the readonly and disabled fills.',
      names: [
        '--formidable-color-field-selection',
        '--formidable-color-field-option-background-selected',
        '--formidable-color-field-option-background-highlighted',
        '--formidable-color-field-background-readonly',
        '--formidable-color-field-background-disabled'
      ]
    },
    {
      title: 'Focus',
      caption: 'Teal for focus. The ring is mixed from it, so the ring turns teal too.',
      names: ['--formidable-color-field-border-focus']
    },
    {
      title: 'Label',
      caption: 'Teal for the label inside a field.',
      names: ['--formidable-color-field-label-floating']
    },
    {
      title: 'Error',
      caption: 'Rose for errors: the invalid border, label and message.',
      names: ['--formidable-color-validation-error']
    },
    {
      title: 'No Border',
      caption: 'No outline on any field. The groups, the toggle and the slider fall back to it, so theirs go too.',
      names: ['--formidable-field-border-thickness']
    },
    {
      title: 'Groups',
      caption: 'The radio and checkbox groups get their outline back.',
      names: ['--formidable-field-group-border-thickness']
    },
    {
      title: 'Toggle',
      caption: 'The toggle’s track, which is drawn by its border, gets it back.',
      names: ['--formidable-toggle-field-track-border-thickness']
    },
    {
      title: 'Slider',
      caption: 'The slider’s track gets its outline back. This is Midnight.',
      names: ['--formidable-slider-track-border-thickness']
    }
  ] satisfies readonly (Omit<LadderStep, 'declarations'> & { readonly names: readonly string[] })[]
).map(({ names, ...step }) => ({ ...step, declarations: names.map((name) => ({ name, value: LADDER_VARS[name]! })) }));

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

/** The sample field of a kind, reduced to one cell: no span, no condition, a short list, and no hint unless asked. */
export function sampleSpec(kind: PortalFieldKind, keepHint = false): PortalFieldSpec {
  const { visibleWhen: _visibleWhen, ...spec } = PREVIEW_FIELDS.find((field) => field.id === SAMPLE_IDS[kind])!;

  return {
    ...spec,
    span: 1,
    options: spec.options?.slice(0, MATRIX_OPTION_COUNT),
    decoration: { ...spec.decoration, hint: keepHint ? spec.decoration?.hint : '', labelPosition: undefined }
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
  /** Rendered with a rule reporting the field as required, so the library shows it invalid. */
  readonly invalid?: boolean;
}

export function withState(state: 'readonly' | 'disabled'): (spec: PortalFieldSpec) => PortalFieldSpec {
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
