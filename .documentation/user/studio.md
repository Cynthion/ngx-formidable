# Studio

The Studio is a page that builds a theme and a form against the real components, and hands back the CSS and the Angular template to paste into your own project. It is published as the [live Studio](https://cynthion.github.io/ngx-formidable/) and needs no install, no account and no build.

Nothing you do on it leaves the page. The theme and the workspace sizes are kept in the browser's local storage, so a return visit resumes where you stopped.

How theming works, and which variables are worth setting, is in [Theming](theming.md). Every variable is listed in [Theme Reference](theme-reference.md). This document covers the page itself.

---

## The Three Routes

| Route       | Holds                                                            |
| :---------- | :--------------------------------------------------------------- |
| `/`         | The Studio: a live form, and the panel that changes it           |
| `/specimen` | The Specimen: every field, one change at a time, under any theme |
| `/docs`     | These documents                                                  |

The top bar carries all three, the repository link, the page's own light or dark appearance, and a copy button for the theme.

---

## The Three Regions

| Region           | Where            | Holds                                                                     |
| :--------------- | :--------------- | :------------------------------------------------------------------------ |
| **Top Bar**      | Across the top   | The three routes, the appearance toggle and `Copy Theme`                  |
| **Stage**        | The wide column  | The form, on an explicit page surface, with the model drawer beneath it   |
| **Editor Panel** | Beside the stage | `Theme`, `Form` and `Export & Import`, each a tab over the same live form |

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

The `Theme` tab has two halves. `Design` is a ladder of numbered steps in the order [Theming](theming.md) puts them; `Variables` is the whole surface. Work down the ladder and stop as soon as it looks right.

| Step        | Sets                                                          | Variables |
| :---------- | :------------------------------------------------------------ | --------: |
| **Presets** | A named pair of one field shape and one palette               |           |
| **1**       | The brand colour, and whether resting labels take it too      |         1 |
| **2**       | Repaint: the colour seeds everything else derives from        |         8 |
| **3**       | Reshape: height, border thickness, radius, horizontal padding |         4 |
| **4**       | The page behind the form                                      |           |
| **5**       | Fonts: the family, and the size, weight and line height       |           |

**Presets First**: each thumbnail is a real field rendered under that theme rather than a picture of one. `Randomize` pairs a shape, a palette and a family at random, which is the fastest way to see that the two axes are independent. `Reset To Default Theme` returns to the library's own defaults.

**The Page Behind The Form** is yours, not the library's. The library styles fields and never the surface they sit on, so this block is exported separately and commented as such.

**Contrast Badges** show a live ratio for each seed that carries a contrast obligation, measured against the fill the browser actually paints. They sit in the theme editor rather than in an audit view so that an unreadable theme cannot be exported without the ratio having been on screen.

**Notices** appear where one value silently costs others: a zero field border erases five lengths that are not the field's border, and a dark fill needs four values the seeds cannot derive. Each names what it affects and offers to restore or set them. [Theming](theming.md) explains both.

### The Variables Half

Every themeable variable, grouped as [Theme Reference](theme-reference.md) groups them, each with its one-line description and its current value. Filter by name or description, or switch to **Only What I Changed**: that view is the export.

A variable that derives from another says so and links to its base. Editing a derived variable pins it, which [Theming](theming.md) advises against; the control states the consequence rather than hiding it.

A trailing group lists the variables the library sets itself. They appear in the browser's inspector, but overriding one does nothing useful, because the library sets each on the element where it applies.

### The Change Count

`Copy Theme` carries the number of variables your theme sets over and above the library's defaults, not the size of the token surface. It is measured through the browser rather than as text, so `56px` and `3.5rem` count as the same value. Eight to twelve is the number to expect.

---

## Shaping The Form

The `Form` tab has two halves, in the order the work happens.

### Structure

| Step                      | Offers                                                                          |
| :------------------------ | :------------------------------------------------------------------------------ |
| **1 Start**               | `Blank Form`, `The Sample`, or `Paste Template`. The last opens Export & Import |
| **2 Sections And Fields** | Reorder a field, remove it, or open it for editing                              |
| **3 Add**                 | A field of any type into any section, or a new section                          |

Starting over replaces the fields on the stage and leaves the theme untouched. A blank form is one empty section rather than none, because every add needs somewhere to add into.

### Settings

One editor, with an `Applies to` switch above it. The switch is how far a control reaches, so it is selected rather than read.

| Scope            | Changes                                                                                  |
| :--------------- | :--------------------------------------------------------------------------------------- |
| **App Defaults** | What `provideNgxFormidable({ defaults })` would say, for every form and field            |
| **The Form**     | The master switches every field obeys, sample adornments, the locale, and the validation |
| **This Field**   | Identity, state, decoration, behaviour and options for the selected field                |

Selecting a field selects it for editing; while the `Settings` half is showing, focusing a field in the preview selects it too. A field chip opens this half at `This Field`.

**App Defaults Are What The Preview Is Given**: the stage runs the library's own resolution, as [Getting Started](getting-started.md) describes it. Each control there offers `Library Default` to set nothing, says how many fields (or whether the form) state their own value, and offers `Clear` to make them inherit again. At the two narrower scopes, the matching controls offer `App Default`, naming the value in force. A field reads its defaults when it is created, so changing one rebuilds the preview.

**Adornment Examples Are Samples**: an adornment is markup you project per field, so no default can supply one. `The Form` fills every field's slot with a sample, states what most fields carry, and offers `Apply To All` to reassert it over the rest.

A control appears only where that kind of field honours the input. The decorator layout is fixed per component and decides two answers outright: only the horizontal layout honours a label position other than `outside`, and the vertical layout renders no prefix or suffix at all. [Decoration](decoration.md) states the rule, and the Studio never offers a control that would silently do nothing.

**Locale** is one control, because it moves the date field's translations, its first day and its token format together.

**Filtering** is the one control that is not an input on the field. The autocomplete filters by each option's `match` and reports its filter text as `filterChange`. The Studio filters the list itself instead, with the strategy this control swaps (fuzzy, contains or starts-with), and gives each option a `match` that keeps it. Type a typo under each. [Fields](fields.md) states the rule.

### What The Sample Form Shows

The sample form is a pizza order that starts already filled in, because an empty form shows none of the filled, selected and floating-label states a theme is judged by. Beyond a field of every type, it carries four things a single field cannot show on its own.

| Feature                | Where                                                                                                                           |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Groups**             | `When` and `Payment` each nest their fields under a key of their own in the model. `When` adds a rule that reports on the group |
| **Conditional Fields** | The handover toggle decides whether the address or the branch is rendered, and the payment method whether the card number is    |
| **A Template Picker**  | Choosing a pizza fills the sauce and the toppings below it, and leaves every other field alone                                  |
| **A Masked Field**     | An unmasked and a masked input side by side, so the mask is visible without being described                                     |

**Every Field Type Is On Screen When The Form Loads**: some appear more than once for that reason; the branch dropdown can be swapped out only because the pizza picker keeps that component on the page.

**The Pizza Is A Starting Point, Not A Lock**: its preset is applied when you change the picker and never again, so anything you edit afterwards stands. `Custom` carries no preset, so it changes nothing.

The model drawer is where all of this is legible: the two groups nest, and a conditional field that is not rendered keeps its key, and nothing validates it. [Forms](forms.md) covers what conditional fields mean under each forms API.

---

## Taking It Away

The `Export & Import` tab has two halves, `Export` and `Import`, each a row of tabs with one file on screen at a time. Every export is derived from what is on the stage, so none can disagree with what you are looking at. Pasting the theme back reproduces it; pasting the template back reproduces the form's fields and sections, and lists what it leaves behind.

| File           | Export                                                      | Import                                  |
| :------------- | :---------------------------------------------------------- | :-------------------------------------- |
| **Theme**      | The `:root` block to paste into your own stylesheet         | A block you saved earlier               |
| **Template**   | The Angular template this configuration produces, read-only | A whole template, its sections included |
| **Component**  | The component the template binds, read-only                 | Not read back                           |
| **Schema**     | The model's type, its initial value and the form's rules    | Not read back                           |
| **App Config** | The app defaults the template leaves out, read-only         | Not read back                           |

Each export carries the file and a copy.

The top bar's `Copy Theme` copies the theme with no intermediate dialog. The form has no copy there: its template does not compile without its component and its schema, so all three are taken from here. The theme's export options cover CSS or SCSS, whether the page surface is included, whether the per-variable comments are emitted, and whether the defaults are stated explicitly. Declarations that only restate a library default are left out.

**A Theme Block States A Delta**: the `:root` block carries what the theme says the library's defaults do not, so it reproduces the theme wherever those defaults are what it lands on, as they are in your own stylesheet. Read back into the Studio it lands on the theme already on the stage instead, and what a delta leaves unsaid stays as it is. Either checkbox closes that gap:

| Checkbox              |  Half  | Effect                                                                                         |
| :-------------------- | :----: | :--------------------------------------------------------------------------------------------- |
| **Explicit Defaults** | Export | States the value in force for every variable a Studio theme can set, not only the changed ones |
| **Onto The Defaults** | Import | Puts the theme back to the library's defaults first, then applies the block. On by default     |

The page surface is the page's rather than the library's, so `Onto The Defaults` returns it to the Studio's own starting surface unless the block states it, which is what `Page Surface` is for.

**The Form Is Signal Forms**: the three files are one form, laid out the way the library's convention has it:

| File              | Tab         | Holds                                                                                              |
| :---------------- | :---------- | :------------------------------------------------------------------------------------------------- |
| `my-form.html`    | `Template`  | `<form [formRoot]="form">`, and every field decorated and bound by `[formField]`                   |
| `my-form.ts`      | `Component` | The model `signal`, the `form()` over it, the components the template uses, the preset handlers    |
| `my-form.form.ts` | `Schema`    | The model's type, an initial model defining every key, the `schema()`, and a suite or a Zod schema |

**The Schema Holds A Field's State**: `[formField]` hands a field its readonly and disabled state, its required marker and its limits, and rejects a binding to any of them beside it. So the schema states them as rules, such as `readonly()`, `min()` and `maxLength()`, and a required marker with no rule behind it as `REQUIRED` metadata. Neither the component nor the schema is read back in.

**The Validator Writes The Checks**: `my-form.form.ts` always holds the form's rules, and the validator decides who writes the checks. The sample's rules are the same under every validator: the same messages on the same fields, groups and whole form, on the stage and in the export alike. `Validator` on `The Form` picks who writes them:

| Validator                  | Writes The Checks As                                                          | Marks A Field Required        |
| :------------------------- | :---------------------------------------------------------------------------- | :---------------------------- |
| `Angular's built-in rules` | `required()`, `pattern()`, `maxLength()` and `validate()` in the `schema()`   | `required()` itself           |
| `Vest suite`               | `createMyFormSuite()`, a suite per form, run through `validateStandardSchema` | `REQUIRED` metadata beside it |
| `Zod schema`               | `myFormZodSchema`, run through `validateStandardSchema`                       | `REQUIRED` metadata beside it |
| `None`                     | Nothing: only the fields' own limits apply                                    | The marker alone              |

The file imports `vest` or `zod` only under its own validator. A rule is left out unless every field it reads is on the form and writes the same type as in the sample, so a form built from the sample exports only the rules it can run.

**The App Config Holds What The Export Leaves Out**: a field or form that states nothing is emitted without the attribute, so the app defaults are what give it its value. What the form states for itself (when messages appear, whether required markers show) the component provides over them. `Copy App Config` copies the `app.config.ts` that provides them; it is also on `App Defaults`. The app config belongs to the app rather than the form, so it is not read back in.

**The Export Carries Behaviour, Not State**: a conditional field's condition is a `hidden()` rule in the schema, and the template wraps the field in `@if (!form.address().hidden())`, so a field the stage is currently hiding is still in the template. A grouped field is bound under its group, `form.payment.method`. Every key of the initial model starts empty. The export is the form, not a snapshot of it.

**Some Behaviour Belongs To The Component**: a template picker's presets are a map, and a template cannot hold one. The template binds the handler to the field's pick, `(valueChange)="applyPizzaPreset($event)"`, and `Copy Component` declares that handler and the map beside it. The two names are derived from the field, so the pair always fits together.

**What An Import Ignores, It Lists**: a theme import applies the variables the library declares and lists the rest, because a variable the library does not declare would produce a control that appears to do nothing. A template import handles a static, attribute-only subset: each field's name and group come from its `[formField]` path. It does not read the schema, so a field comes back without its state, its limits, its required marker and its condition. Bindings to expressions, control flow, the `@if` around a conditional field and a handler whose behaviour lives in the component are reported rather than silently dropped, so re-importing the sample tells you its conditions and presets did not come with it.

**The Form Is Derived, Not Authored**: an Angular production build contains no template compiler, so a pasted template cannot become live components. The configuration is the source of truth and the files are generated from it, which is why they are read-only and why structure is edited through controls rather than by typing.

---

## The Specimen

`/specimen` teaches the library one idea at a time: seven numbered chapters in three parts, each changing one thing and holding everything else still. It changes nothing and exports nothing.

| Part                         | Chapters                                                     |
| :--------------------------- | :----------------------------------------------------------- |
| **How A Field Is Painted**   | 1 What Paints What · 2 Defaults To Midnight · 3 Whole Themes |
| **How A Field Is Decorated** | 4 Label Positions · 5 Adornments                             |
| **How A Field Behaves**      | 6 States · 7 Panels                                          |

Each chapter states what to notice, one thing to try, and the snippet that does it in your own template or stylesheet.

**What Paints What Comes First**: it names the variable behind each part of a field, with the value the current theme gives it, and the rest of the page builds on that map.

**The Page Theme Repaints Everything**: the picker at the top offers `Your Studio Theme`, the one built on `/`, and each preset; a ladder step starts again from the library's defaults. None of them changes the Studio's theme.

**A Matrix Opens On A Few Fields**: chapters 4 to 6 compare fields in a grid and open on a few that cover the three layouts; `Show all` adds the rest.

**Every Name Is A Link**: a field's name opens its entry in [Components](components.md), and a variable's name opens its own row in [Theme Reference](theme-reference.md).

---

## What The Studio Does Not Decide

- **The Page Behind The Form**: the consumer's. The library styles fields only, so that block is emitted separately and is yours to place.
- **The Validator**: the Studio runs and exports the sample's rules under Angular's own, Vest and Zod, but your own rules belong in your project. [Validation](validation.md) covers connecting one.
- **The Layout**: the preview lays its fields on a grid of its own. The exported template carries the fields and their decorators, not that grid.

---

## Related

- [Theming](theming.md): the default theme, how theming works, and how to find your own
- [Theme Reference](theme-reference.md): every overridable `--formidable-*` custom property
- [Getting Started](getting-started.md): install, wiring, the stylesheet, a first form
- [Validation](validation.md): Angular's rules, Vest, Zod or none; messages and their reveal
