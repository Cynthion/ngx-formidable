# Theming

Every visual property of every field is a CSS custom property you can override. This is the reference for all of them. To wire the stylesheet up, see the root `README.md`.

## The Default Theme

The library ships neutral chrome plus a single accent — deliberate enough to use unthemed, quiet enough not to compete with your brand. Import the stylesheet and you get this; there is no theme to select and nothing to initialise.

| Role           | Variable                                  |   Value   | Scale       |
| :------------- | :---------------------------------------- | :-------: | :---------- |
| Field fill     | `--formidable-color-field-background`     | `#f8fafc` | neutral 50  |
| Field border   | `--formidable-color-field-border`         | `#94a3b8` | neutral 400 |
| Placeholder    | `--formidable-color-field-placeholder`    | `#5a6b82` | neutral 500 |
| Field text     | `--formidable-color-field-text`           | `#1e293b` | neutral 800 |
| Selection      | `--formidable-color-field-selection`      | `#c7d2fe` | accent 200  |
| Focus          | `--formidable-color-field-border-focus`   | `#4f46e5` | accent 600  |
| Floating label | `--formidable-color-field-label-floating` | `#4338ca` | accent 700  |
| Error          | `--formidable-color-validation-error`     | `#dc2626` | signal      |

| Geometry     | Variable                              | Value  |
| :----------- | :------------------------------------ | :----- |
| Field height | `--formidable-field-height`           | `56px` |
| Border       | `--formidable-field-border-thickness` | `1px`  |
| Radius       | `--formidable-border-radius`          | `8px`  |
| Padding      | `--formidable-field-padding-x`        | `16px` |

Everything else in this document derives from those twelve. **To rebrand, set `--formidable-color-field-border-focus`** — it carries the focus border, the focused label, the focused underline and both focus rings. Add `--formidable-color-field-label-floating` if you want the accent on resting labels too.

Alternative colour and geometry schemes — outlined, underlined, soft, compact, pill, leaf, tab, brutalist, airy, and ten palettes including a dark one — are catalogued in `theme-options.md` and selectable in the demo.

---

## How Theming Works

- **Override In Your Own `:root`**: declare the variables you want to change after importing the library's stylesheet. There is nothing else to configure.
- **Override The Base, Not The Derivative**: many variables default to another one, so setting the base moves everything below it — set `--formidable-color-field-border` and the underline, the option markers, the slider track and the toggle thumb all follow. Set those overrides in `:root`; a derived variable re-declared further down your app has no effect. The per-corner radius variables are the exception — they work on `:root` and on a single field alike.
- **Units Are Mandatory On Length Variables**: write `0px`, not `0`. A unitless zero silently invalidates every value derived from it, taking out label offsets and panel alignment with it.
- **Derived Values Are Yours Too**: a variable described as _Derived_ is computed from the ones above it. Overriding it pins it, which is occasionally what you want and usually not — prefer changing what it is computed from.
- **Chrome And Content Are Separate**: `--formidable-color-field-border` is its own colour, not the text's. Setting `--formidable-color-field-text` recolours the text, the group text, the label and the readonly/disabled states, but leaves the border alone — recolour the border yourself when you want both to move.

---

## Finding Your Theme

There are around two hundred variables in this document, and you need eight to twelve of them. Work in this order and stop as soon as it looks right — each step is independent of the ones after it.

### 1. Decide How Far You Are Going

| Goal              | Variables | What To Set                                                        |
| :---------------- | --------: | :----------------------------------------------------------------- |
| Match your brand  |         1 | `--formidable-color-field-border-focus`                            |
| Repaint entirely  |         8 | The eight colour seeds below                                       |
| Reshape the field |         4 | `--formidable-field-height`, the border thickness, radius, padding |
| Both              |        12 | All of the above                                                   |

### 2. The Eight Colour Seeds

Set these and the rest of the library follows. Do not set the derived variables — the `-hovered`, `-focus`, `-readonly` and `-disabled` variants exist so you do not have to.

```scss
:root {
  --formidable-color-field-background: #f8fafc; // the fill; also the panels and the groups
  --formidable-color-field-border: #94a3b8; // also the underline, toggle thumb, slider, option markers
  --formidable-color-field-placeholder: #5a6b82; // also the hints, length indicator, resting label
  --formidable-color-field-text: #1e293b; // also the group text and the readonly/disabled fades
  --formidable-color-field-selection: #c7d2fe; // also the hover fill and the slider's tick marks
  --formidable-color-field-border-focus: #4f46e5; // also the focused label, underline and both rings
  --formidable-color-field-label-floating: #4338ca; // also the calendar's weekday labels
  --formidable-color-validation-error: #dc2626; // also the invalid border, label, underline and ring
}
```

**Check the contrast of three of them against your fill**: the text, the placeholder and the error colour should each reach 4.5:1, and the focus border 3:1. A placeholder that fails is the usual casualty.

### 3. Four Worked Examples

**Brand accent only** — keep the shipped neutrals, make focus yours:

```scss
:root {
  --formidable-color-field-border-focus: #0f766e;
  --formidable-color-field-label-floating: #115e59; // optional: accent the labels too
}
```

**Underlined**, the familiar filled look — no border, a line inside the bottom edge that thickens on focus, rounded on top only so an open panel fuses with the field:

```scss
:root {
  --formidable-field-border-thickness: 0px;
  --formidable-field-border-radius: 0px;
  --formidable-field-border-start-start-radius: 8px;
  --formidable-field-border-start-end-radius: 8px;
  --formidable-field-underline-thickness: 1px;
  --formidable-field-underline-thickness-focus: 2px;
  --formidable-field-underline-thickness-invalid: 2px;
  // Required — see Borderless Themes below
  --formidable-field-group-border-thickness: 1px;
  --formidable-toggle-field-track-border-thickness: 1px;
  --formidable-slider-track-border-thickness: 1px;
}
```

**Pill** — a field radius of half its height rounds it completely, and everything else that is round follows `--formidable-border-radius`:

```scss
:root {
  --formidable-field-height: 52px;
  --formidable-field-border-radius: 26px; // half the height
  --formidable-border-radius: 16px; // the panels, toggle and slider
  --formidable-field-padding-x: 24px; // keep the text off the curve
}
```

**Dense** — for admin and back-office screens:

```scss
:root {
  --formidable-field-height: 44px; // do not go below this — see Sizing below
  --formidable-field-padding-x: 12px;
  --formidable-field-font-size: 14px;
  --formidable-label-floating-font-size: 11px;
  --formidable-border-radius: 4px;
}
```

### 4. Five Things That Will Catch You Out

- **Units are mandatory.** Write `0px`, never `0`. A unitless zero is a `<number>` in `calc()`, not a `<length>`, and silently invalidates every label offset and the panel alignment at once.
- **Sizing**: `44px` is the floor for the `inside`, `inside-placeholder` and floating label positions. Below it the label's line box and the value's no longer both fit the field's inner height and they overlap. Use an `outside` label if you need a shorter field.
- **Borderless themes**: `--formidable-field-border-thickness` also draws the toggle's track, the slider's track and the field group's border. Setting it to `0px` erases all three, and a field group has no underline to fall back on — a focused radio or checkbox group loses its only focus indicator. Restore the three companions shown in the underlined example above. Note that the focus ring's width also comes from this variable, so a borderless theme needs either a thickened underline or a restated `--formidable-color-field-focus-box-shadow`.
- **A gradient cannot be a colour.** `--formidable-color-field-background` is fed into `color-mix()` to derive the readonly, disabled and hover fills. A `linear-gradient()` is not a `<color>` and invalidates all of them.
- **Dark themes need a dark page.** The library styles fields, never the surface behind them — that is yours. You will also need to state `--formidable-color-field-background-readonly` and `-disabled` outright, because they are derived by mixing toward `transparent`, which lightens a dark field instead of dimming it; and the option `-selected` / `-highlighted` fills, which default to black at low alpha and vanish on a dark panel.

### 5. Start From A Scheme Instead

Ten palettes and nine field shapes — outlined, underlined, soft, compact, pill, leaf, tab, brutalist, airy — are written out variable by variable in `theme-options.md`, and every combination is selectable in the demo. Copying one and adjusting it is usually faster than starting from this page.

---

## Token Reference

### Font Sizes And Line Heights

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

### Field Dimensions

| Variable                                         | Description                                                                                                |
| :----------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `--formidable-field-before-margin-bottom`        | Vertical margin below each field container.                                                                |
| `--formidable-border-radius`                     | The library's base corner radius. Everything rounded that is not a field box falls back to it.             |
| `--formidable-field-border-thickness`            | Thickness of field borders.                                                                                |
| `--formidable-field-border-radius`               | Border-radius every corner of a field falls back to — see see [Per-Corner Radius](#per-corner-radius).     |
| `--formidable-field-border-start-start-radius`   | A field's top-left corner alone. Falls back to `--formidable-field-border-radius`.                         |
| `--formidable-field-border-start-end-radius`     | Its top-right corner alone.                                                                                |
| `--formidable-field-border-end-end-radius`       | Its bottom-right corner alone.                                                                             |
| `--formidable-field-border-end-start-radius`     | Its bottom-left corner alone.                                                                              |
| `--formidable-field-underline-thickness`         | Extra line painted inside a field's bottom edge. `0` paints none — see [Underline](#underline).            |
| `--formidable-field-underline-thickness-focus`   | Underline thickness while the field is focused.                                                            |
| `--formidable-field-underline-thickness-invalid` | Underline thickness while the field is invalid. Outranks the focused thickness.                            |
| `--formidable-field-group-border-thickness`      | Thickness of field group borders.                                                                          |
| `--formidable-field-group-border-radius`         | Border-radius for field group corners.                                                                     |
| `--formidable-label-height`                      | Derived: height of the label text line box.                                                                |
| `--formidable-field-height`                      | Default height for single-line fields.                                                                     |
| `--formidable-field-padding-x`                   | Horizontal padding of a field: where its value, and a projected prefix's text, start.                      |
| `--formidable-field-toggle-size`                 | Size of the panel toggle a dropdown or date field draws inside its own box.                                |
| `--formidable-field-toggle-inset`                | How much of a field's right edge that toggle claims. Raised by the decorator for the fields that have one. |
| `--formidable-field-inner-height`                | Derived: height inside a field's borders.                                                                  |
| `--formidable-field-value-height`                | Derived: height of a field value's text line box.                                                          |
| `--formidable-label-floating-height`             | Derived: height of a floating label's text line box.                                                       |
| `--formidable-label-inside-slack`                | Derived: space above and below the centered label-plus-value block of a field with an inside label.        |
| `--formidable-label-inside-value-top`            | Derived: offset of the value's text line box from the field's inner top, with an inside label.             |
| `--formidable-field-value-centered-top`          | Derived: offset of the value's text line box when it is centered in the field's inner height on its own.   |
| `--formidable-label-floating-offset`             | Vertical offset for a floating label, at the top of the centered label-plus-value block.                   |
| `--formidable-label-resting-offset`              | Vertical offset for a resting label, centered in the field's inner height like a placeholder.              |
| `--formidable-label-border-offset`               | Vertical offset for a `border` label, so its text line box straddles the field's top border.               |
| `--formidable-label-border-gap`                  | How far a `border` label's border-hiding band reaches either side of its text.                             |
| `--formidable-label-border-band-bleed`           | How far that band outgrows the border above and below, so pixel rounding leaves no hairline showing.       |
| `--formidable-label-border-band-reach`           | How much further that band reaches upwards. Raised to the focus ring's width while the field is focused.   |
| `--formidable-label-required-marker`             | The `content` string suffixed to a required field's label — `'*'`, or a word such as `' (required)'`.      |
| `--formidable-field-group-option-padding`        | Padding of options within a field group.                                                                   |
| `--formidable-field-support-min-height`          | Minimum reserved height of a support-text row below a field — the hints and the validation errors.         |

### Colors

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
| `--formidable-color-field-background-hovered`            | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is hovered.  |
| `--formidable-color-field-background-focus`              | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is focused.  |
| `--formidable-color-field-background-invalid`            | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is invalid.  |
| `--formidable-color-field-background-readonly`           | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is readonly. |
| `--formidable-color-field-background-disabled`           | Overrides `--formidable-color-field-background` and `--formidable-color-field-group-background` when the field is disabled. |
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

### Textarea

| Variable                            | Description                                           |
| :---------------------------------- | :---------------------------------------------------- |
| `--formidable-textarea-min-height`  | Minimum height for textareas.                         |
| `--formidable-textarea-max-height`  | Maximum height for textareas.                         |
| `--formidable-textarea-padding-top` | Top padding for textareas when autosizing is enabled. |

### Toggle

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

### Slider

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

### Panels

| Variable                           | Description                                                                                                  |
| :--------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `--formidable-panel-background`    | Background color for dropdown/autocomplete/date panels.                                                      |
| `--formidable-panel-border-radius` | Border-radius for all panels. The two corners a panel sits against its field with mirror that field instead. |
| `--formidable-panel-box-shadow`    | Box-shadow for all panels.                                                                                   |
| `--formidable-panel-max-height`    | Maximum vertical height for panels (before scrolling).                                                       |

### Animations

| Variable                          | Description                                      |
| :-------------------------------- | :----------------------------------------------- |
| `--formidable-animation-duration` | Duration for label/flyout/open/close animations. |
| `--formidable-animation-easing`   | Easing curve for animations.                     |
| `--formidable-hover-duration`     | Transition duration for hover effects.           |
| `--formidable-hover-easing`       | Easing curve for hover transitions.              |

### Layering

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

### Date Field Panel

| Variable                                      | Description                                                       |
| :-------------------------------------------- | :---------------------------------------------------------------- |
| `--formidable-date-field-panel-width`         | Width the calendar prefers; it scales down into a narrower panel. |
| `--formidable-date-field-panel-border-radius` | Border-radius for the date-picker panel.                          |
| `--formidable-date-field-panel-box-shadow`    | Box-shadow override for the date-picker panel.                    |

### Option Prefix Dimensions

| Variable                                      | Description                                                           |
| :-------------------------------------------- | :-------------------------------------------------------------------- |
| `--formidable-option-prefix-dimension-outer`  | Size of the outer circle/box for radio/checkbox prefixes.             |
| `--formidable-option-prefix-dimension-inner`  | Size of the inner indicator for selected radio/checkbox prefixes.     |
| `--formidable-option-prefix-gap`              | Gap between a radio/checkbox prefix and its option label.             |
| `--formidable-option-prefix-border-thickness` | Border thickness of the outer circle/box for radio/checkbox prefixes. |

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

Dropping the field border to `0px` also erases a toggle field's track, which is drawn by that same border — give it `--formidable-toggle-field-track-border-thickness` to keep it.

---

## Pikaday Overrides

The date field's calendar is rendered by Pikaday, which brings its own class names. Style it by overriding those directly:

```scss
.pika-lendar {
  background-color: #8a2b75ff;
}
```
