# Theme Options

Candidate schemes for the library's default theme, shown in the demo's control center. The variable reference itself lives in `theming.md`; this file only names the schemes and records what each one sets.

Schemes come on two independent axes — **geometry** (dimensions, radii, thicknesses) and **colour**. Any geometry combines with any colour, so a pick is named as a pair: _colour F with geometry B_.

## How To Combine

- The demo's control center has one radio group per axis, each led by the shipped default (★). Pick one scheme per axis; the form starts on A + A.
- The selection is kept in `localStorage` and restored on reload.
- The axes touch only where a geometry restates a shadow — **C — Soft** and **H — Brutalist** both do, because a ring's width comes from the field's border thickness. Both reference colour variables rather than literal colours, so they still follow the active colour scheme.
- A scheme in the demo is a faithful preview of a token change: every derived variable reads through `var(--base, …)` and the base is always declared in `:root`, so overriding it produces exactly what editing `_tokens.scss` would.

---

## Geometry Schemes

| Id  | Key          | Look                                                                                     | Reads As               |
| :-- | :----------- | :--------------------------------------------------------------------------------------- | :--------------------- |
| A   | `outlined`   | The boxed field, tightened. `56px` tall, `1px` border, `8px` radius                      | Neutral, universal     |
| B   | `underlined` | No border; a line inside the bottom edge thickening on focus. Rounded on the top only    | Familiar, Material-ish |
| C   | `soft`       | Borderless, `12px` radius, `60px` tall. Focus carried by a wide translucent ring         | Modern product UI      |
| D   | `compact`    | Dense rows: `44px` tall, `14px` text, `4px` radius, smaller prefixes, toggle and padding | Admin, back office     |
| E   | `pill`       | Field radius is half its height, so it is fully round; toggle and slider go round too    | Consumer, playful      |
| F   | `leaf`       | One diagonal pair of corners at `22px`, the other pair at `2px`                          | Editorial, boutique    |
| G   | `tab`        | `18px` on top, square on the bottom, so a panel below fuses into one card                | App-like, docked       |
| H   | `brutalist`  | Zero radius, `3px` borders, hard `5px` offset shadows instead of rings                   | Bleeding-edge startup  |
| I   | `airy`       | `72px` rows, `22px` padding, `18px` radius, roomy spacing                                | Premium, calm          |

### What Each Sets

| Variable                                           |      A |      B |      C |      D |      E |          F |      G |      H |      I |
| :------------------------------------------------- | -----: | -----: | -----: | -----: | -----: | ---------: | -----: | -----: | -----: |
| `--formidable-field-height`                        | `56px` | `56px` | `60px` | `44px` | `52px` |     `56px` | `56px` | `52px` | `72px` |
| `--formidable-field-border-thickness`              |  `1px` |  `0px` |  `0px` |  `1px` |  `1px` |      `1px` |  `1px` |  `3px` |  `1px` |
| `--formidable-border-radius`                       |  `8px` |  `8px` | `12px` |  `4px` | `16px` |      `8px` | `10px` |  `0px` | `18px` |
| `--formidable-field-padding-x`                     | `16px` |      — | `16px` | `12px` | `24px` |     `18px` | `16px` | `14px` | `22px` |
| `--formidable-field-border-radius`                 |      — |  `0px` |      — |      — | `26px` |      `2px` |  `0px` |      — |      — |
| `--formidable-field-border-start-start-radius`     |      — |  `8px` |      — |      — |      — |     `22px` | `18px` |      — |      — |
| `--formidable-field-border-start-end-radius`       |      — |  `8px` |      — |      — |      — |          — | `18px` |      — |      — |
| `--formidable-field-border-end-end-radius`         |      — |      — |      — |      — |      — |     `22px` |      — |      — |      — |
| `--formidable-field-group-border-radius`           |      — |      — |      — |      — | `20px` | `22px 2px` |      — |      — |      — |
| `--formidable-field-underline-thickness`           |      — |  `1px` |      — |      — |      — |          — |      — |      — |      — |
| `--formidable-field-underline-thickness-focus`     |      — |  `2px` |      — |      — |      — |          — |      — |      — |      — |
| `--formidable-field-underline-thickness-invalid`   |      — |  `2px` |      — |      — |      — |          — |      — |      — |      — |
| `--formidable-field-group-border-thickness`        |      — |  `1px` |  `1px` |      — |      — |          — |      — |      — |      — |
| `--formidable-toggle-field-track-border-thickness` |      — |  `1px` |  `1px` |      — |      — |          — |      — |      — |      — |
| `--formidable-slider-track-border-thickness`       |      — |  `1px` |  `1px` |      — |      — |          — |      — |      — |      — |

Beyond the table:

- **C** and **H** restate `--formidable-color-field-focus-box-shadow` and its group and invalid variants — C as a wide translucent ring, H as a hard offset shadow. Both reference colour variables rather than literal colours, so they still follow the active colour scheme.
- **D** also sets `--formidable-field-font-size`, `--formidable-label-font-size`, `--formidable-label-floating-font-size`, `--formidable-field-toggle-size`, `--formidable-field-group-option-padding`, the three `--formidable-option-prefix-*` sizes and the three `--formidable-toggle-field-*` sizes.
- **E** also rounds off everything the field's radius does not reach — `--formidable-panel-border-radius` and the toggle's, slider's and tick marks' radii.
- **H** also sets `--formidable-slider-thumb-border-thickness` and replaces both panel shadows with hard offsets.
- **I** also raises `--formidable-field-before-margin-bottom` and `--formidable-textarea-padding-top`.

### Traps A Borderless Geometry Has To Handle

Both **B** and **C** drop `--formidable-field-border-thickness` to `0px`, and four things are drawn by that border:

- **The toggle's track** — restore it with `--formidable-toggle-field-track-border-thickness`.
- **The slider's track border** — restore it with `--formidable-slider-track-border-thickness`.
- **A field group's focus ring** — a group never takes an underline, and its border thickness derives from the field's. Left to derive, a focused radio or checkbox group shows no focus indicator at all. Restore it with `--formidable-field-group-border-thickness`.
- **A field's focus ring** — its width is the border thickness. **B** replaces it with the thickened underline; **C** restates the ring with an explicit width.

Two further constraints, both found while building these schemes:

- **`44px` is the floor for the `inside` label positions.** Below it the floating label's line box and the value's line box no longer fit the field's inner height, `--formidable-label-inside-slack` goes negative and the two overlap. This is why **D** stops at `44px` rather than the `36px` a compact row would otherwise want.
- **Units are mandatory.** A unitless `0` is a `<number>` in `calc()`, not a `<length>`, and silently invalidates every derived offset — every label position and the panel alignment at once.
- **The `border` label position assumes a bordered field.** Its band hides the field's top border, and the band's upward reach is taken from `--formidable-field-border-thickness`. On **B** and **C** there is no border to hide, so the band has nothing to do and C's wider ring passes over it. Use a different label position on a borderless geometry.

### Playing With Distinct Corners

`--formidable-field-border-radius` is only the fallback; the four logical corners are shaped independently, and they shape the **field box alone** — the toggle, the slider, the tick marks and the panels fall back to `--formidable-border-radius` instead. That split is what lets **F** carry a `22px`/`2px` diagonal while its slider keeps an ordinary `8px`.

| Scheme        | start-start | start-end | end-end | end-start | Effect                                           |
| :------------ | ----------: | --------: | ------: | --------: | :----------------------------------------------- |
| E `pill`      |      `26px` |    `26px` |  `26px` |    `26px` | Half the field height — fully round              |
| F `leaf`      |      `22px` |     `2px` |  `22px` |     `2px` | One diagonal pair heavy, the other nearly square |
| G `tab`       |      `18px` |    `18px` |   `0px` |     `0px` | Rounded top, square bottom                       |
| H `brutalist` |       `0px` |     `0px` |   `0px` |     `0px` | No radius anywhere, in the library or the field  |

An open panel adopts the two corners of the field it sits against, so these choices carry into the panel: **G**'s square bottom means a dropdown opening below fuses with the field into one card, while the same panel flipped above picks up the `18px` top corners instead. **E**'s `26px` arrives on the panel's top edge, which is the most visible case. The field itself never reshapes — its corners are what the scheme declared, panel or no panel.

---

## Colour Schemes

Each scheme sets the same eight seed variables; everything else in the library derives from them. Overriding eight values repaints the whole thing — this is the "override the base, not the derivative" rule in `theming.md`, demonstrated.

| Id  | Key        | Identity                                                      | Fits                      |
| :-- | :--------- | :------------------------------------------------------------ | :------------------------ |
| A   | `slate`    | Neutral chrome, one indigo accent — **the shipped default**   | Enterprise, SaaS          |
| B   | `ocean`    | The library's incumbent blue, cleaned up                      | General purpose           |
| C   | `sand`     | Warm, low-contrast fill                                       | Editorial, hospitality    |
| D   | `forest`   | Green accent on a cool neutral                                | Sustainability, wellness  |
| E   | `plum`     | Tinted fill, saturated violet accent                          | Creative tools            |
| F   | `mono`     | Greyscale chrome — proves the library reads with no brand hue | Documentation, print      |
| G   | `clinical` | Near-white, cool teal, deliberately high contrast             | Medical, pharma           |
| H   | `ledger`   | Warm paper, navy text, muted gold accent                      | Banking, insurance        |
| I   | `sunset`   | Warm, vivid, high-energy                                      | Consumer, lifestyle       |
| J   | `midnight` | A dark field — see the notes below                            | Developer tools, startups |

### Seed Values

| Variable                                  |         A |         B |         C |         D |         E |         F |         G |         H |         I |         J |
| :---------------------------------------- | --------: | --------: | --------: | --------: | --------: | --------: | --------: | --------: | --------: | --------: |
| `--formidable-color-validation-error`     | `#dc2626` | `#c53030` | `#b91c1c` | `#be123c` | `#c2183f` | `#b00020` | `#c2410c` | `#991b1b` | `#9f1239` | `#fb7185` |
| `--formidable-color-field-text`           | `#1e293b` | `#00345a` | `#3f2d16` | `#14342a` | `#2e1065` | `#111111` | `#0f2b2e` | `#1c2c45` | `#4c1d24` | `#e8ecf5` |
| `--formidable-color-field-placeholder`    | `#5a6b82` | `#4a7189` | `#8a6d4a` | `#4f6f63` | `#6d5f8c` | `#595959` | `#4c6b6d` | `#6b6350` | `#9a5f57` | `#8b95ab` |
| `--formidable-color-field-selection`      | `#c7d2fe` | `#9fb7c7` | `#fde68a` | `#a7f3d0` | `#ddd6fe` | `#d4d4d4` | `#99f6e4` | `#e7d9ae` | `#fecdd3` | `#334155` |
| `--formidable-color-field-border`         | `#94a3b8` | `#3e6988` | `#c9a227` | `#3f6f5c` | `#8b7bb8` | `#767676` | `#7f9fa1` | `#a9a190` | `#f0a08c` | `#3b465e` |
| `--formidable-color-field-border-focus`   | `#4f46e5` | `#0b6fa4` | `#b45309` | `#059669` | `#7c3aed` | `#111111` | `#0f766e` | `#8a6d1f` | `#e11d48` | `#5eead4` |
| `--formidable-color-field-background`     | `#f8fafc` | `#f2faff` | `#fdf8f0` | `#f4faf7` | `#faf5ff` | `#fafafa` | `#f7fdfd` | `#fbfaf7` | `#fff7f5` | `#141824` |
| `--formidable-color-field-label-floating` | `#4338ca` | `#255476` | `#92400e` | `#047857` | `#6d28d9` | `#333333` | `#115e59` | `#5b4a12` | `#be123c` | `#5eead4` |

### What Derives From Each Seed

| Seed               | Reaches                                                                                                     |
| :----------------- | :---------------------------------------------------------------------------------------------------------- |
| `text`             | Group text; the hovered, focus and invalid text; readonly at 75% and disabled at 50%; the label             |
| `border`           | The underline, the toggle thumb, the slider fill, track border, thumb and label border, the option prefixes |
| `border-focus`     | The group's focus border, the focused label, the focused underline, both focus rings                        |
| `background`       | The group fill, the panels, readonly at 75% and disabled, the `border` label's band, the toggle when on     |
| `placeholder`      | The resting label, the hints, the length indicator, the hovered option fill                                 |
| `selection`        | The hovered field fill, the slider's tick marks                                                             |
| `validation-error` | The invalid border, label, underline and focus ring                                                         |
| `label-floating`   | The calendar's weekday labels                                                                               |

Every scheme clears WCAG AA against its own field background: text, placeholder and the error colour at 4.5:1, the floating label and the focus border at 3:1. The lowest margins are `sand`'s placeholder (4.55) and `forest`'s focus border (3.56).

### What A Dark Scheme Costs

**J — Midnight** is the one scheme that cannot live on eight seeds, and every extra it needs marks a real limit in the token model rather than a gap in the scheme:

| Extra                                                                  | Why the derived value fails                                                                                                                         |
| :--------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--formidable-color-field-background-readonly` / `-disabled`           | Both are the base mixed toward `transparent`, which lets the page show through. On a light page that dims a light field but **lightens** a dark one |
| `--formidable-color-field-option-background-selected` / `-highlighted` | Both default to black at 2.5% / 5% — invisible on a dark panel                                                                                      |
| `--example-page-background` / `--example-page-text` (demo-only)        | The library styles fields, never the surface they sit on. A dark theme needs a dark host page and no `--formidable-*` variable can supply one       |

Two further consequences worth knowing before picking a dark default:

- **A gradient cannot be a colour seed.** `--formidable-color-field-background` feeds `color-mix()` in half a dozen derived variables, and a `linear-gradient()` is not a `<color>` — it invalidates all of them.
- **The label state colours are shared.** `--formidable-color-field-label-hovered` / `-focus` / `-invalid` each recolour the outside label, the floating label and the resting label together. On a light page with a dark field those three sit on opposite backgrounds, so one value cannot suit all of them. Fine for the `inside` positions, awkward for `outside`.

---

## Shipped Default

**Colour A — Slate with geometry A — Outlined.** Their values are what `_tokens.scss` now holds, and the shipped set is recorded in `theming.md`. Both lead their axis in the demo's control center, marked ★, and are stated in full rather than aliased to the demo has no separate `Library Default` entry — A on each axis _is_ the default and is what the form starts on, so drift between the tokens and this catalogue shows up as a visible change rather than hiding behind an empty option.

Why those two:

- **Geometry A is the only scheme with no footguns.** Its `1px` border lets the toggle track, the slider track, the group's focus ring and the panel outline all derive correctly, with no companion variables. Every borderless geometry needs four and still hits two limits with no escape hatch — see _Traps A Borderless Geometry Has To Handle_ above and the zero-border entries in `backlog.md`. A default that trips the library's own known defects would meet a consumer on day one.
- **Colour A is neutral chrome plus one accent**, which is what a library should ship: it reads as deliberate without competing with the consumer's brand, and rebranding is one variable rather than eight. `ocean` was rejected because keeping the incumbent blue commits every consumer to a brand nobody chose; `mono` because its focus border matches its text in contrast, leaving focus signalled by geometry alone.

Promoting Slate needed one structural change: `--formidable-color-field-border` no longer resolves through `--formidable-color-field-text`. A neutral default wants a light border under dark text, and the old derivation forced them to be the same colour.

The other eight geometries and nine palettes stay here and in the demo as the showcase set, and feed the portal's pre-defined-themes backlog item.
