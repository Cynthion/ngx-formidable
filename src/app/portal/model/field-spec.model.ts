import {
  FieldAdornmentAlignment,
  FieldDefaultOptionMode,
  FieldHintAlignment,
  FieldLabelPosition,
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

/** One option in an option field's list. */
export interface PortalOptionSpec {
  readonly value: string;
  readonly label: string;
  /** A second line, rendered by the custom option component the autocomplete projects. */
  readonly subtitle?: string;
  readonly readonly?: boolean;
  readonly disabled?: boolean;
}

/** Label, adornments and hints for one field. Every slot is per-field; the form supplies the defaults. */
export interface PortalFieldDecoration {
  readonly showLabel: boolean;
  readonly labelPosition: FieldLabelPosition;
  readonly showRequiredMarker: boolean;
  readonly labelAdornment: PortalSlotContent;
  readonly prefix: PortalSlotContent;
  readonly prefixAlign: FieldAdornmentAlignment;
  readonly suffix: PortalSlotContent;
  readonly suffixAlign: FieldAdornmentAlignment;
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
  readonly panelPosition?: FormidablePanelPosition;

  // Option fields
  readonly options?: readonly PortalOptionSpec[];
  readonly defaultOption?: PortalOptionSpec;
  readonly defaultOptionMode?: FieldDefaultOptionMode;
  readonly noOptionsText?: string;
  readonly sortAlphabetically?: boolean;

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
}

/** Which validator the form is wired to, and so what the errors under each field come from. */
type PortalValidatorKind = 'vest' | 'angular' | 'none';

/**
 * The form-level options, which every field takes unless it states its own.
 *
 * Only what the form really owns. A label position and an adornment alignment are per-field decoration, so
 * the form-scope controls for those bulk-set every field rather than keeping a second value here — one that
 * nothing could read without leaving the field's own unreadable.
 */
export interface PortalFormOptions {
  readonly showLabels: boolean;
  readonly showRequiredMarkers: boolean;
  readonly showHints: boolean;
  readonly showAdornments: boolean;
  readonly panelPosition: FormidablePanelPosition;
  readonly readonly: boolean;
  readonly disabled: boolean;
  readonly revealOn: FormidableReveal;
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
