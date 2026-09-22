import { FieldDecoratorLayout } from '@cynthion/ngx-formidable';
import { PortalFieldKind } from './field-spec.model';

/**
 * What one field kind can actually be configured with. `decoratorLayout` is fixed per field component and is
 * not an input, and the layout decides two of the answers outright: only `horizontal` honours a label
 * position other than `outside`, and `vertical` renders no prefix or suffix at all.
 *
 * The table exists so a page whose claim is that everything is configurable never offers a control that
 * silently does nothing.
 */
interface PortalFieldCapabilities {
  readonly layout: FieldDecoratorLayout;
  /** Whether a label position other than `outside` is honoured. */
  readonly labelPositions: boolean;
  /** Whether a projected prefix and suffix render. */
  readonly adornments: boolean;
  readonly placeholder: boolean;
  readonly options: boolean;
  /** Whether the field takes an entry that runs an action instead of becoming a value. Panel fields only. */
  readonly actionOption: boolean;
  readonly panel: boolean;
  readonly mask: boolean;
  readonly textLength: boolean;
  readonly locale: boolean;
  readonly range: boolean;
  /** Whether the field hands its filter text to the consumer, who supplies the narrowed list back. */
  readonly filter: boolean;
  /** Whether the field draws a panel toggle inside its own box, which a projected icon replaces. */
  readonly toggleIcon: boolean;
}

const HORIZONTAL = { layout: 'horizontal', labelPositions: true, adornments: true } as const;
const VERTICAL = { layout: 'vertical', labelPositions: false, adornments: false } as const;
const INLINE = { layout: 'inline', labelPositions: false, adornments: true } as const;

const OFF = {
  placeholder: false,
  options: false,
  actionOption: false,
  panel: false,
  mask: false,
  textLength: false,
  locale: false,
  range: false,
  filter: false,
  toggleIcon: false
} as const;

/** The capability table, keyed by field kind. Ships with the field model, before any editor reads it. */
export const FIELD_CAPABILITIES: Readonly<Record<PortalFieldKind, PortalFieldCapabilities>> = {
  'input': { ...HORIZONTAL, ...OFF, placeholder: true, mask: true, textLength: true },
  'textarea': { ...HORIZONTAL, ...OFF, placeholder: true, mask: true, textLength: true },
  'select': { ...HORIZONTAL, ...OFF, placeholder: true, options: true },
  'dropdown': { ...HORIZONTAL, ...OFF, placeholder: true, options: true, actionOption: true, panel: true },
  'autocomplete': {
    ...HORIZONTAL,
    ...OFF,
    placeholder: true,
    options: true,
    actionOption: true,
    panel: true,
    filter: true
  },
  'date': { ...HORIZONTAL, ...OFF, placeholder: true, panel: true, locale: true, toggleIcon: true },
  'time': { ...HORIZONTAL, ...OFF, placeholder: true, locale: true },
  'toggle': { ...INLINE, ...OFF },
  'slider': { ...INLINE, ...OFF, range: true },
  'radio-group': { ...VERTICAL, ...OFF, options: true },
  'checkbox-group': { ...VERTICAL, ...OFF, options: true },
  'counter': { ...HORIZONTAL, ...OFF, range: true }
};

/** Display names for the field kinds, used by the field list, the chips and the structure editor. */
export const FIELD_KIND_LABELS: Readonly<Record<PortalFieldKind, string>> = {
  'input': 'Input',
  'textarea': 'Textarea',
  'select': 'Select',
  'dropdown': 'Dropdown',
  'autocomplete': 'Autocomplete',
  'date': 'Date',
  'time': 'Time',
  'toggle': 'Toggle',
  'slider': 'Slider',
  'radio-group': 'Radio Group',
  'checkbox-group': 'Checkbox Group',
  'counter': 'Counter (custom field)'
};

/** The element a field kind renders as, which the markup serializer and parser both key off. */
export const FIELD_KIND_SELECTORS: Readonly<Record<PortalFieldKind, string>> = {
  'input': 'formidable-input-field',
  'textarea': 'formidable-textarea-field',
  'select': 'formidable-select-field',
  'dropdown': 'formidable-dropdown-field',
  'autocomplete': 'formidable-autocomplete-field',
  'date': 'formidable-date-field',
  'time': 'formidable-time-field',
  'toggle': 'formidable-toggle-field',
  'slider': 'formidable-slider-field',
  'radio-group': 'formidable-radio-group-field',
  'checkbox-group': 'formidable-checkbox-group-field',
  'counter': 'example-counter-field'
};

/** A field's value type, as TypeScript spells it. `user/components.md` states each one beside its selector. */
export type PortalValueType = 'string' | 'string[]' | 'Date' | 'boolean' | 'number';

/** What each kind writes into the model. The preview's shape and the exported component both read it. */
export const FIELD_KIND_VALUE_TYPES: Readonly<Record<PortalFieldKind, PortalValueType>> = {
  'input': 'string',
  'textarea': 'string',
  'select': 'string',
  'dropdown': 'string',
  'autocomplete': 'string',
  'date': 'Date',
  'time': 'Date',
  'toggle': 'boolean',
  'slider': 'number',
  'radio-group': 'string',
  'checkbox-group': 'string[]',
  'counter': 'number'
};

/** The reverse lookup the markup parser needs. */
export const FIELD_KIND_BY_SELECTOR: ReadonlyMap<string, PortalFieldKind> = new Map(
  Object.entries(FIELD_KIND_SELECTORS).map(([kind, selector]) => [selector, kind as PortalFieldKind])
);
