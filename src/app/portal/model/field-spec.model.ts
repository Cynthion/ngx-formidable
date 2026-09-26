import {
  FieldAdornmentAlignment,
  FieldDefaultOptionMode,
  FieldHintAlignment,
  FieldLabelPosition,
  FormidableDefaults,
  FormidableEmptyHint,
  FormidablePanelPosition,
  FormidableReveal,
  FormidableToggleFieldLabelPosition
} from '@cynthion/ngx-formidable';

/** Every field type the preview can render, including the demo's own custom field. */
export type PortalFieldKind =
  | 'input'
  | 'textarea'
  | 'select'
  | 'dropdown'
  | 'autocomplete'
  | 'date'
  | 'time'
  | 'toggle'
  | 'slider'
  | 'radio-group'
  | 'checkbox-group'
  | 'counter';

/** What an adornment slot holds. Adornments are content projection, so a slot picks a kind of content. */
export type PortalSlotContent = 'none' | 'icon' | 'text' | 'button';

/**
 * Display names for the label positions, and the portal's only list of them.
 *
 * A `Record` over the library's own union rather than an array, so adding a position to the library fails
 * the build here instead of silently going missing from the two editors and the markup import.
 */
export const LABEL_POSITION_LABELS: Readonly<Record<FieldLabelPosition, string>> = {
  'outside': 'Outside',
  'inside': 'Inside',
  'inside-placeholder': 'Inside, As Placeholder',
  'inside-floating': 'Inside, Floating Only',
  'border': 'Border',
  'border-prefix': 'Border, At The Prefix'
};

/** Display names for the adornment alignments, exhaustive over the library's union for the same reason. */
export const ADORNMENT_ALIGN_LABELS: Readonly<Record<FieldAdornmentAlignment, string>> = {
  center: 'Centre Of The Box',
  value: 'The Value'
};

/** Display names for the panel positions. */
export const PANEL_POSITION_LABELS: Readonly<Record<FormidablePanelPosition, string>> = {
  left: 'Left',
  right: 'Right',
  full: 'Full Width',
  sheet: 'Bottom Sheet'
};

/** Display names for when a field's messages appear. */
export const REVEAL_LABELS: Readonly<Record<FormidableReveal, string>> = {
  touched: 'Touched',
  dirty: 'Dirty',
  submitted: 'Submitted',
  always: 'Always'
};

/**
 * What the library falls back to where neither a binding nor an app default says anything. The panel
 * position differs per field, so it is the capability table's `panel` instead.
 */
export const LIBRARY_DEFAULTS = {
  labelPosition: 'inside',
  prefixAlign: 'center',
  suffixAlign: 'center',
  revealOn: 'touched',
  hideRequiredMarkers: false,
  debounceMs: 0
} as const satisfies Omit<Required<FormidableDefaults>, 'panelPosition'>;

/** Display names for the adornment slots, exhaustive over `PortalSlotContent` for the same reason. */
export const SLOT_LABELS: Readonly<Record<PortalSlotContent, string>> = {
  none: 'None',
  icon: 'Icon',
  text: 'Text',
  button: 'Button'
};

/** The named formatters offered in place of a code editor for the slider's function-typed inputs. */
type PortalFormatterId = 'none' | 'percent' | 'years' | 'currency' | 'ordinal';

/** The locales the date pair switches between, each moving translations, first day and token format at once. */
export type PortalLocaleId = 'en-GB' | 'en-US' | 'de-CH' | 'fr-FR' | 'ja-JP';

/**
 * How an autocomplete's consumer narrows the list.
 *
 * The field does not filter — it emits `filterChanged` and renders whatever it is handed back — so this is a
 * property of the portal's own filtering code, not of the component. Offering it as a setting is what makes
 * that division visible rather than merely stated.
 */
export type PortalFilterStrategy = 'fuzzy' | 'contains' | 'starts-with';

export const FILTER_STRATEGY_LABELS: Readonly<Record<PortalFilterStrategy, string>> = {
  'fuzzy': 'Fuzzy (fuse.js)',
  'contains': 'Contains',
  'starts-with': 'Starts With'
};

/**
 * What a field waits for before it renders: another field holding a given value.
 *
 * A condition rather than a predicate, because it has to survive a round trip through the exported template —
 * the serializer writes it as an `@if` and the import reads it back. Equality against one field is the whole
 * grammar, which is enough for the sample and is what keeps the Studio a form previewer rather than a form
 * builder.
 */
export interface PortalVisibilitySpec {
  /** The `name` of the field this one watches. */
  readonly field: string;
  readonly equals: string | number | boolean;
}

/** One option in an option field's list. */
export interface PortalOptionSpec {
  readonly value: string;
  readonly label: string;
  /** A second line, rendered by the custom option component the autocomplete projects. */
  readonly subtitle?: string;
  readonly readonly?: boolean;
  readonly disabled?: boolean;
}

/**
 * Label, adornments and hints for one field. The three optional members are what the library can default
 * app-wide: absent, the field states nothing and the app default applies, as it would in a template that
 * leaves the attribute out.
 */
export interface PortalFieldDecoration {
  readonly showLabel: boolean;
  readonly labelPosition?: FieldLabelPosition;
  readonly markRequired: boolean;
  readonly labelAdornment: PortalSlotContent;
  readonly prefix: PortalSlotContent;
  readonly prefixAlign?: FieldAdornmentAlignment;
  readonly suffix: PortalSlotContent;
  readonly suffixAlign?: FieldAdornmentAlignment;
  readonly hint: string;
  readonly hintAlign: FieldHintAlignment;
}

/** The state flags a field carries regardless of its kind. */
export interface PortalFieldState {
  readonly readonly: boolean;
  readonly disabled: boolean;
  readonly autoFocus: boolean;
}

/**
 * What a field decorates itself with before anything says otherwise.
 *
 * One copy, because the preview form's own fields and the fields the markup import builds are the same kind
 * of object — two copies drift, and the drift is invisible until an import renders differently from the
 * sample it was exported from.
 */
export const DEFAULT_DECORATION: PortalFieldDecoration = {
  showLabel: true,
  markRequired: false,
  labelAdornment: 'none',
  prefix: 'none',
  suffix: 'none',
  hint: '',
  hintAlign: 'start'
};

export const DEFAULT_STATE: PortalFieldState = { readonly: false, disabled: false, autoFocus: false };

/**
 * One field in the preview form. Flat and fully typed rather than a per-kind union: the renderer binds every
 * input it may need in one template, and `strictTemplates` refuses a bag of `unknown`.
 *
 * Which of the kind-specific members apply is the capability table's answer, not this type's — see
 * `field-capabilities.ts`.
 */
export interface PortalFieldSpec {
  /** Stable identity. Also the model key and the renderer's track-by, so a rename is a new field. */
  readonly id: string;
  readonly kind: PortalFieldKind;
  readonly sectionId: string;
  readonly name: string;
  readonly label: string;
  readonly placeholder: string;
  /** How many grid columns the field takes. */
  readonly span: 1 | 2;
  readonly decoration: PortalFieldDecoration;
  readonly state: PortalFieldState;
  /** Absent means always rendered. Present, the field is destroyed while the condition does not hold. */
  readonly visibleWhen?: PortalVisibilitySpec;
  /**
   * What choosing an option writes into the rest of the model, keyed by that option's value.
   *
   * A template picker: the field carries the patch its own options stand for, so picking one fills the
   * fields it decides and leaves every other alone. An option with no entry patches nothing, which is what
   * makes a `Custom` choice the absence of a rule rather than a special case.
   *
   * Keys are **top-level** model keys, not paths. That is what keeps the patch a spread, which is what the
   * exported component does too — a preset the Studio applies and the export cannot would be a divergence.
   */
  readonly presets?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;

  // Text fields
  readonly mask?: string;
  readonly showMaskTyped?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  /** The native autofill hint. Off by default, so a form leaks no value the consumer did not ask for. */
  readonly autocompleteHint?: AutoFill;
  readonly enableAutosize?: boolean;
  readonly showLengthIndicator?: boolean;

  // Panel fields
  /** Absent, the app default applies, then the field's own. */
  readonly panelPosition?: FormidablePanelPosition;

  // Option fields
  readonly options?: readonly PortalOptionSpec[];
  readonly defaultOption?: PortalOptionSpec;
  readonly defaultOptionMode?: FieldDefaultOptionMode;
  /** An entry that runs an action instead of becoming a value. The action itself lives in the component. */
  readonly actionOption?: PortalOptionSpec;
  readonly actionOptionMode?: FieldDefaultOptionMode;
  readonly noOptionsText?: string;
  readonly sortAlphabetically?: boolean;
  /** The autocomplete's filtering, which belongs to the consumer rather than to the field. */
  readonly filterStrategy?: PortalFilterStrategy;

  // Date and time
  readonly unicodeTokenFormat?: string;
  readonly emptyHint?: FormidableEmptyHint;
  readonly locale?: PortalLocaleId;

  // Toggle
  readonly toggleLabelPosition?: FormidableToggleFieldLabelPosition;
  readonly onLabel?: string;
  readonly offLabel?: string;

  // Slider and counter
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly minLabel?: string;
  readonly maxLabel?: string;
  readonly showThumbLabel?: boolean;
  readonly showTickMarks?: boolean;
  readonly showMinMaxLabels?: boolean;
  readonly showTickLabels?: boolean;
  readonly tickInterval?: number;
  readonly thumbLabelFormat?: PortalFormatterId;
  readonly tickLabelFormat?: PortalFormatterId;
}

/** A titled run of fields on the stage. */
export interface PortalSectionSpec {
  readonly id: string;
  readonly title: string;
  /**
   * Set, the section's fields are wrapped in an `ngModelGroup` of this name and their values nest under it.
   *
   * The group sits on the section rather than on each field: a group is a run of adjacent controls, which is
   * exactly what a section already is, and one member per field would be a second ordering to keep in step
   * with the first.
   */
  readonly groupName?: string;
}

/** Which validator the form is wired to, and so what the errors under each field come from. */
type PortalValidatorKind = 'vest' | 'angular' | 'none';

/**
 * The form-level options: the portal's master switches, and the form directive's own inputs.
 *
 * A label position, an adornment alignment and a panel position are not here: the library has no form-level
 * value for them, only a field's own and the app default. The two optional members are inputs the app
 * default covers too — absent, the form states nothing and the default applies.
 */
export interface PortalFormOptions {
  readonly showLabels: boolean;
  readonly hideRequiredMarkers?: boolean;
  readonly showHints: boolean;
  readonly showAdornments: boolean;
  readonly readonly: boolean;
  readonly disabled: boolean;
  readonly revealOn?: FormidableReveal;
  readonly updateOn: 'change' | 'blur' | 'submit';
  readonly validator: PortalValidatorKind;
  readonly locale: PortalLocaleId;
}

/** The whole preview form as one immutable tree. One signal holds this; nothing holds a slice of it. */
export interface PortalFormDefinition {
  /** The heading over the form on the stage. Decoration: the export carries fields, not this. */
  readonly title: string;
  /** The line under the heading. Empty renders nothing. */
  readonly intro: string;
  /** The submit button's label, and what it says once it has been pressed. */
  readonly submit: { readonly label: string; readonly accepted: string; readonly rejected: string };
  readonly sections: readonly PortalSectionSpec[];
  readonly fields: readonly PortalFieldSpec[];
  readonly options: PortalFormOptions;
}
