import { ThemeToken, ThemeTokenGroup, WrittenToken } from './token-manifest.model';

/**
 * Every `--formidable-*` custom property the portal may edit, curated rather than derived.
 *
 * The `declared` entries are the ones the library's `:root` block emits. The `overridable` entries are read
 * at a use site and never declared, so a generator reading only that block misses them — and they are exactly
 * the variables an asymmetric field shape needs. `LIBRARY_WRITTEN_TOKENS` is what the library overwrites on
 * every render, so exposing any of it would produce a control that appears to do nothing.
 *
 * Defaults are never stored here: the theme store reads them at runtime with `getComputedStyle`, so a default
 * cannot drift from the token that produces it. `token-manifest.spec.ts` asserts that this file and the
 * stylesheet agree in both directions.
 */
export const THEME_TOKENS: readonly ThemeToken[] = [
  {
    name: '--formidable-field-font-size',
    group: 'Font Sizes And Line Heights',
    control: 'length',
    class: 'declared',
    description: 'Base font size for form field text.'
  },
  {
    name: '--formidable-field-font-weight',
    group: 'Font Sizes And Line Heights',
    control: 'font-weight',
    class: 'declared',
    description: 'Font weight for form field text.'
  },
  {
    name: '--formidable-field-line-height',
    group: 'Font Sizes And Line Heights',
    control: 'multiplier',
    class: 'declared',
    description: 'Line height for form field text.'
  },
  {
    name: '--formidable-label-font-size',
    group: 'Font Sizes And Line Heights',
    control: 'length',
    class: 'declared',
    description: 'Font size for labels.'
  },
  {
    name: '--formidable-label-font-weight',
    group: 'Font Sizes And Line Heights',
    control: 'font-weight',
    class: 'declared',
    description: 'Font weight for labels.'
  },
  {
    name: '--formidable-label-line-height',
    group: 'Font Sizes And Line Heights',
    control: 'multiplier',
    class: 'declared',
    description: 'Line height for labels.'
  },
  {
    name: '--formidable-label-floating-font-size',
    group: 'Font Sizes And Line Heights',
    control: 'length',
    class: 'declared',
    description: 'Font size for a floating label.'
  },
  {
    name: '--formidable-label-floating-font-weight',
    group: 'Font Sizes And Line Heights',
    control: 'font-weight',
    class: 'declared',
    description: 'Font weight for a floating label.'
  },
  {
    name: '--formidable-label-floating-line-height',
    group: 'Font Sizes And Line Heights',
    control: 'multiplier',
    class: 'declared',
    description: 'Line height for a floating label.'
  },
  {
    name: '--formidable-field-validation-error-font-size',
    group: 'Font Sizes And Line Heights',
    control: 'length',
    class: 'declared',
    description: 'Font size for validation error messages.'
  },
  {
    name: '--formidable-field-validation-error-font-weight',
    group: 'Font Sizes And Line Heights',
    control: 'font-weight',
    class: 'declared',
    description: 'Font weight for validation error messages.'
  },
  {
    name: '--formidable-field-validation-error-line-height',
    group: 'Font Sizes And Line Heights',
    control: 'multiplier',
    class: 'declared',
    description: 'Line height for validation error messages.'
  },
  {
    name: '--formidable-field-hint-font-size',
    group: 'Font Sizes And Line Heights',
    control: 'length',
    class: 'declared',
    description: 'Font size for hint text.'
  },
  {
    name: '--formidable-field-hint-font-weight',
    group: 'Font Sizes And Line Heights',
    control: 'font-weight',
    class: 'declared',
    description: 'Font weight for hint text.'
  },
  {
    name: '--formidable-field-hint-line-height',
    group: 'Font Sizes And Line Heights',
    control: 'multiplier',
    class: 'declared',
    description: 'Line height for hint text.'
  },
  {
    name: '--formidable-length-indicator-font-size',
    group: 'Font Sizes And Line Heights',
    control: 'length',
    class: 'declared',
    description: 'Font size for the textarea length indicator.'
  },
  {
    name: '--formidable-length-indicator-font-weight',
    group: 'Font Sizes And Line Heights',
    control: 'font-weight',
    class: 'declared',
    description: 'Font weight for the textarea length indicator.'
  },
  {
    name: '--formidable-length-indicator-line-height',
    group: 'Font Sizes And Line Heights',
    control: 'multiplier',
    class: 'declared',
    description: 'Line height for the textarea length indicator.'
  },
  {
    name: '--formidable-slider-label-font-size',
    group: 'Font Sizes And Line Heights · Slider',
    control: 'length',
    class: 'declared',
    description: "Font size for a slider's thumb label and tick labels."
  },
  {
    name: '--formidable-slider-label-font-weight',
    group: 'Font Sizes And Line Heights · Slider',
    control: 'font-weight',
    class: 'declared',
    description: 'Font weight for those labels.'
  },
  {
    name: '--formidable-slider-label-line-height',
    group: 'Font Sizes And Line Heights · Slider',
    control: 'multiplier',
    class: 'declared',
    description: 'Line height for those labels.'
  },
  {
    name: '--formidable-field-before-margin-bottom',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Vertical margin below each field container.'
  },
  {
    name: '--formidable-border-radius',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    seed: true,
    description: "The library's base corner radius. Everything rounded that is not a field box falls back to it."
  },
  {
    name: '--formidable-field-border-thickness',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    seed: true,
    description:
      'Thickness of field borders. Also the default for the group border, the panel outline, the focus ring, the toggle track and the slider track — see [Borderless Themes](theming.md#4-five-things-that-will-catch-you-out).'
  },
  {
    name: '--formidable-field-focus-ring-width',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description:
      "Spread of the focus ring, on fields and on groups alike. Follows the field's border thickness unless set."
  },
  {
    name: '--formidable-field-border-radius',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-border-radius',
    description: 'Border-radius every corner of a field falls back to — see [Per-Corner Radius](#per-corner-radius).'
  },
  {
    name: '--formidable-field-underline-thickness',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: "Extra line painted inside a field's bottom edge. `0` paints none — see [Underline](#underline)."
  },
  {
    name: '--formidable-field-underline-thickness-focus',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Underline thickness while the field is focused.'
  },
  {
    name: '--formidable-field-underline-thickness-invalid',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Underline thickness while the field is invalid. Outranks the focused thickness.'
  },
  {
    name: '--formidable-field-group-border-thickness',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Thickness of field group borders.'
  },
  {
    name: '--formidable-field-group-border-radius',
    group: 'Field Dimensions',
    control: 'radius-shorthand',
    class: 'declared',
    description: 'Border-radius for field group corners.'
  },
  {
    name: '--formidable-label-height',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-label-line-height',
    description: 'Derived: height of the label text line box.'
  },
  {
    name: '--formidable-field-height',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    seed: true,
    description: 'Default height for single-line fields.'
  },
  {
    name: '--formidable-field-padding-x',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    seed: true,
    description: "Horizontal padding of a field: where its value, and a projected prefix's text, start."
  },
  {
    name: '--formidable-field-toggle-size',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Size of the panel toggle a dropdown or date field draws inside its own box.'
  },
  {
    name: '--formidable-field-toggle-inset',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description:
      "How much of a field's right edge that toggle claims. Raised by the decorator for the fields that have one."
  },
  {
    name: '--formidable-field-inner-height',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-field-height',
    description: "Derived: height inside a field's borders."
  },
  {
    name: '--formidable-field-value-height',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-field-line-height',
    description: "Derived: height of a field value's text line box."
  },
  {
    name: '--formidable-label-floating-height',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-label-floating-line-height',
    description: "Derived: height of a floating label's text line box."
  },
  {
    name: '--formidable-label-inside-slack',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-field-inner-height',
    description:
      'Derived: space above and below the centered label-plus-value block of a field with an inside label. Clamped at `0px`, so a field below the `44px` floor overflows instead of inverting.'
  },
  {
    name: '--formidable-label-inside-value-top',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-label-inside-slack',
    description: "Derived: offset of the value's text line box from the field's inner top, with an inside label."
  },
  {
    name: '--formidable-field-value-centered-top',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-field-inner-height',
    description:
      "Derived: offset of the value's text line box when it is centered in the field's inner height on its own."
  },
  {
    name: '--formidable-label-floating-offset',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-field-border-thickness',
    description: 'Vertical offset for a floating label, at the top of the centered label-plus-value block.'
  },
  {
    name: '--formidable-label-resting-offset',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-field-border-thickness',
    description: "Vertical offset for a resting label, centered in the field's inner height like a placeholder."
  },
  {
    name: '--formidable-label-border-offset',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-field-border-thickness',
    description: "Vertical offset for a `border` label, so its text line box straddles the field's top border."
  },
  {
    name: '--formidable-label-border-gap',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: "How far a `border` label's border-hiding band reaches either side of its text."
  },
  {
    name: '--formidable-label-border-band-bleed',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: 'How far that band outgrows the border above and below, so pixel rounding leaves no hairline showing.'
  },
  {
    name: '--formidable-label-border-band-reach',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: 'How much further that band reaches upwards while the field is at rest.'
  },
  {
    name: '--formidable-label-border-band-reach-focus',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description:
      "What that reach becomes while the field is focused, so the band covers the ring too. Follows the ring's width unless set."
  },
  {
    name: '--formidable-label-required-marker',
    group: 'Field Dimensions',
    control: 'quoted-string',
    class: 'declared',
    description: "The `content` string suffixed to a required field's label — `'*'`, or a word such as `' (required)'`."
  },
  {
    name: '--formidable-field-group-option-padding',
    group: 'Field Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Padding of options within a field group.'
  },
  {
    name: '--formidable-color-validation-error',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    seed: true,
    description: 'Text color for validation errors.'
  },
  {
    name: '--formidable-color-field-text',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    seed: true,
    description: 'Text color for fields.'
  },
  {
    name: '--formidable-color-field-group-text',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-text',
    description: 'Text color for field groups.'
  },
  {
    name: '--formidable-color-field-text-hovered',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description:
      'Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is hovered.'
  },
  {
    name: '--formidable-color-field-text-focus',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-text',
    description:
      'Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is focused.'
  },
  {
    name: '--formidable-color-field-text-invalid',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description:
      'Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is invalid.'
  },
  {
    name: '--formidable-color-field-text-readonly',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-text',
    description:
      'Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is readonly.'
  },
  {
    name: '--formidable-color-field-text-disabled',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-text',
    description:
      'Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is disabled.'
  },
  {
    name: '--formidable-color-field-placeholder',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    seed: true,
    description: 'Text color for placeholder text.'
  },
  {
    name: '--formidable-color-field-selection',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    seed: true,
    description: 'Background color for selected text.'
  },
  {
    name: '--formidable-color-field-border',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    seed: true,
    description: 'Border color for fields.'
  },
  {
    name: '--formidable-color-field-border-hovered',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Border color for fields that are hovered.'
  },
  {
    name: '--formidable-color-field-border-focus',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    seed: true,
    description: 'Border color for fields that are focused.'
  },
  {
    name: '--formidable-color-field-border-invalid',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description:
      "Border color for fields that are invalid. Also replaces the hover and focus border, and the field group's."
  },
  {
    name: '--formidable-color-field-border-readonly',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-field-border` when the field is readonly.'
  },
  {
    name: '--formidable-color-field-border-disabled',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-field-border` when the field is disabled.'
  },
  {
    name: '--formidable-color-field-group-border',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Border color for field groups.'
  },
  {
    name: '--formidable-color-field-group-border-focus',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Border color for field groups that are focused.'
  },
  {
    name: '--formidable-color-field-group-border-readonly',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-field-group-border` when the field is readonly.'
  },
  {
    name: '--formidable-color-field-group-border-disabled',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-field-group-border` when the field is disabled.'
  },
  {
    name: '--formidable-color-field-underline',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-border',
    description: "Color of a field's underline. Follows the border color through every state unless overridden."
  },
  {
    name: '--formidable-color-field-underline-focus',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Underline color while the field is focused.'
  },
  {
    name: '--formidable-color-field-underline-invalid',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Underline color while the field is invalid.'
  },
  {
    name: '--formidable-color-field-background',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    seed: true,
    description: 'Background color for fields.'
  },
  {
    name: '--formidable-color-field-group-background',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Background color for field groups.'
  },
  {
    name: '--formidable-color-field-background-hovered',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-selection',
    description:
      "Overrides `--formidable-color-field-background` when the field is hovered, and is what a group's hover fill defaults to."
  },
  {
    name: '--formidable-color-field-background-focus',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description:
      'Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is focused.'
  },
  {
    name: '--formidable-color-field-background-invalid',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description:
      'Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is invalid.'
  },
  {
    name: '--formidable-color-field-background-readonly',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-background',
    description:
      'Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is readonly.'
  },
  {
    name: '--formidable-color-field-background-disabled',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description:
      'Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is disabled.'
  },
  {
    name: '--formidable-color-field-group-background-hovered',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-field-group-background` when the field group is hovered.'
  },
  {
    name: '--formidable-color-field-group-background-readonly',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-field-group-background` when the field group is readonly.'
  },
  {
    name: '--formidable-color-field-group-background-disabled',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-field-group-background` when the field group is disabled.'
  },
  {
    name: '--formidable-color-field-label',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-text',
    description: 'Text color for labels.'
  },
  {
    name: '--formidable-color-field-label-floating',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    seed: true,
    description: 'Text color for a floating label.'
  },
  {
    name: '--formidable-color-field-label-resting',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Text color for a resting label, which stands in for the placeholder.'
  },
  {
    name: '--formidable-color-field-label-hovered',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides all three label colors when the field is hovered.'
  },
  {
    name: '--formidable-color-field-label-focus',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides all three label colors when the field is focused.'
  },
  {
    name: '--formidable-color-field-label-invalid',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides all three label colors when the field is invalid.'
  },
  {
    name: '--formidable-color-field-label-readonly',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides all three label colors when the field is readonly.'
  },
  {
    name: '--formidable-color-field-label-disabled',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides all three label colors when the field is disabled.'
  },
  {
    name: '--formidable-color-label-border-band',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Fill a `border` label paints over the border it hides. Follows the field background by default.'
  },
  {
    name: '--formidable-color-label-border-band-readonly',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-label-border-band` when the field is readonly.'
  },
  {
    name: '--formidable-color-label-border-band-disabled',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-label-border-band` when the field is disabled.'
  },
  {
    name: '--formidable-color-field-option-text-readonly',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Text color for option items that are readonly.'
  },
  {
    name: '--formidable-color-field-option-text-disabled',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Text color for option items that are disabled.'
  },
  {
    name: '--formidable-color-field-option-background-selected',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Background color for option items that are selected.'
  },
  {
    name: '--formidable-color-field-option-background-highlighted',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    description: 'Background color for option items that are highlighted.'
  },
  {
    name: '--formidable-color-field-option-background-hovered',
    group: 'Colors',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-placeholder',
    description: 'Background color for option items that are hovered.'
  },
  {
    name: '--formidable-color-field-focus-box-shadow',
    group: 'Colors',
    control: 'shadow',
    class: 'declared',
    derivedFrom: '--formidable-field-focus-ring-width',
    description: 'Box shadow for fields that are focused.'
  },
  {
    name: '--formidable-color-field-group-focus-box-shadow',
    group: 'Colors',
    control: 'shadow',
    class: 'declared',
    derivedFrom: '--formidable-field-focus-ring-width',
    description: 'Box shadow for field groups that are focused.'
  },
  {
    name: '--formidable-color-field-focus-box-shadow-invalid',
    group: 'Colors',
    control: 'shadow',
    class: 'declared',
    derivedFrom: '--formidable-field-focus-ring-width',
    description: 'Replaces both focus box shadows while the field is invalid.'
  },
  {
    name: '--formidable-color-toggle-field-background',
    group: 'Colors · Toggle',
    control: 'color',
    class: 'declared',
    description: "Fill of a toggle's track while off. Transparent by default."
  },
  {
    name: '--formidable-color-toggle-field-background-checked',
    group: 'Colors · Toggle',
    control: 'color',
    class: 'declared',
    description: 'Fill of the track while on.'
  },
  {
    name: '--formidable-color-toggle-thumb',
    group: 'Colors · Toggle',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-border',
    description: 'Fill of the thumb.'
  },
  {
    name: '--formidable-color-toggle-thumb-readonly',
    group: 'Colors · Toggle',
    control: 'color',
    class: 'declared',
    description: 'Overrides the thumb fill when the toggle is readonly.'
  },
  {
    name: '--formidable-color-toggle-thumb-disabled',
    group: 'Colors · Toggle',
    control: 'color',
    class: 'declared',
    description: 'Overrides the thumb fill when the toggle is disabled.'
  },
  {
    name: '--formidable-color-toggle-track-readonly',
    group: 'Colors · Toggle',
    control: 'color',
    class: 'declared',
    description: 'Overrides the track fill when the toggle is readonly.'
  },
  {
    name: '--formidable-color-toggle-track-disabled',
    group: 'Colors · Toggle',
    control: 'color',
    class: 'declared',
    description: 'Overrides the track fill when the toggle is disabled.'
  },
  {
    name: '--formidable-color-slider-background',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Fill of the track beyond the thumb.'
  },
  {
    name: '--formidable-color-slider-background-fill',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Fill of the track up to the thumb.'
  },
  {
    name: '--formidable-color-slider-border',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-border',
    description: 'Border color of the track. Takes the invalid border color along with the field.'
  },
  {
    name: '--formidable-color-slider-thumb',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-border',
    description: 'Fill of the thumb.'
  },
  {
    name: '--formidable-color-slider-tick-mark',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Color of the tick marks along the track.'
  },
  {
    name: '--formidable-color-slider-thumb-label',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Text color of the value label above the thumb.'
  },
  {
    name: '--formidable-color-slider-thumb-label-background',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Background of that label.'
  },
  {
    name: '--formidable-color-slider-thumb-label-border',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Border color of that label.'
  },
  {
    name: '--formidable-color-slider-thumb-border',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Border color of the thumb.'
  },
  {
    name: '--formidable-color-slider-thumb-readonly',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Overrides the thumb fill when the slider is readonly.'
  },
  {
    name: '--formidable-color-slider-thumb-disabled',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Overrides the thumb fill when the slider is disabled.'
  },
  {
    name: '--formidable-color-slider-track-readonly',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Overrides the unfilled track when the slider is readonly.'
  },
  {
    name: '--formidable-color-slider-track-disabled',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Overrides the unfilled track when the slider is disabled.'
  },
  {
    name: '--formidable-color-slider-track-filled-readonly',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Overrides the filled track when the slider is readonly.'
  },
  {
    name: '--formidable-color-slider-track-filled-disabled',
    group: 'Colors · Slider',
    control: 'color',
    class: 'declared',
    description: 'Overrides the filled track when the slider is disabled.'
  },
  {
    name: '--formidable-color-date-field-panel-select',
    group: 'Colors · Date Field Panel',
    control: 'color',
    class: 'declared',
    description: 'Text color for `Today` / selected date toggle in calendar.'
  },
  {
    name: '--formidable-color-date-field-panel-select-hovered',
    group: 'Colors · Date Field Panel',
    control: 'color',
    class: 'declared',
    description: 'Hover color for the `Today` toggle.'
  },
  {
    name: '--formidable-color-date-field-panel-date-highlighted-text',
    group: 'Colors · Date Field Panel',
    control: 'color',
    class: 'declared',
    description: 'Text color for highlighted dates inside the calendar.'
  },
  {
    name: '--formidable-color-date-field-panel-date-highlighted',
    group: 'Colors · Date Field Panel',
    control: 'color',
    class: 'declared',
    description: 'Background color for highlighted dates.'
  },
  {
    name: '--formidable-color-date-field-panel-date-hovered',
    group: 'Colors · Date Field Panel',
    control: 'color',
    class: 'declared',
    description: 'Background color when hovering a date.'
  },
  {
    name: '--formidable-color-date-field-panel-date-today',
    group: 'Colors · Date Field Panel',
    control: 'color',
    class: 'declared',
    description: 'Ring marking today, unless today is the selected date.'
  },
  {
    name: '--formidable-color-date-field-panel-date-out-of-range',
    group: 'Colors · Date Field Panel',
    control: 'color',
    class: 'declared',
    description: 'Color for dates outside the min/max range.'
  },
  {
    name: '--formidable-color-date-field-panel-day-label',
    group: 'Colors · Date Field Panel',
    control: 'color',
    class: 'declared',
    description: 'Color for weekday labels in the calendar header.'
  },
  {
    name: '--formidable-color-option-prefix-outer',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Color of the outer ring/square border of a radio/check box group field option item.'
  },
  {
    name: '--formidable-color-option-prefix-outer-readonly',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-option-prefix-outer` when the option is readonly.'
  },
  {
    name: '--formidable-color-option-prefix-outer-disabled',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-option-prefix-outer` when the option is disabled.'
  },
  {
    name: '--formidable-color-option-prefix-outer-selected',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-option-prefix-outer` when the option is selected.'
  },
  {
    name: '--formidable-color-option-prefix-outer-highlighted',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-option-prefix-outer` when the option is highlighted.'
  },
  {
    name: '--formidable-color-option-prefix-inner',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Color of the inner ring/square of a radio/check box group field option item.'
  },
  {
    name: '--formidable-color-option-prefix-inner-readonly',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-option-prefix-inner` when the option is readonly.'
  },
  {
    name: '--formidable-color-option-prefix-inner-disabled',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-option-prefix-inner` when the option is disabled.'
  },
  {
    name: '--formidable-color-option-prefix-inner-selected',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-option-prefix-inner` when the option is selected.'
  },
  {
    name: '--formidable-color-option-prefix-inner-highlighted',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Overrides `--formidable-color-option-prefix-inner` when the option is highlighted.'
  },
  {
    name: '--formidable-color-option-prefix-background',
    group: 'Colors · Option Prefix',
    control: 'color',
    class: 'declared',
    description: 'Background color behind option prefix elements.'
  },
  {
    name: '--formidable-color-field-hint',
    group: 'Colors · Hint',
    control: 'color',
    class: 'declared',
    derivedFrom: '--formidable-color-field-placeholder',
    description: 'Text color for hint text. Follows the field placeholder color by default.'
  },
  {
    name: '--formidable-color-length-indicator',
    group: 'Colors · Length Indicator',
    control: 'color',
    class: 'declared',
    description: 'Text color for the textarea length indicator.'
  },
  {
    name: '--formidable-textarea-min-height',
    group: 'Textarea',
    control: 'length',
    class: 'declared',
    description: 'Minimum height for textareas.'
  },
  {
    name: '--formidable-textarea-max-height',
    group: 'Textarea',
    control: 'length',
    class: 'declared',
    description: 'Maximum height for textareas.'
  },
  {
    name: '--formidable-textarea-padding-top',
    group: 'Textarea',
    control: 'length',
    class: 'declared',
    description: 'Top padding for textareas when autosizing is enabled.'
  },
  {
    name: '--formidable-toggle-field-width',
    group: 'Toggle',
    control: 'length',
    class: 'declared',
    description: "Width of the toggle's track."
  },
  {
    name: '--formidable-toggle-field-height',
    group: 'Toggle',
    control: 'length',
    class: 'declared',
    description: "Height of the toggle's track."
  },
  {
    name: '--formidable-toggle-field-track-border-radius',
    group: 'Toggle',
    control: 'length',
    class: 'declared',
    description: "Border-radius of a toggle field's track."
  },
  {
    name: '--formidable-toggle-field-thumb-size',
    group: 'Toggle',
    control: 'length',
    class: 'declared',
    description: 'Diameter of the thumb.'
  },
  {
    name: '--formidable-toggle-field-thumb-border-radius',
    group: 'Toggle',
    control: 'length',
    class: 'declared',
    description: "Border-radius of a toggle field's thumb."
  },
  {
    name: '--formidable-toggle-field-thumb-gap',
    group: 'Toggle',
    control: 'length',
    class: 'declared',
    description: 'Gap between the thumb and the inside of the track.'
  },
  {
    name: '--formidable-toggle-field-gap',
    group: 'Toggle',
    control: 'length',
    class: 'declared',
    description: 'Gap between the toggle and its on/off label.'
  },
  {
    name: '--formidable-slider-thumb-size',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Diameter of the thumb.'
  },
  {
    name: '--formidable-slider-track-height',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Height of the track.'
  },
  {
    name: '--formidable-slider-track-fill-height',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Height of the filled part of the track.'
  },
  {
    name: '--formidable-slider-track-border-thickness',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Border thickness of the track.'
  },
  {
    name: '--formidable-slider-track-border-radius',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Border-radius of the track.'
  },
  {
    name: '--formidable-slider-tick-mark-width',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Width of a tick mark.'
  },
  {
    name: '--formidable-slider-tick-mark-height',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Height of a tick mark.'
  },
  {
    name: '--formidable-slider-tick-mark-border-radius',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Border-radius of a tick mark.'
  },
  {
    name: '--formidable-slider-thumb-border-thickness',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Border thickness of the thumb.'
  },
  {
    name: '--formidable-slider-thumb-border-radius',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Border-radius of the thumb.'
  },
  {
    name: '--formidable-slider-thumb-label-distance',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Distance between the thumb and its value label.'
  },
  {
    name: '--formidable-slider-thumb-label-padding',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Padding inside that label.'
  },
  {
    name: '--formidable-slider-thumb-label-border-thickness',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Border thickness of that label.'
  },
  {
    name: '--formidable-slider-thumb-label-border-radius',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Border-radius of that label.'
  },
  {
    name: '--formidable-slider-tick-labels-margin-top',
    group: 'Slider',
    control: 'length',
    class: 'declared',
    description: 'Space between the track and the tick labels below it.'
  },
  {
    name: '--formidable-panel-background',
    group: 'Panels',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-color-field-background',
    description: 'Background color for dropdown/autocomplete/date panels.'
  },
  {
    name: '--formidable-panel-border-radius',
    group: 'Panels',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-border-radius',
    description:
      'Border-radius for all panels. The two corners a panel sits against its field with mirror that field instead.'
  },
  {
    name: '--formidable-panel-box-shadow',
    group: 'Panels',
    control: 'shadow',
    class: 'declared',
    description: 'Box-shadow for all panels. The edge a panel meets its field with does not cast.'
  },
  {
    name: '--formidable-panel-max-height',
    group: 'Panels',
    control: 'length',
    class: 'declared',
    description: 'Maximum vertical height for panels (before scrolling).'
  },
  {
    name: '--formidable-animation-duration',
    group: 'Animations',
    control: 'duration',
    class: 'declared',
    description: 'Duration for label/flyout/open/close animations.'
  },
  {
    name: '--formidable-animation-easing',
    group: 'Animations',
    control: 'easing',
    class: 'declared',
    description: 'Easing curve for animations.'
  },
  {
    name: '--formidable-hover-duration',
    group: 'Animations',
    control: 'duration',
    class: 'declared',
    description: 'Transition duration for hover effects.'
  },
  {
    name: '--formidable-hover-easing',
    group: 'Animations',
    control: 'easing',
    class: 'declared',
    description: 'Easing curve for hover transitions.'
  },
  {
    name: '--formidable-panel-z-index',
    group: 'Layering',
    control: 'integer',
    class: 'declared',
    description: 'z-index a field rises to while an anchored panel is open.'
  },
  {
    name: '--formidable-sheet-z-index',
    group: 'Layering',
    control: 'integer',
    class: 'declared',
    description: 'z-index a field rises to while a `sheet` panel is open.'
  },
  {
    name: '--formidable-date-field-panel-width',
    group: 'Date Field Panel',
    control: 'length',
    class: 'declared',
    description: 'Width the calendar prefers; it scales down into a narrower panel.'
  },
  {
    name: '--formidable-date-field-panel-border-radius',
    group: 'Date Field Panel',
    control: 'length',
    class: 'declared',
    description: 'Border-radius for the date-picker panel.'
  },
  {
    name: '--formidable-option-prefix-dimension-outer',
    group: 'Option Prefix Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Size of the outer circle/box for radio/checkbox prefixes.'
  },
  {
    name: '--formidable-option-prefix-dimension-inner',
    group: 'Option Prefix Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Size of the inner indicator for selected radio/checkbox prefixes.'
  },
  {
    name: '--formidable-option-prefix-inset',
    group: 'Option Prefix Dimensions',
    control: 'length',
    class: 'declared',
    derivedFrom: '--formidable-field-padding-x',
    description:
      "Where a radio/checkbox prefix starts, and a group's empty state with it. Set it to `0px` to left-align a group."
  },
  {
    name: '--formidable-option-prefix-gap',
    group: 'Option Prefix Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Gap between a radio/checkbox prefix and its option label.'
  },
  {
    name: '--formidable-option-prefix-border-thickness',
    group: 'Option Prefix Dimensions',
    control: 'length',
    class: 'declared',
    description: 'Border thickness of the outer circle/box for radio/checkbox prefixes.'
  },
  {
    name: '--formidable-field-border-start-start-radius',
    group: 'Field Dimensions',
    control: 'length',
    class: 'overridable',
    derivedFrom: '--formidable-field-border-radius',
    description: "A field's top-left corner alone. Falls back to `--formidable-field-border-radius`."
  },
  {
    name: '--formidable-field-border-start-end-radius',
    group: 'Field Dimensions',
    control: 'length',
    class: 'overridable',
    derivedFrom: '--formidable-field-border-radius',
    description: 'Its top-right corner alone.'
  },
  {
    name: '--formidable-field-border-end-end-radius',
    group: 'Field Dimensions',
    control: 'length',
    class: 'overridable',
    derivedFrom: '--formidable-field-border-radius',
    description: 'Its bottom-right corner alone.'
  },
  {
    name: '--formidable-field-border-end-start-radius',
    group: 'Field Dimensions',
    control: 'length',
    class: 'overridable',
    derivedFrom: '--formidable-field-border-radius',
    description: 'Its bottom-left corner alone.'
  },
  {
    name: '--formidable-panel-border-thickness',
    group: 'Panels',
    control: 'length',
    class: 'overridable',
    derivedFrom: '--formidable-field-border-thickness',
    description:
      "Thickness of a panel's outline. Follows the field's border thickness unless set, so a borderless theme states it to keep the outline."
  },
  {
    name: '--formidable-toggle-field-track-border-thickness',
    group: 'Toggle',
    control: 'length',
    class: 'overridable',
    derivedFrom: '--formidable-field-border-thickness',
    description:
      "Border thickness of the track, which is what draws it. Follows the field's border thickness unless set — see [Underline](#underline)."
  }
];

/** What the library writes itself as a field measures its own content. Never editable. */
export const LIBRARY_WRITTEN_TOKENS: readonly WrittenToken[] = [
  { name: '--formidable-field-prefix-inset', setBy: 'The decorator, once it has measured a projected prefix.' },
  { name: '--formidable-field-suffix-inset', setBy: 'The decorator, for a projected suffix.' },
  { name: '--formidable-field-ring-shadow', setBy: 'The field, while focused.' },
  { name: '--formidable-field-value-padding-top', setBy: 'The decorator, to clear an inside label.' },
  { name: '--formidable-field-value-top', setBy: "The decorator, to place the value's line box." },
  { name: '--formidable-slider-thumb-transform', setBy: 'The slider, as its value changes.' }
];

/** Manifest groups in the order the `All Variables` disclosure lists them. */
export const THEME_TOKEN_GROUPS: readonly ThemeTokenGroup[] = [
  'Font Sizes And Line Heights',
  'Font Sizes And Line Heights · Slider',
  'Field Dimensions',
  'Colors',
  'Colors · Toggle',
  'Colors · Slider',
  'Colors · Date Field Panel',
  'Colors · Option Prefix',
  'Colors · Hint',
  'Colors · Length Indicator',
  'Textarea',
  'Toggle',
  'Slider',
  'Panels',
  'Animations',
  'Layering',
  'Date Field Panel',
  'Option Prefix Dimensions'
];

/** Indexed by name, for the per-token lookups the editor and the importer both do. */
export const THEME_TOKENS_BY_NAME: ReadonlyMap<string, ThemeToken> = new Map(
  THEME_TOKENS.map((token) => [token.name, token])
);
