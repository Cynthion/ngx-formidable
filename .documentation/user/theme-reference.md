# Theme Reference

Every overridable `--formidable-*` custom property, grouped by what it paints. How theming works, and which of these you actually need, is in `user/theming.md`; complete schemes to start from are in the Studio, which `user/studio.md` covers.

---

## Font Sizes And Line Heights

| Variable                                          | Description                                    |
| :------------------------------------------------ | :--------------------------------------------- |
| `--formidable-field-font-size`                    | Base font size for form field text.            |
| `--formidable-field-font-weight`                  | Font weight for form field text.               |
| `--formidable-field-line-height`                  | Line height for form field text.               |
| `--formidable-label-font-size`                    | Font size for labels.                          |
| `--formidable-label-font-weight`                  | Font weight for labels.                        |
| `--formidable-label-line-height`                  | Line height for labels.                        |
| `--formidable-label-floating-font-size`           | Font size for a floating label.                |
| `--formidable-label-floating-font-weight`         | Font weight for a floating label.              |
| `--formidable-label-floating-line-height`         | Line height for a floating label.              |
| `--formidable-field-validation-error-font-size`   | Font size for validation error messages.       |
| `--formidable-field-validation-error-font-weight` | Font weight for validation error messages.     |
| `--formidable-field-validation-error-line-height` | Line height for validation error messages.     |
| `--formidable-field-hint-font-size`               | Font size for hint text.                       |
| `--formidable-field-hint-font-weight`             | Font weight for hint text.                     |
| `--formidable-field-hint-line-height`             | Line height for hint text.                     |
| `--formidable-length-indicator-font-size`         | Font size for the textarea length indicator.   |
| `--formidable-length-indicator-font-weight`       | Font weight for the textarea length indicator. |
| `--formidable-length-indicator-line-height`       | Line height for the textarea length indicator. |

#### Slider

| Variable                                | Description                                           |
| :-------------------------------------- | :---------------------------------------------------- |
| `--formidable-slider-label-font-size`   | Font size for a slider's thumb label and tick labels. |
| `--formidable-slider-label-font-weight` | Font weight for those labels.                         |
| `--formidable-slider-label-line-height` | Line height for those labels.                         |

---

## Field Dimensions

| Variable                                         | Description                                                                                                                                                                                                              |
| :----------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--formidable-field-before-margin-bottom`        | Vertical margin below each field container.                                                                                                                                                                              |
| `--formidable-border-radius`                     | The library's base corner radius. Everything rounded that is not a field box falls back to it.                                                                                                                           |
| `--formidable-field-border-thickness`            | Thickness of field borders. Also the default for the group border, the panel outline, the focus ring, the toggle track and the slider track — see [Borderless Themes](theming.md#4-five-things-that-will-catch-you-out). |
| `--formidable-field-focus-ring-width`            | Spread of the focus ring, on fields and on groups alike. Follows the field's border thickness unless set.                                                                                                                |
| `--formidable-field-border-radius`               | Border-radius every corner of a field falls back to — see [Per-Corner Radius](#per-corner-radius).                                                                                                                       |
| `--formidable-field-border-start-start-radius`   | A field's top-left corner alone. Falls back to `--formidable-field-border-radius`.                                                                                                                                       |
| `--formidable-field-border-start-end-radius`     | Its top-right corner alone.                                                                                                                                                                                              |
| `--formidable-field-border-end-end-radius`       | Its bottom-right corner alone.                                                                                                                                                                                           |
| `--formidable-field-border-end-start-radius`     | Its bottom-left corner alone.                                                                                                                                                                                            |
| `--formidable-field-underline-thickness`         | Extra line painted inside a field's bottom edge. `0` paints none — see [Underline](#underline).                                                                                                                          |
| `--formidable-field-underline-thickness-focus`   | Underline thickness while the field is focused.                                                                                                                                                                          |
| `--formidable-field-underline-thickness-invalid` | Underline thickness while the field is invalid. Outranks the focused thickness.                                                                                                                                          |
| `--formidable-field-group-border-thickness`      | Thickness of field group borders.                                                                                                                                                                                        |
| `--formidable-field-group-border-radius`         | Border-radius for field group corners.                                                                                                                                                                                   |
| `--formidable-label-height`                      | Derived: height of the label text line box.                                                                                                                                                                              |
| `--formidable-field-height`                      | Default height for single-line fields.                                                                                                                                                                                   |
| `--formidable-field-padding-x`                   | Horizontal padding of a field: where its value, and a projected prefix's text, start.                                                                                                                                    |
| `--formidable-field-toggle-size`                 | Size of the toggle a select, dropdown or date field draws inside its own box.                                                                                                                                            |
| `--formidable-field-toggle-inset`                | How much of a field's right edge that toggle claims. Raised by the decorator for the fields that have one.                                                                                                               |
| `--formidable-field-inner-height`                | Derived: height inside a field's borders.                                                                                                                                                                                |
| `--formidable-field-value-height`                | Derived: height of a field value's text line box.                                                                                                                                                                        |
| `--formidable-label-floating-height`             | Derived: height of a floating label's text line box.                                                                                                                                                                     |
| `--formidable-label-inside-slack`                | Derived: space above and below the centered label-plus-value block of a field with an inside label. Clamped at `0px`, so a field below the `44px` floor overflows instead of inverting.                                  |
| `--formidable-label-inside-value-top`            | Derived: offset of the value's text line box from the field's inner top, with an inside label.                                                                                                                           |
| `--formidable-field-value-centered-top`          | Derived: offset of the value's text line box when it is centered in the field's inner height on its own.                                                                                                                 |
| `--formidable-label-floating-offset`             | Vertical offset for a floating label, at the top of the centered label-plus-value block.                                                                                                                                 |
| `--formidable-label-resting-offset`              | Vertical offset for a resting label, centered in the field's inner height like a placeholder.                                                                                                                            |
| `--formidable-label-border-offset`               | Vertical offset for a `border` label, so its text line box straddles the field's top border.                                                                                                                             |
| `--formidable-label-border-gap`                  | How far a `border` label's border-hiding band reaches either side of its text.                                                                                                                                           |
| `--formidable-label-border-band-bleed`           | How far that band outgrows the border above and below, so pixel rounding leaves no hairline showing.                                                                                                                     |
| `--formidable-label-border-band-reach`           | How much further that band reaches upwards while the field is at rest.                                                                                                                                                   |
| `--formidable-label-border-band-reach-focus`     | What that reach becomes while the field is focused, so the band covers the ring too. Follows the ring's width unless set.                                                                                                |
| `--formidable-label-required-marker`             | The `content` string suffixed to a required field's label — `'*'`, or a word such as `' (required)'`.                                                                                                                    |
| `--formidable-field-group-option-padding`        | Padding of options within a field group.                                                                                                                                                                                 |

---

## Colors

| Variable                                                 | Description                                                                                                                 |
| :------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `--formidable-color-validation-error`                    | Text color for validation errors.                                                                                           |
| `--formidable-color-field-text`                          | Text color for fields.                                                                                                      |
| `--formidable-color-field-group-text`                    | Text color for field groups.                                                                                                |
| `--formidable-color-field-text-hovered`                  | Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is hovered.              |
| `--formidable-color-field-text-focus`                    | Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is focused.              |
| `--formidable-color-field-text-invalid`                  | Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is invalid.              |
| `--formidable-color-field-text-readonly`                 | Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is readonly.             |
| `--formidable-color-field-text-disabled`                 | Overrides `--formidable-color-field-text` and `--formidable-color-field-group-text` when the field is disabled.             |
| `--formidable-color-field-placeholder`                   | Text color for placeholder text.                                                                                            |
| `--formidable-color-field-selection`                     | Background color for selected text.                                                                                         |
| `--formidable-color-field-border`                        | Border color for fields.                                                                                                    |
| `--formidable-color-field-border-hovered`                | Border color for fields that are hovered.                                                                                   |
| `--formidable-color-field-border-focus`                  | Border color for fields that are focused.                                                                                   |
| `--formidable-color-field-border-invalid`                | Border color for fields that are invalid. Also replaces the hover and focus border, and the field group's.                  |
| `--formidable-color-field-border-readonly`               | Overrides `--formidable-color-field-border` when the field is readonly.                                                     |
| `--formidable-color-field-border-disabled`               | Overrides `--formidable-color-field-border` when the field is disabled.                                                     |
| `--formidable-color-field-group-border`                  | Border color for field groups.                                                                                              |
| `--formidable-color-field-group-border-focus`            | Border color for field groups that are focused.                                                                             |
| `--formidable-color-field-group-border-readonly`         | Overrides `--formidable-color-field-group-border` when the field is readonly.                                               |
| `--formidable-color-field-group-border-disabled`         | Overrides `--formidable-color-field-group-border` when the field is disabled.                                               |
| `--formidable-color-field-underline`                     | Color of a field's underline. Follows the border color through every state unless overridden.                               |
| `--formidable-color-field-underline-focus`               | Underline color while the field is focused.                                                                                 |
| `--formidable-color-field-underline-invalid`             | Underline color while the field is invalid.                                                                                 |
| `--formidable-color-field-background`                    | Background color for fields.                                                                                                |
| `--formidable-color-field-group-background`              | Background color for field groups.                                                                                          |
| `--formidable-color-field-background-hovered`            | Overrides `--formidable-color-field-background` when the field is hovered, and is what a group's hover fill defaults to.    |
| `--formidable-color-field-background-focus`              | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is focused.  |
| `--formidable-color-field-background-invalid`            | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is invalid.  |
| `--formidable-color-field-background-readonly`           | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is readonly. |
| `--formidable-color-field-background-disabled`           | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is disabled. |
| `--formidable-color-field-group-background-hovered`      | Overrides `--formidable-color-field-group-background` when the field group is hovered.                                      |
| `--formidable-color-field-group-background-readonly`     | Overrides `--formidable-color-field-group-background` when the field group is readonly.                                     |
| `--formidable-color-field-group-background-disabled`     | Overrides `--formidable-color-field-group-background` when the field group is disabled.                                     |
| `--formidable-color-field-label`                         | Text color for labels.                                                                                                      |
| `--formidable-color-field-label-floating`                | Text color for a floating label.                                                                                            |
| `--formidable-color-field-label-resting`                 | Text color for a resting label, which stands in for the placeholder.                                                        |
| `--formidable-color-field-label-hovered`                 | Overrides all three label colors when the field is hovered.                                                                 |
| `--formidable-color-field-label-focus`                   | Overrides all three label colors when the field is focused.                                                                 |
| `--formidable-color-field-label-invalid`                 | Overrides all three label colors when the field is invalid.                                                                 |
| `--formidable-color-field-label-readonly`                | Overrides all three label colors when the field is readonly.                                                                |
| `--formidable-color-field-label-disabled`                | Overrides all three label colors when the field is disabled.                                                                |
| `--formidable-color-label-border-band`                   | Fill a `border` label paints over the border it hides. Follows the field background by default.                             |
| `--formidable-color-label-border-band-readonly`          | Overrides `--formidable-color-label-border-band` when the field is readonly.                                                |
| `--formidable-color-label-border-band-disabled`          | Overrides `--formidable-color-label-border-band` when the field is disabled.                                                |
| `--formidable-color-field-option-text-readonly`          | Text color for option items that are readonly.                                                                              |
| `--formidable-color-field-option-text-disabled`          | Text color for option items that are disabled.                                                                              |
| `--formidable-color-field-option-background-selected`    | Background color for option items that are selected.                                                                        |
| `--formidable-color-field-option-background-highlighted` | Background color for option items that are highlighted.                                                                     |
| `--formidable-color-field-option-background-hovered`     | Background color for option items that are hovered.                                                                         |
| `--formidable-color-field-focus-box-shadow`              | Box shadow for fields that are focused.                                                                                     |
| `--formidable-color-field-group-focus-box-shadow`        | Box shadow for field groups that are focused.                                                                               |
| `--formidable-color-field-focus-box-shadow-invalid`      | Replaces both focus box shadows while the field is invalid.                                                                 |

#### Toggle

| Variable                                             | Description                                                 |
| :--------------------------------------------------- | :---------------------------------------------------------- |
| `--formidable-color-toggle-field-background`         | Fill of a toggle's track while off. Transparent by default. |
| `--formidable-color-toggle-field-background-checked` | Fill of the track while on.                                 |
| `--formidable-color-toggle-thumb`                    | Fill of the thumb.                                          |
| `--formidable-color-toggle-thumb-readonly`           | Overrides the thumb fill when the toggle is readonly.       |
| `--formidable-color-toggle-thumb-disabled`           | Overrides the thumb fill when the toggle is disabled.       |
| `--formidable-color-toggle-track-readonly`           | Overrides the track fill when the toggle is readonly.       |
| `--formidable-color-toggle-track-disabled`           | Overrides the track fill when the toggle is disabled.       |

#### Slider

| Variable                                           | Description                                                                     |
| :------------------------------------------------- | :------------------------------------------------------------------------------ |
| `--formidable-color-slider-background`             | Fill of the track beyond the thumb.                                             |
| `--formidable-color-slider-background-fill`        | Fill of the track up to the thumb.                                              |
| `--formidable-color-slider-border`                 | Border color of the track. Takes the invalid border color along with the field. |
| `--formidable-color-slider-thumb`                  | Fill of the thumb.                                                              |
| `--formidable-color-slider-tick-mark`              | Color of the tick marks along the track.                                        |
| `--formidable-color-slider-thumb-label`            | Text color of the value label above the thumb.                                  |
| `--formidable-color-slider-thumb-label-background` | Background of that label.                                                       |
| `--formidable-color-slider-thumb-label-border`     | Border color of that label.                                                     |
| `--formidable-color-slider-thumb-border`           | Border color of the thumb.                                                      |
| `--formidable-color-slider-thumb-readonly`         | Overrides the thumb fill when the slider is readonly.                           |
| `--formidable-color-slider-thumb-disabled`         | Overrides the thumb fill when the slider is disabled.                           |
| `--formidable-color-slider-track-readonly`         | Overrides the unfilled track when the slider is readonly.                       |
| `--formidable-color-slider-track-disabled`         | Overrides the unfilled track when the slider is disabled.                       |
| `--formidable-color-slider-track-filled-readonly`  | Overrides the filled track when the slider is readonly.                         |
| `--formidable-color-slider-track-filled-disabled`  | Overrides the filled track when the slider is disabled.                         |

#### Date Field Panel

| Variable                                                    | Description                                                |
| :---------------------------------------------------------- | :--------------------------------------------------------- |
| `--formidable-color-date-field-panel-select`                | Text color for `Today` / selected date toggle in calendar. |
| `--formidable-color-date-field-panel-select-hovered`        | Hover color for the `Today` toggle.                        |
| `--formidable-color-date-field-panel-date-highlighted-text` | Text color for highlighted dates inside the calendar.      |
| `--formidable-color-date-field-panel-date-highlighted`      | Background color for highlighted dates.                    |
| `--formidable-color-date-field-panel-date-hovered`          | Background color when hovering a date.                     |
| `--formidable-color-date-field-panel-date-today`            | Ring marking today, unless today is the selected date.     |
| `--formidable-color-date-field-panel-date-out-of-range`     | Color for dates outside the min/max range.                 |
| `--formidable-color-date-field-panel-day-label`             | Color for weekday labels in the calendar header.           |

#### Option Prefix

| Variable                                             | Description                                                                         |
| :--------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `--formidable-color-option-prefix-outer`             | Color of the outer ring/square border of a radio/check box group field option item. |
| `--formidable-color-option-prefix-outer-readonly`    | Overrides `--formidable-color-option-prefix-outer` when the option is readonly.     |
| `--formidable-color-option-prefix-outer-disabled`    | Overrides `--formidable-color-option-prefix-outer` when the option is disabled.     |
| `--formidable-color-option-prefix-outer-selected`    | Overrides `--formidable-color-option-prefix-outer` when the option is selected.     |
| `--formidable-color-option-prefix-outer-highlighted` | Overrides `--formidable-color-option-prefix-outer` when the option is highlighted.  |
| `--formidable-color-option-prefix-inner`             | Color of the inner ring/square of a radio/check box group field option item.        |
| `--formidable-color-option-prefix-inner-readonly`    | Overrides `--formidable-color-option-prefix-inner` when the option is readonly.     |
| `--formidable-color-option-prefix-inner-disabled`    | Overrides `--formidable-color-option-prefix-inner` when the option is disabled.     |
| `--formidable-color-option-prefix-inner-selected`    | Overrides `--formidable-color-option-prefix-inner` when the option is selected.     |
| `--formidable-color-option-prefix-inner-highlighted` | Overrides `--formidable-color-option-prefix-inner` when the option is highlighted.  |
| `--formidable-color-option-prefix-background`        | Background color behind option prefix elements.                                     |

#### Hint

| Variable                        | Description                                                               |
| :------------------------------ | :------------------------------------------------------------------------ |
| `--formidable-color-field-hint` | Text color for hint text. Follows the field placeholder color by default. |

#### Length Indicator

| Variable                              | Description                                   |
| :------------------------------------ | :-------------------------------------------- |
| `--formidable-color-length-indicator` | Text color for the textarea length indicator. |

---

## Textarea

| Variable                            | Description                                           |
| :---------------------------------- | :---------------------------------------------------- |
| `--formidable-textarea-min-height`  | Minimum height for textareas.                         |
| `--formidable-textarea-max-height`  | Maximum height for textareas.                         |
| `--formidable-textarea-padding-top` | Top padding for textareas when autosizing is enabled. |

---

## Toggle

| Variable                                           | Description                                                                                                                           |
| :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `--formidable-toggle-field-width`                  | Width of the toggle's track.                                                                                                          |
| `--formidable-toggle-field-height`                 | Height of the toggle's track.                                                                                                         |
| `--formidable-toggle-field-track-border-thickness` | Border thickness of the track, which is what draws it. Follows the field's border thickness unless set — see [Underline](#underline). |
| `--formidable-toggle-field-track-border-radius`    | Border-radius of a toggle field's track.                                                                                              |
| `--formidable-toggle-field-thumb-size`             | Diameter of the thumb.                                                                                                                |
| `--formidable-toggle-field-thumb-border-radius`    | Border-radius of a toggle field's thumb.                                                                                              |
| `--formidable-toggle-field-thumb-gap`              | Gap between the thumb and the inside of the track.                                                                                    |
| `--formidable-toggle-field-gap`                    | Gap between the toggle and its on/off label.                                                                                          |

---

## Slider

| Variable                                           | Description                                           |
| :------------------------------------------------- | :---------------------------------------------------- |
| `--formidable-slider-thumb-size`                   | Diameter of the thumb.                                |
| `--formidable-slider-track-height`                 | Height of the track.                                  |
| `--formidable-slider-track-fill-height`            | Height of the filled part of the track.               |
| `--formidable-slider-track-border-thickness`       | Border thickness of the track.                        |
| `--formidable-slider-track-border-radius`          | Border-radius of the track.                           |
| `--formidable-slider-tick-mark-width`              | Width of a tick mark.                                 |
| `--formidable-slider-tick-mark-height`             | Height of a tick mark.                                |
| `--formidable-slider-tick-mark-border-radius`      | Border-radius of a tick mark.                         |
| `--formidable-slider-thumb-border-thickness`       | Border thickness of the thumb.                        |
| `--formidable-slider-thumb-border-radius`          | Border-radius of the thumb.                           |
| `--formidable-slider-thumb-label-distance`         | Distance between the thumb and its value label.       |
| `--formidable-slider-thumb-label-padding`          | Padding inside that label.                            |
| `--formidable-slider-thumb-label-border-thickness` | Border thickness of that label.                       |
| `--formidable-slider-thumb-label-border-radius`    | Border-radius of that label.                          |
| `--formidable-slider-tick-labels-margin-top`       | Space between the track and the tick labels below it. |

---

## Panels

| Variable                              | Description                                                                                                                           |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------ |
| `--formidable-panel-background`       | Background color for dropdown/autocomplete/date panels.                                                                               |
| `--formidable-panel-border-thickness` | Thickness of a panel's outline. Follows the field's border thickness unless set, so a borderless theme states it to keep the outline. |
| `--formidable-panel-border-radius`    | Border-radius for all panels. The two corners a panel sits against its field with mirror that field instead.                          |
| `--formidable-panel-box-shadow`       | Box-shadow for all panels. The edge a panel meets its field with does not cast.                                                       |
| `--formidable-panel-max-height`       | Maximum vertical height for panels (before scrolling).                                                                                |

---

## Animations

| Variable                          | Description                                      |
| :-------------------------------- | :----------------------------------------------- |
| `--formidable-animation-duration` | Duration for label/flyout/open/close animations. |
| `--formidable-animation-easing`   | Easing curve for animations.                     |
| `--formidable-hover-duration`     | Transition duration for hover effects.           |
| `--formidable-hover-easing`       | Easing curve for hover transitions.              |

---

## Layering

| Variable                     | Description                                               |
| :--------------------------- | :-------------------------------------------------------- |
| `--formidable-panel-z-index` | z-index a field rises to while an anchored panel is open. |
| `--formidable-sheet-z-index` | z-index a field rises to while a `sheet` panel is open.   |

**To keep your own chrome above an open panel**, put it one above the higher of the two rather than picking a number — the two cannot then drift apart:

```scss
.app-header {
  z-index: calc(var(--formidable-sheet-z-index, 1000) + 1);
}
```

Weigh it first: a header that wins covers an open dropdown scrolled underneath it, and a footer that wins covers the bottom edge of a `sheet`. The defaults are the other way round because a panel the user just opened is usually the thing they need to see.

---

## Date Field Panel

| Variable                                      | Description                                                       |
| :-------------------------------------------- | :---------------------------------------------------------------- |
| `--formidable-date-field-panel-width`         | Width the calendar prefers; it scales down into a narrower panel. |
| `--formidable-date-field-panel-border-radius` | Border-radius for the date-picker panel.                          |

---

## Option Prefix Dimensions

| Variable                                      | Description                                                                                                     |
| :-------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `--formidable-option-prefix-dimension-outer`  | Size of the outer circle/box for radio/checkbox prefixes.                                                       |
| `--formidable-option-prefix-dimension-inner`  | Size of the inner indicator for selected radio/checkbox prefixes.                                               |
| `--formidable-option-prefix-inset`            | Where a radio/checkbox prefix starts, and a group's empty state with it. Set it to `0px` to left-align a group. |
| `--formidable-option-prefix-gap`              | Gap between a radio/checkbox prefix and its option label.                                                       |
| `--formidable-option-prefix-border-thickness` | Border thickness of the outer circle/box for radio/checkbox prefixes.                                           |

---

## Variables The Library Sets Itself

These are written at runtime as a field measures its own content. They appear in the browser's inspector, but overriding them does nothing useful — the component overwrites the value again on the next render.

| Variable                               | Set By                                                  |
| :------------------------------------- | :------------------------------------------------------ |
| `--formidable-field-prefix-inset`      | The decorator, once it has measured a projected prefix. |
| `--formidable-field-suffix-inset`      | The decorator, for a projected suffix.                  |
| `--formidable-field-ring-shadow`       | The field, while focused.                               |
| `--formidable-field-value-padding-top` | The decorator, to clear an inside label.                |
| `--formidable-field-value-top`         | The decorator, to place the value's line box.           |
| `--formidable-slider-thumb-transform`  | The slider, as its value changes.                       |

---

## Per-Corner Radius

Every corner of a field falls back to `--formidable-field-border-radius`, and each can be shaped on its own. The four corner variables use CSS logical names — `start-start` is the top-left corner in a left-to-right, top-to-bottom writing mode:

```scss
:root {
  --formidable-field-border-radius: 0.5rem;
  --formidable-field-border-end-start-radius: 0; /* top-rounded only */
  --formidable-field-border-end-end-radius: 0;
}
```

They shape the field box and nothing else. Everything else that is rounded — the toggle, the slider, the panels — falls back to `--formidable-border-radius` instead, which is what to override to round the whole library at once. A field group takes its shape from `--formidable-field-group-border-radius`, which accepts the whole `border-radius` shorthand.

While a dropdown, autocomplete or date panel is open, it adopts the two corners of the field it sits against: opened below, its top corners take the field's bottom ones; flipped above, its bottom corners take the field's top ones. Its far side keeps `--formidable-panel-border-radius`. The field never reshapes itself — its corners are what you declared, panel or no panel. A `sheet` is the exception: it sits against the screen, not the field, so it keeps its own radius on top and squares off where it meets the edge.

---

## Underline

A field can carry an extra line inside its bottom edge, thickening on focus and on invalid. It is painted over the border rather than replacing it, so no state can change it and move the field's content:

```scss
:root {
  --formidable-field-border-thickness: 0px;
  --formidable-field-underline-thickness: 1px;
  --formidable-field-underline-thickness-focus: 2px;
  --formidable-field-underline-thickness-invalid: 2px;
}
```

The thickness is `0` by default, so nothing is painted until a theme asks for it. The color follows `--formidable-color-field-border` through every state; name `--formidable-color-field-underline` and its `-focus` / `-invalid` variants only where the two should differ. Field groups never take an underline: a group is a tall multi-row box, and a line across its bottom reads as a divider between its options.

Dropping the field border to `0px` erases four other things drawn by it — see [Borderless Themes](theming.md#4-five-things-that-will-catch-you-out) for the companions to restore.

---

## Pikaday Overrides

The date field's calendar is rendered by Pikaday, which brings its own class names. Style it by overriding those directly:

```scss
.pika-lendar {
  background-color: #8a2b75ff;
}
```
