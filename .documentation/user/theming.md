# Theming

Every visual property of every field is a CSS custom property, and every one can be overridden. Theming is deciding which ones to set; every variable is listed in [Theme Reference](theme-reference.md). Wiring up the stylesheet is in [Getting Started](getting-started.md).

## The Default Theme

The library ships neutral surfaces and text plus a single accent, deliberate enough to use unthemed and quiet enough not to compete with a brand. Importing the stylesheet applies it; there is no theme to select and nothing to initialise.

| Role           | Variable                                  |   Value   | Scale       |
| :------------- | :---------------------------------------- | :-------: | :---------- |
| Field fill     | `--formidable-color-field-background`     | `#f8fafc` | neutral 50  |
| Field border   | `--formidable-color-field-border`         | `#818cf8` | accent 400  |
| Placeholder    | `--formidable-color-field-placeholder`    | `#5a6b82` | neutral 500 |
| Field text     | `--formidable-color-field-text`           | `#1e293b` | neutral 800 |
| Selection      | `--formidable-color-field-selection`      | `#c7d2fe` | accent 200  |
| Focus          | `--formidable-color-field-border-focus`   | `#4f46e5` | accent 600  |
| Floating label | `--formidable-color-field-label-floating` | `#4338ca` | accent 700  |
| Error          | `--formidable-color-validation-error`     | `#dc2626` | signal      |

| Geometry     | Variable                              | Value       |
| :----------- | :------------------------------------ | :---------- |
| Field height | `--formidable-field-height`           | `3.5rem`    |
| Border       | `--formidable-field-border-thickness` | `0.0625rem` |
| Radius       | `--formidable-border-radius`          | `0.5rem`    |
| Padding      | `--formidable-field-padding-x`        | `1rem`      |

The lengths are `rem`: `56px`, `1px`, `8px` and `16px` at the browser's default root font size.

Every other variable derives from those twelve. **A rebrand sets `--formidable-color-field-border-focus`**: it carries the focus border, the focused label, the focused underline and both focus rings. `--formidable-color-field-label-floating` adds the accent to resting labels too.

Alternative colour and geometry schemes (outlined, underlined, soft, compact, pill, leaf, tab, brutalist, airy, borderless, unboxed, and ten palettes including a dark one) are selectable in the Studio, which pairs them into named presets. See [Studio](studio.md). The [Specimen](https://cynthion.github.io/ngx-formidable/#/specimen) shows every field under each preset, and steps through a theme one variable at a time.

---

## How Theming Works

- **Overrides Go In The App's Own `:root`**: the variables to change are declared after the library's stylesheet is imported. There is nothing else to configure.
- **Override The Base, Not The Derivative**: many variables default to another one, so setting the base moves everything that follows it. Setting `--formidable-color-field-border` moves the underline, the option markers, the slider track and the toggle thumb with it. Those overrides belong in `:root`: a base re-declared further down the app leaves everything derived from it as `:root` computed it. The per-corner radius variables are the exception: they work on `:root` and on a single field alike.
- **Units Are Mandatory On Length Variables**: `0px`, not `0`. A unitless zero silently invalidates every value derived from it, taking out label offsets and panel alignment with it.
- **Derived Values Can Be Pinned**: a variable described as _Derived_ is computed from others. Overriding it pins it, which is occasionally wanted and usually not. Changing what it is computed from is the better move.
- **Chrome And Content Are Separate**: `--formidable-color-field-border` is its own colour, not the text's. Setting `--formidable-color-field-text` recolours the text, the group text, the label and the readonly and disabled states, the disabled border included, but leaves `--formidable-color-field-border` alone. The border is recoloured separately when both should move.

---

## Finding A Theme

There are around two hundred variables in [Theme Reference](theme-reference.md), and a theme needs eight to twelve of them. The steps run in this order and stop as soon as the result looks right: each is independent of the ones after it.

### 1. Decide How Far To Go

| Goal              | Variables | What To Set                                                        |
| :---------------- | --------: | :----------------------------------------------------------------- |
| Match a brand     |         1 | `--formidable-color-field-border-focus`                            |
| Repaint entirely  |         8 | The eight colour seeds                                             |
| Reshape the field |         4 | `--formidable-field-height`, the border thickness, radius, padding |
| Both              |        12 | All of the above                                                   |

### 2. Set The Eight Colour Seeds

The rest of the library follows these. The derived `-hovered`, `-focus`, `-readonly` and `-disabled` variants exist so that they do not have to be set.

```scss
:root {
  --formidable-color-field-background: #f8fafc; // the fill; also the panels and the groups
  --formidable-color-field-border: #818cf8; // also the underline, toggle thumb, slider, option markers
  --formidable-color-field-placeholder: #5a6b82; // also the hints, length indicator, resting label
  --formidable-color-field-text: #1e293b; // also the group text and the readonly/disabled fades
  --formidable-color-field-selection: #c7d2fe; // also the hover fill and the slider's tick marks
  --formidable-color-field-border-focus: #4f46e5; // also the focused label, underline and both rings
  --formidable-color-field-label-floating: #4338ca; // also the calendar's weekday labels
  --formidable-color-validation-error: #dc2626; // also the invalid border, label, underline and ring
}
```

> **Note:** The text, the placeholder and the error colour each need a contrast of 4.5:1 against the fill, and the focus border 3:1. A placeholder that fails is the usual casualty.

### 3. Adapt A Worked Example

**Brand Accent Only**: the shipped neutrals, with focus in the brand colour:

```scss
:root {
  --formidable-color-field-border-focus: #0f766e;
  --formidable-color-field-label-floating: #115e59; // optional: accent the labels too
}
```

**Underlined**: the familiar filled look, with no border, a line inside the bottom edge that thickens on focus, and rounded on top only so an open panel fuses with the field:

```scss
:root {
  --formidable-field-border-thickness: 0px;
  --formidable-field-border-radius: 0px;
  --formidable-field-border-start-start-radius: 8px;
  --formidable-field-border-start-end-radius: 8px;
  --formidable-field-underline-thickness: 1px;
  --formidable-field-underline-thickness-focus: 2px;
  --formidable-field-underline-thickness-invalid: 2px;
  // Required, see Borderless Themes under Avoid Five Pitfalls
  --formidable-field-group-border-thickness: 1px;
  --formidable-field-focus-ring-width: 1px;
  --formidable-panel-border-thickness: 1px;
  --formidable-toggle-field-track-border-thickness: 1px;
  --formidable-slider-track-border-thickness: 1px;
}
```

**Pill**: a field radius of half its height rounds it completely, and everything else that is round follows `--formidable-border-radius`:

```scss
:root {
  --formidable-field-height: 52px;
  --formidable-field-border-radius: 26px; // half the height
  --formidable-border-radius: 16px; // the panels, toggle and slider
  --formidable-field-padding-x: 24px; // keep the text off the curve
}
```

**Dense**: for admin and back-office screens:

```scss
:root {
  --formidable-field-height: 44px; // the floor, see Sizing under Avoid Five Pitfalls
  --formidable-field-padding-x: 12px;
  --formidable-field-font-size: 14px;
  --formidable-label-floating-font-size: 11px;
  --formidable-border-radius: 4px;
}
```

### 4. Avoid Five Pitfalls

- **Units Are Mandatory**: `0px`, never `0`. A unitless zero is a `<number>` in `calc()`, not a `<length>`, and silently invalidates every label offset and the panel alignment at once.
- **Sizing**: `44px` is the floor for the `inside`, `inside-placeholder` and floating label positions. Below it the label's line box and the value's no longer both fit the field's inner height, and the field overflows its own box rather than centering them. The space between them is clamped at zero, so they cannot invert into each other.
- **Borderless Themes**: `--formidable-field-border-thickness` is the default for five lengths that are not the field's border at all (the field group's border, a panel's outline, the focus ring's width, the toggle's track and the slider's track). Setting it to `0px` erases all five, and neither a group nor a panel has an underline to fall back on: a focused radio or checkbox group loses its only focus indicator, and every dropdown, autocomplete and date panel is left with its box-shadow alone. Each has a variable of its own; the underlined example restores all five. `--formidable-field-focus-ring-width` is one width for every ring the library paints, so a group's ring cannot be restored without the fields taking one too; a theme without field rings shows focus through `--formidable-field-underline-thickness-focus` instead.
- **A Gradient Cannot Be A Colour**: `--formidable-color-field-background` is fed into `color-mix()` to derive the readonly, disabled and hover fills. A `linear-gradient()` is not a `<color>` and invalidates all of them.
- **Dark Themes Need A Dark Page**: the library styles fields, never the surface behind them, which belongs to the app. A dark theme also states `--formidable-color-field-background-readonly` and `-disabled` outright, because they are derived by mixing toward `transparent`, which lightens a dark field instead of dimming it; and the option `-selected` / `-highlighted` fills, which default to black at low alpha and vanish on a dark panel.

### 5. Start From A Scheme Instead

Ten palettes and eleven field shapes (outlined, underlined, soft, compact, pill, leaf, tab, brutalist, airy, borderless, unboxed) are selectable in the Studio, on two independent axes and as named presets pairing the two. Picking one and adjusting it is usually faster than starting from the seeds, and the Studio copies the result out as the `:root` block to paste. [Studio](studio.md) is the guide to it.

---

## The Full List

Every overridable variable, grouped by what it paints, is in [Theme Reference](theme-reference.md). The four families that need explaining rather than listing (the variables the library writes itself, the per-corner radius, the underline, and the Pikaday class names) are documented there too.

---

## Related

- [Theme Reference](theme-reference.md): every overridable `--formidable-*` custom property
- [Studio](studio.md): build a theme and a form in the browser, and take both away
- [Getting Started](getting-started.md): install, wiring, the stylesheet, a first form
