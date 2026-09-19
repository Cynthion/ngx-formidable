# Theming

Every visual property of every field is a CSS custom property you can override. This page is how to decide which ones to set; every variable is listed in `user/theme-reference.md`. To wire the stylesheet up, see `user/getting-started.md`.

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

Alternative colour and geometry schemes — outlined, underlined, soft, compact, pill, leaf, tab, brutalist, airy, borderless, unboxed, and ten palettes including a dark one — are selectable in the Studio, which pairs them into named presets — see `user/studio.md`.

---

## How Theming Works

- **Override In Your Own `:root`**: declare the variables you want to change after importing the library's stylesheet. There is nothing else to configure.
- **Override The Base, Not The Derivative**: many variables default to another one, so setting the base moves everything below it — set `--formidable-color-field-border` and the underline, the option markers, the slider track and the toggle thumb all follow. Set those overrides in `:root`; a derived variable re-declared further down your app has no effect. The per-corner radius variables are the exception — they work on `:root` and on a single field alike.
- **Units Are Mandatory On Length Variables**: write `0px`, not `0`. A unitless zero silently invalidates every value derived from it, taking out label offsets and panel alignment with it.
- **Derived Values Are Yours Too**: a variable described as _Derived_ is computed from the ones above it. Overriding it pins it, which is occasionally what you want and usually not — prefer changing what it is computed from.
- **Chrome And Content Are Separate**: `--formidable-color-field-border` is its own colour, not the text's. Setting `--formidable-color-field-text` recolours the text, the group text, the label and the readonly/disabled states, but leaves the border alone — recolour the border yourself when you want both to move.

---

## Finding Your Theme

There are around two hundred variables in `user/theme-reference.md`, and you need eight to twelve of them. Work in this order and stop as soon as it looks right — each step is independent of the ones after it.

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
  --formidable-field-focus-ring-width: 1px;
  --formidable-panel-border-thickness: 1px;
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
- **Sizing**: `44px` is the floor for the `inside`, `inside-placeholder` and floating label positions. Below it the label's line box and the value's no longer both fit the field's inner height, and the field overflows its own box rather than centering them — the space between them is clamped at zero, so they cannot invert into each other.
- **Borderless themes**: `--formidable-field-border-thickness` is the default for five lengths that are not the field's border at all — the field group's border, a panel's outline, the focus ring's width, the toggle's track and the slider's track. Setting it to `0px` erases all five, and neither a group nor a panel has an underline to fall back on: a focused radio or checkbox group loses its only focus indicator, and every dropdown, autocomplete and date panel is left with its box-shadow alone. Each has a variable of its own — restore the five shown in the underlined example above. `--formidable-field-focus-ring-width` is one width for every ring the library paints, so a group's ring cannot be restored without the fields taking one too; give a field-ring-free theme its focus through `--formidable-field-underline-thickness-focus` instead.
- **A gradient cannot be a colour.** `--formidable-color-field-background` is fed into `color-mix()` to derive the readonly, disabled and hover fills. A `linear-gradient()` is not a `<color>` and invalidates all of them.
- **Dark themes need a dark page.** The library styles fields, never the surface behind them — that is yours. You will also need to state `--formidable-color-field-background-readonly` and `-disabled` outright, because they are derived by mixing toward `transparent`, which lightens a dark field instead of dimming it; and the option `-selected` / `-highlighted` fills, which default to black at low alpha and vanish on a dark panel.

### 5. Start From A Scheme Instead

Ten palettes and eleven field shapes — outlined, underlined, soft, compact, pill, leaf, tab, brutalist, airy, borderless, unboxed — are selectable in the Studio, on two independent axes and as named presets pairing the two. Picking one and adjusting it is usually faster than starting from this page, and the Studio copies the result out as the `:root` block to paste. `user/studio.md` is the guide to it.

---

## The Full List

Every overridable variable, grouped by what it paints, is in `user/theme-reference.md`. The four families that need explaining rather than listing — the variables the library writes itself, the per-corner radius, the underline, and the Pikaday class names — are documented there too.
