# Studio

The Studio is a page that builds a theme and a form against the real components, and hands back the CSS and the Angular template to paste into your own project. It is published at <https://cynthion.github.io/ngx-formidable/> and needs no install, no account and no build.

Nothing you do on it leaves the page. The theme and the workspace sizes are kept in the browser's local storage, so a return visit resumes where you stopped.

How theming works, and which variables are worth setting, is in `user/theming.md`. Every variable is listed in `user/theme-reference.md`. This document covers the page itself.

---

## The Two Routes

| Route   | Holds                                                  |
| :------ | :----------------------------------------------------- |
| `/`     | The Studio: a live form, and the panel that changes it |
| `/docs` | These documents                                        |

The top bar carries both, the repository link, the page's own light or dark appearance, and a copy button for each of the two things you take away.

---

## The Three Regions

| Region           | Where            | Holds                                                                     |
| :--------------- | :--------------- | :------------------------------------------------------------------------ |
| **Top Bar**      | Across the top   | The two routes, the appearance toggle, `Copy Theme` and `Copy Template`   |
| **Stage**        | The wide column  | The form, on an explicit page surface, with the model drawer beneath it   |
| **Editor Panel** | Beside the stage | `Theme`, `Form` and `Import & Export`, each a tab over the same live form |

The form is never hidden, because watching it repaint is the point. Below a narrow breakpoint the editor panel becomes a bottom sheet instead of a column, so the fields stay visible while they are edited.

The panel's width and the drawer's height are dragged from the divider on their own edge and reset by double-clicking it. The panel collapses to a rail from the chevron in its header.

### The Stage's Own Switches

Two switches annotate the preview rather than change it. Both are the Studio's own marks, not part of the form, and neither reaches the exported template.

| Switch            | Default | Shows                                                                                         |
| :---------------- | :-----: | :-------------------------------------------------------------------------------------------- |
| **Field Types**   |   On    | A chip under each field naming its component. Clicking one opens that field for editing       |
| **Accessibility** |   Off   | The role, accessible name, described-by targets and focus order the library actually produced |

A chip's tooltip lists what that field is set to, derived from the field itself rather than written out, so it states the current configuration after an edit. The accessibility readout is read off the rendered DOM and is not a simulation: verify with a real screen reader.

### The Model Drawer

The bar under the stage always states how many fields are filled and whether the form is valid. Opened, it shows the model by section, the errors, and the raw serialization. It is the cheapest evidence that the preview is a working form rather than a picture of one.

---

## Building A Theme

The `Theme` tab has two halves. `Design` is a ladder of numbered steps in the order `user/theming.md` puts them; `Variables` is the whole surface. Work down the ladder and stop as soon as it looks right.

| Step        | Sets                                                          | Variables |
| :---------- | :------------------------------------------------------------ | --------: |
| **Presets** | A named pair of one field shape and one palette               |         — |
| **1**       | The brand colour, and whether resting labels take it too      |         1 |
| **2**       | Repaint: the colour seeds everything else derives from        |         8 |
| **3**       | Reshape: height, border thickness, radius, horizontal padding |         4 |
| **4**       | The page behind the form                                      |         — |
| **5**       | Fonts: the family, and the size, weight and line height       |         — |

**Presets First**: each thumbnail is a real field rendered under that theme rather than a picture of one. `Randomize` pairs a shape, a palette and a family at random, which is the fastest way to see that the two axes are independent. `Back To The Shipped Theme` returns to the library's own defaults.

**The Page Behind The Form** is yours, not the library's. The library styles fields and never the surface they sit on, so this block is exported separately and commented as such.

**Contrast Badges** show a live ratio for each seed that carries a contrast obligation, measured against the fill the browser actually paints. They sit in the theme editor rather than in an audit view so that an unreadable theme cannot be exported without the ratio having been on screen.

**Notices** appear where one value silently costs others: a zero field border erases five lengths that are not the field's border, and a dark fill needs four values the seeds cannot derive. Each names what it affects and offers to restore or set them. `user/theming.md` explains both.

### The Variables Half

Every themeable variable, grouped as `user/theme-reference.md` groups them, each with its one-line description and its current value. Filter by name or description, or switch to **Only What I Changed** — that view is the export.

A variable that derives from another says so and links to its base. Editing a derived variable pins it, which `user/theming.md` advises against; the control states the consequence rather than hiding it.

A trailing group lists the variables the library writes itself. They appear in the browser's inspector but overriding one does nothing, because the component writes the value again on the next render.

### The Change Count

`Copy Theme` carries the number of variables your theme sets over and above the library's defaults, not the size of the token surface. It is measured through the browser rather than as text, so `56px` and `3.5rem` count as the same value. Eight to twelve is the number to expect.

---

## Shaping The Form

The `Form` tab has two halves, in the order the work happens.

### Structure

| Step                      | Offers                                                                           |
| :------------------------ | :------------------------------------------------------------------------------- |
| **1 Start**               | `Blank Form`, `The Sample`, or `Paste Template` — the last opens Import & Export |
| **2 Sections And Fields** | Reorder a field, remove it, or open it for editing                               |
| **3 Add**                 | A field of any type into any section, or a new section                           |

Starting over replaces the fields on the stage and leaves the theme untouched. A blank form is one empty section rather than none, because every add needs somewhere to add into.

### Fields

Three blocks over two scopes, spelled out on screen so it is never unclear how far a control reaches: the first two change every field at once, the last only the selected one.

| Scope                          | Changes                                                                                    |
| :----------------------------- | :----------------------------------------------------------------------------------------- |
| **Every Field: Decoration**    | Label position, required markers, hints, adornments, alignment, readonly, disabled, locale |
| **Every Field: Validation**    | Which validator runs, when it runs, and when its messages appear                           |
| **This Field Only: `<label>`** | Identity, state, decoration, behaviour and options for the selected field                  |

Selecting a field selects it for editing; while the `Fields` half is showing, focusing a field in the preview selects it too.

A control appears only where that kind of field honours the input. The decorator layout is fixed per component and decides two answers outright: only the horizontal layout honours a label position other than `outside`, and the vertical layout renders no prefix or suffix at all. `user/decoration.md` states the rule, and the Studio never offers a control that would silently do nothing.

**Locale** is one control, because it moves the date field's translations, its first day and its token format together, and switches the paired field's format with them.

---

## Taking It Away

The `Import & Export` tab has two halves, one per thing the Studio produces. Each is derived from what is on the stage, so neither can disagree with what you are looking at, and pasting either back reproduces it.

| Half      | Export                                                                              | Import                                  |
| :-------- | :---------------------------------------------------------------------------------- | :-------------------------------------- |
| **Theme** | The `:root` block to paste into your own stylesheet                                 | A block you saved earlier               |
| **Form**  | The Angular template this configuration produces, and a component for it, read-only | A whole template, its sections included |

Both halves are the same pair of sections, `Export` and `Import`. Each `Export` carries the block, a copy, and a reset that puts that half back to where it started — the shipped theme, or the sample form.

The top bar carries a copy for each half and, beside it, a control that opens that half here. `Copy Theme` and `Copy Template` copy with no intermediate dialog; the theme's export options cover CSS or SCSS, whether the page surface is included, and whether the per-variable comments are emitted. Declarations that only restate a library default are left out.

**The Component Is A Proposal.** The template binds `model`, `shape` and, under Vest, `suite`. `Copy Component` copies one standalone component that declares them the way `user/validation.md` lays a form out: the model typed by what each field writes, its shape, and under Vest a suite with no rules in it — the Studio has no rule editor. Any component that provides the three names serves the template as well. The component is not read back in.

**What An Import Ignores, It Lists.** A theme import applies the variables the library declares and lists the rest, because a variable the library does not declare would produce a control that appears to do nothing. A template import handles a static, attribute-only subset: bindings to expressions and control flow are reported rather than silently dropped.

**The Form Is Derived, Not Authored.** An Angular production build contains no template compiler, so a pasted template cannot become live components. The configuration is the source of truth and the template and component are generated from it, which is why both are read-only and why structure is edited through controls rather than by typing.

---

## What The Studio Does Not Decide

- **The page behind the form** is the consumer's. The library styles fields only, so that block is emitted separately and is yours to place.
- **The validator.** The Studio demonstrates Vest, Angular's own validators and none, but the rules themselves belong in your project. `user/validation.md` covers connecting one.
- **The layout.** The preview lays its fields on a grid of its own. The exported template carries the fields and their decorators, not that grid.
