# Portal

Design of the portal: the interactive page a developer uses to build a theme for their own brand, and what the GitHub Pages deploy serves. This document is the design the portal is reviewed against; [`user/studio.md`](../user/studio.md) is the consumer-facing guide to the page itself and does not restate anything here.

For the theming model see [`user/theming.md`](../user/theming.md) and [`user/theme-reference.md`](../user/theme-reference.md). For coding conventions and the Definition of Done see [`impl/definition-of-done.md`](../impl/definition-of-done.md).

## Scope

**The Bar**: a developer lands knowing nothing about the library and leaves with a theme in their clipboard, having read no instructions. Every decision in this document is judged against that sentence.

| Concern      | Portal                                                                  |
| :----------- | :---------------------------------------------------------------------- |
| **Location** | `src/app/portal/`, the whole of the `ngx-formidable-portal` application |
| **Deploy**   | The Pages workflow, which has no portal-specific step                   |

A separate Angular project is not used: the portal is what the application in `src/` is.

---

## Page Structure

Three regions. The preview form is never hidden, because the form repainting is what the page demonstrates.

| Region        | Placement          | Behaviour                                                                                             |
| :------------ | :----------------- | :---------------------------------------------------------------------------------------------------- |
| **Top Bar**   | Fixed, full width  | Name, `Studio` and `Docs`, the GitHub link, the appearance toggle, and the copy button with its count |
| **Stage**     | Left column, fluid | The preview form on an explicit page surface. Scrolls independently                                   |
| **Inspector** | Right column       | Tabbed editors. Own scrollbar, collapsible, and resizable from the divider on its left edge           |

```txt
┌──────────────────────────────────────────────────────────────────────────┐
│ ◇ ngx-formidable      [ Studio │ Docs ]  ⌘GitHub ◐ [Copy Theme 16]       │
│   Angular form fields you can actually theme, configure and customize.   │
├───────────────────────────────────────────┬──────────────────────────────┤
│ PREVIEW  Field Types  Accessibility       │ Theme │ Form │ Import&Exp  › │
│ ┌─ your page ───────────────────────────┐ │                              │
│ │  Section heading                      │ │ ┌ Design │ Variables ┐       │
│ │  ┌──────────────┐ ┌──────────────┐    │ │ │ Pick a look, then work…   │
│ │  │ field        │ │ field        │    │ │ │ ▾ Presets Start here   12 │
│ │  └──────────────┘ └──────────────┘    │ │ │   [ Randomize ] + why     │
│ │   (Input ↗)        (Input ↗)          │ │ │   [thumbnails…]           │
│ │  ┌──────────────┐ ┌──────────────┐    │ │ │ ▸ 1 Brand Colour    1 var │
│ │  │ field        │ │ field        │    │ │ │ ▸ 2 Repaint       8 seeds │
│ │  └──────────────┘ └──────────────┘    │ │ │ ▸ 3 Reshape     4 lengths │
│ └───────────────────────────────────────┘ │ │ ▸ 4 The Page Behind The…  │
├═══════════════════════ drag ══════════════┤◂drag 5 Fonts                 │
│ ▾ MODEL   22 Of 24 Filled · Form Invalid  │                              │
│   By Section │ Errors │ Raw               │                              │
└───────────────────────────────────────────┴──────────────────────────────┘
```

**No Title Row**: the tab strip is the inspector's header. A row above it could only add the word "Inspector", which names a panel that edits rather than inspects and which the three tabs say better, and it costs a row of the height the narrow-viewport sheet is already short of.

**Stage Surface**: the form sits on an explicit page surface with a visible edge. That surface is the object a dark theme needs, because the library styles fields and never the page behind them.

**Model Drawer**: belongs to the stage column, not the page width, so the inspector keeps its full height. Its collapsed bar always states the fill count and validity.

**Narrow Viewports**: below the two-column breakpoint the inspector becomes a bottom sheet covering at most three fifths of the height, so fields stay visible and live while they are edited. When a library `sheet` panel opens, the inspector sheet collapses, because that panel fills the bottom of the stage and an expanded inspector leaves the stage too short to show it.

**Stacking**: the inspector takes a `z-index` above `--formidable-sheet-z-index`, so a panel scrolled beneath it cannot punch through. [`tech/layering.md`](layering.md) holds the layer model.

**Change Counter**: the copy button states the number of variables the user has changed, never the size of the token surface. The library's own guidance is that eight to twelve variables are enough, and a number that rises as the user works states that without a sentence of explanation. "Changed" is measured against the library's own default rather than against an empty set, and through the browser rather than as text: the schemes state their values in full, and several restate a token default in a different unit. The count is itself a control: it opens the block it counts, so the theme is never uninspectable.

**Resizable Panels**: the inspector's width and the model drawer's height are dragged from the divider on their own edge, reset by double-clicking it, and persisted. A divider reports the pointer's position and the panel does the arithmetic, because the two measure from opposite edges. The drawer's height is the whole drawer's, bar included, so the divider tracks the pointer rather than lagging it by the bar.

---

## Navigation

Routes use hash location.

| Route                   | Tab        | Holds                                            |
| :---------------------- | :--------- | :----------------------------------------------- |
| `/`                     | `Studio`   | The stage and the inspector                      |
| `/specimen`             | `Specimen` | Every field, one change at a time, lazily loaded |
| `/docs`, `/docs/:topic` | `Docs`     | The documentation page, lazily loaded            |

The top bar is on all of them and its tabs are the only navigation there is, so no route carries a back control of its own.

**No Preview Route**: turning the `Field Types` switch off leaves the stage showing the form exactly as a consumer's page would, which is what a preview route would have duplicated.

**The Specimen Is Not A Second Stage**: it holds fixed comparisons and no editor, so it cannot disagree with the Studio. Every cell is a `SpecimenCell`: the Studio's own `PreviewField` over the sample form's field of that kind, bound to a form of its own so no two cells share a field. An invalid cell carries a rule reporting its field required, so it shows the library's real invalid state. Its theme is a `ThemeScope` over the page rather than a write to `:root`, which is what lets a preset repaint the page without touching the Studio's theme. The chapters run concept first (what paints a field, then decoration, then behaviour), and a matrix opens on a few kinds covering the three layouts, because twelve rows at once teach nothing that four do not. The ladder carries `data-shot`, because `npm run screenshots` shoots it for the README.

**Deep Links Into The Docs**: `docs/:topic/:anchor` opens a document at a heading or at a variable's row. The renderer gives every `##` and `###` heading and every Theme Reference row an id; only the `##` ones are listed in the contents.

**Hash Location**: GitHub Pages serves no SPA fallback, so a path-routed deep link requires an `index.html` copy published as `404.html` and is then served with an HTTP 404 status. Hash location needs neither, so the deploy workflow needs nothing portal-specific.

**Tabs Are Not Routes**: the inspector's tabs are simultaneous views of one live object, and routing them would hide either the preview or the editor. There are three, in the order the work happens.

| Area                | Halves                  | Answers                                                                                                  |
| :------------------ | :---------------------- | :------------------------------------------------------------------------------------------------------- |
| **Theme**           | `Design`, `Variables`   | How the fields look                                                                                      |
| **Form**            | `Structure`, `Settings` | Which fields exist, and what everything is set to                                                        |
| **Import & Export** | `Theme`, `Form`         | What you take away and paste back: the `:root` block, and the template with its component and app config |

`Form` is `Structure` first: which fields exist has to be settled before what one of them is is worth saying. All three areas carry the same second level, so the strip is learned once rather than per tab. It sticks to the top of the panel's scroll, so which half is showing never leaves the screen.

`Import & Export`'s two halves are the two things there are to take away. Each half is then the same pair of accordions, `Export` and `Import`, because both are round trips and the way back in belongs beside the way out, which is what the tab is named for. A reader who has learned one half has learned the other. The form's `Export` holds four files, so they are tabs (`Template`, `Component`, `Schema`, `App Config`), one on screen at a time, which keeps the `Import` header in view beneath them.

Which half is showing and which of its two accordions is open are both held in the inspector store rather than in the components: `App Defaults` links to the form half, and `Structure`'s third way to start opens it **at its import**, which a panel's own state could not be reached to say. Inside every area the sections are accordions with one open at a time, so the run of collapsed headers is the panel's table of contents rather than a scroll the user has to survey.

**Anchor Targets**: per-token deep links use a route parameter and scroll programmatically. A fragment on top of a hash route is ambiguous.

---

## Theming

### Where The Theme Is Applied

**The user's theme is written to `:root`**, as a consumer would write it, using `document.documentElement.style`.

A custom property's `var()` is substituted where the property is **declared**. Descendants inherit the substituted value. Most of the library's custom properties are derived from others and are declared once, in the `:root` block of `projects/ngx-formidable/src/lib/styles/_formidable-vars.scss`:

```scss
--formidable-field-inner-height: calc(var(--formidable-field-height, …) - 2 * var(--formidable-field-border-thickness, …));
```

Setting `--formidable-field-height` on a wrapper element therefore leaves `--formidable-field-inner-height` frozen at the value computed for `:root`. Scoping the user's theme to the preview subtree does not fail visibly; it half-applies. [`user/theming.md`](../user/theming.md) states the consumer-facing half of this rule.

Applying to `:root` has a second consequence worth stating: what the user copies is the same block that is live, so the export cannot drift from what is on screen.

### Chrome Insulation

The portal's own controls are built from the library's components, so they read `--formidable-*` and a `:root` theme reaches them. The cascade cannot insulate them, for the reason above.

**The chrome re-emits the full default variable block under its own selector**, where derivation recomputes correctly against the chrome's own base values. The `:root` block in `_formidable-vars.scss` is a mixin that `:root` includes, so the emitted CSS is the same either way, and the mixin is not forwarded, so the closed SCSS surface described in [`impl/styling.md`](../impl/styling.md) holds. The portal reaches library styles by path through the `stylePreprocessorOptions.includePaths` entry in `angular.json`.

The chrome's own theme is compact and is not user-editable. `--formidable-font-family` is declared nowhere in the library's block, so the re-emitted block cannot reset it; the chrome pins it to its own family instead.

**The chrome measures border-box**: `.portal-chrome` and its subtree set `box-sizing: border-box`, and the preview form is left on the box model a consumer's page gives it. A panel control is `width: 100%` inside a padded column, and a content box would put its own padding and border outside that column, which a user agent already prevents for a `button` and a `select`, and does not for an `input` or a `textarea`.

### The Theme Editor

The ladder in [`user/theming.md`](../user/theming.md) is the layout: one scrollable column of numbered steps, in that order, which a user may stop at any point in.

| Step    | Control                                                       | Variables |
| :------ | :------------------------------------------------------------ | --------: |
| Presets | Named looks, each a live miniature of a real field            |           |
| 1       | Brand colour, with an option to accent resting labels         |         1 |
| 2       | Repaint: the colour seeds                                     |         8 |
| 3       | Reshape: height, border thickness, radius, horizontal padding |         4 |
| 4       | The page behind the form                                      |           |
| 5       | Fonts                                                         |           |
| All     | Every themeable variable, grouped, behind a disclosure        |       All |

**Presets First**: the geometry and colour schemes ship as named pairs with live thumbnails. They are what a cold visitor clicks, and they are the fastest evidence that the library is not a one-colour library. The two independent axes remain available behind a disclosure.

**Grouping**: the groups are the sections of [`user/theme-reference.md`](../user/theme-reference.md), which carries a one-line description per variable for inline help.

**Derived Variables Are Marked**: a derived variable renders as following its base, with a link to it. Editing one pins it, which is what [`user/theming.md`](../user/theming.md) advises against, so the interface states the consequence rather than hiding the control.

**Show Only What I Changed**: one toggle collapses the full list to the user's own theme. That view is the export preview.

**Traps Handled By The Interface** rather than by documentation:

- **Units**: length editors always emit a unit, so a unitless zero cannot be produced.
- **Gradients**: colour wells accept colours only, because the fill feeds `color-mix()`.
- **Borderless Geometry**: setting the field border thickness to zero raises a notice naming the five lengths it also erases, with a control that restores them. [`user/theming.md`](../user/theming.md) names the five.
- **Dark Fills**: a dark fill raises a notice offering to set the four values the seeds cannot derive.

**Contrast Badges**: the seeds that carry a documented contrast obligation show a live ratio against the current fill. This is part of the theme editor rather than the accessibility view, because it prevents an inaccessible theme from being exported at all.

**Export And Import**: the copy button copies the `:root` block with no intermediate dialog. Options cover format, whether the page surface is included, and whether the per-variable comments are emitted. The page surface is emitted as a separately commented block, because the distinction between what the library styles and what the consumer styles is the most confusable thing on the page. Import parses a pasted block, applies what it recognises, and lists what it did not.

**The Round Trip Needs A Base To Land On**: the block states the delta against the library's defaults, which is what a consumer's own stylesheet is. The portal's own base is a geometry and a colour scheme, so a delta merged onto it keeps whatever those schemes say and the delta does not restate: a theme neither side asked for. Two controls close that, and the import's is on by default so that the shipped pair round-trips:

| Control             |  Half  | Does                                                                                |
| :------------------ | :----: | :---------------------------------------------------------------------------------- |
| `Explicit Defaults` | Export | States the value in force for every variable in `SCHEME_VARS`, not only the changed |
| `Onto The Defaults` | Import | Drops both scheme axes, the overrides and the page, then applies                    |

`SCHEME_VARS` is the union of what the two axes can set, which is what can pollute an import. Stating the whole manifest instead would freeze the derived ladder: `--formidable-field-inner-height` and the label offsets are `calc()` over the seeds, and a consumer who pinned them would find the seeds no longer move anything.

**The Value In Force Is Measured, Not Derived**: `Explicit Defaults` reads each value off a second probe carrying the library's block with the theme written over it. The manifest records what a variable falls back to, not whether the library's declaration aliases that variable or builds something else out of it: the focus shadow is three values wide and names two. A declared variable's computed value already carries the theme underneath it; only the variables the library declares nowhere have to follow their own fallback, and those are aliases outright. The probe is separate from `:root` so that a read is not waiting on the effect that paints the page.

### Token Manifest

An editor cannot enumerate the themeable surface from the `:root` block alone, and cannot infer a control type from a value. The manifest is the curation that makes both possible.

| Class                                         | Editable | Notes                                                               |
| :-------------------------------------------- | :------: | :------------------------------------------------------------------ |
| Declared in the `:root` block                 |   Yes    | The bulk of the surface                                             |
| Overridable, read at use site, never declared |   Yes    | The four logical corner radii, the panel and toggle-track thickness |
| Written by the library itself                 |    No    | Listed in [`user/theme-reference.md`](../user/theme-reference.md)   |

The second class is deliberately absent from `:root` so that it works on a single field as well as globally. It is what an asymmetric field shape needs, so a generator that reads only `:root` misses exactly the interesting variables. The third class is overwritten by the library on the next render, so exposing it would produce a control that appears to do nothing.

**Structure**: a checked-in TypeScript manifest carrying the name, group, control type and class of each variable. Defaults are read at runtime with `getComputedStyle` and never stored, so a default cannot drift from the token that produces it.

**Control Types Are Curated, Not Inferred**: a quoted string for the required marker, a timing function, a viewport unit, shorthand pairs, unitless line heights used as multiplicands, box-shadow composites, and a colour whose name carries no colour prefix all defeat inference from the value.

**Drift Gate**: a spec walks `document.styleSheets`, collects the declared `--formidable-*` properties and asserts that the manifest and the stylesheet agree in both directions, and that no library-written variable is exposed. It runs in the portal project, which loads the library stylesheet and runs in CI.

### Colour Schemes

Two independent light and dark concepts exist, and they carry distinct names because conflating them makes the page incomprehensible.

| Name                     | Owner    | Exported |
| :----------------------- | :------- | :------: |
| **Page Behind The Form** | Consumer |   Yes    |
| **Portal Appearance**    | Portal   |    No    |

The library styles fields and never the surface behind them, so the page surface is the portal's own variable and is exported as a separately commented block. The portal's own appearance follows the operating system preference by default.

A dark fill needs four values beyond the seeds, because the readonly and disabled fills are mixed toward `transparent` and the option fills default to black at low alpha. [`user/theming.md`](../user/theming.md) records them.

### Fonts

The family is `--formidable-font-family`, an ordinary override like any other variable: a preset and `Randomize` write it into the overrides, and it exports and imports through the manifest. Unset, the fields take the page's family, so the page surface pins a family of its own.

**Fonts Are Local**, as stacks over faces the platform already has, covering five archetypes (grotesque, humanist, serif, monospace and display) plus a free-text entry. The deploy is static and must work offline and behind a proxy, and a fetched family adds a third-party origin and a flash of unstyled text that undoes the instant repaint the presets exist to demonstrate. Stacks avoid all of it without shipping a byte. They render differently per platform, and a display face has no reliable stand-in; bundling licensed `woff2` files is filed in [`impl/backlog.md`](../impl/backlog.md).

---

## Preview Form

**The Context Is A Pizza Order.** It is chosen for being a domain nobody has to be taught. A visitor changing a setting in the sidebar has to see the consequence and recognise it, and a form about its own subject matter cannot do that: reading the domain competes with reading the change. It also gives every option field a reason for a `disabled` and a `readonly` entry that needs no caption, and it carries a submit destination.

**Every Field Is Previewed**, inside one example form with a consistent context, laid out on a grid rather than at uniform full width. The form is fully functional and fillable, and starts pre-filled: an empty form shows none of the filled, selected or floating-label states that a theme is judged by.

| Section                       | Field                 | Type                     | Columns |       Rendered       |
| :---------------------------- | :-------------------- | :----------------------- | :-----: | :------------------: |
| **Your Pizza**                | Pizza                 | `dropdown`, with presets |    2    |        Always        |
|                               | Size                  | `select`                 |    1    |        Always        |
|                               | Crust                 | `select`                 |    1    |        Always        |
|                               | Sauce                 | `radio-group`            |    1    |        Always        |
|                               | Toppings              | `checkbox-group`         |    1    |        Always        |
|                               | Spice                 | `slider`                 |    2    |        Always        |
| **Delivery Or Collection**    | How To Get It         | `toggle`                 |    2    |        Always        |
|                               | Delivery Address      | `autocomplete`           |    2    |   While delivering   |
|                               | Pick Up From          | `dropdown`               |    2    |   While collecting   |
| **When** (group `when`)       | Date                  | `date`                   |    1    |        Always        |
|                               | Time                  | `time`                   |    1    |        Always        |
| **Payment** (group `payment`) | Pay By                | `radio-group`            |    1    |        Always        |
|                               | Card Number           | `input`, masked          |    1    | While paying by card |
| **Your Order**                | Name On The Order     | `input`                  |    1    |        Always        |
|                               | How Many              | the custom counter field |    1    |        Always        |
|                               | Phone Number          | `input`, masked          |    1    |        Always        |
|                               | Email Address         | `input`                  |    1    |        Always        |
|                               | Notes For The Kitchen | `textarea`               |    2    |        Always        |

**Every Type Is On Screen When The Form Loads.** The one rule the layout cannot trade away: a component reachable only by flipping a switch is a component a visitor never finds, and the Studio's whole claim is that every field is on the page. It is what decides where a type is carried more than once.

| Type          | More Than Once Because                                                                                                 |
| :------------ | :--------------------------------------------------------------------------------------------------------------------- |
| `input`       | Two unmasked and two masked show what a mask does; an off-by-default mask is an invisible feature                      |
| `dropdown`    | The pizza picker is unconditional, so the branch is free to be one half of the swap without taking the type off screen |
| `select`      | Two lists of the same component, differing only in their options                                                       |
| `radio-group` | The payment method reveals a field the way the handover toggle does, one group deeper                                  |

**The Section Title And Its Fields Never Repeat A Name.** `Delivery Or Collection` heads the section whose toggle is `How To Get It`; a heading and a label reading the same words twice is the page stuttering at the visitor.

**A Pizza Is A Template.** The picker carries `presets`, a patch per option, so choosing one fills the sauce and the toppings and leaves every other field alone. The patch is applied when the user picks that option and never again, so an edit afterwards stands: the choice is a starting point, not a lock. An option with no entry patches nothing, which is what makes `Custom` the absence of a rule rather than a special case.

Presets are applied by `FormValueStore.applyPreset` on the field's own `valueChange`, which only a user's pick emits, so a write to the model applies none. Their keys are **top-level** model keys. That is deliberate: the patch is a spread, and a spread is exactly what the exported component's handler does. A preset the Studio could apply and the export could not would be the divergence the export contract exists to prevent.

The export splits in two, because a map is data and a template cannot hold one. The template binds `(valueChange)="applyPizzaPreset($event)"`, the same output the stage applies presets on; the component declares `pizzaPresets` and that handler, both named off the field by `presetHandlerName` so the two halves cannot drift. The import reads only the template, so a re-imported form arrives without its presets and says so, in the one `in-the-component` note.

**Labels Are Title Case**, on the sample form as on the inspector's own controls, so the two halves of the page read as one product. It covers field labels, a toggle's `onLabel` and `offLabel`, and an option's choice text. It does not cover the sentences: a placeholder, a hint and the clause after an em dash in an option label explain rather than name, and stay as written, as in `Family — sold out today`.

**One Field States Its Own Label Position.** The card number labels `outside`, because it shares a row with a radio group, and a vertical layout labels `outside` and cannot do otherwise, so an `inside` label beside it would put the two labels of one row at different heights. Every other field states nothing, so the `App Defaults` scope counts it as the sample's one field stating its own.

**The Two Group Fields Share A Row**, at one column each. A single-choice list and a multi-choice list read against each other, which is what makes the difference between them legible without a caption.

**The Custom Field Sits Late.** `How Many` is a cart quantity and belongs beside the order, not at the top of the pizza. Placing it in the last section also keeps the library's own components first, which is what a visitor came for.

**Disabled And Readonly Carry The Context**: a sold-out topping is `disabled`, one already in the price is `readonly`. The state has a reason a visitor reads off the label, which is what makes the sample honest rather than decorative.

**Otherwise One Field Per Type.** The sidebar shows two configurations of one field, live, and a short field list is what leaves the form readable at a glance. The exceptions above each buy something a setting cannot.

**Four Behaviours A Single Field Cannot Show.** Each is carried by the sample rather than described beside it, and each is visible in the model drawer.

| Behaviour              | Carried By                                       | What It Demonstrates                                                                  |
| :--------------------- | :----------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Groups**             | `groupName` on the `When` and `Payment` sections | A nested model; `When` adds a rule that reports on the group                          |
| **Conditional fields** | `visibleWhen` on the address, branch and card    | `hidden()` leaves the field out of validation and `@if` off the page; the key stays   |
| **A template picker**  | `presets` on the pizza field                     | One choice filling several fields, and an export split between template and component |
| **Consumer filtering** | `filterStrategy` on the autocomplete             | The field emits filter text and renders what it is handed; the matching is not its    |

**Two Groups, Two Reasons.** `When` is the one a rule needs: neither the date nor the time is wrong alone, so the rule reading both has nowhere to report but the group. `Payment` is the plainer case: details that belong together in the model, whether or not a rule ever reads two of them at once. Both are worth showing, because a group is not only for cross-field rules.

**The Swap Is Both Halves Of The Pair.** One toggle, two fields, one each way: the address is on screen at load and the branch replaces it. Neither takes a type off the form, because the branch's type is also the pizza picker's, which is part of why the picker is a `dropdown`.

**A Condition Names A Field, Not A Path.** `visibleWhen` carries the watched field's `name`, and the group is resolved wherever that field turns out to sit: the renderer resolves it through `pathById`, and the schema serializer through the section the field belongs to, which is what writes `context.valueOf(path.payment.method) !== 'card'`. Keeping the path out of the specification is what lets a field move into or out of a group without every condition naming it having to be rewritten.

**The Group Sits On The Section**, not on each field. A group is a run of adjacent controls, which is what a section already is, and one member per field would be a second ordering to keep in step with the first. The model path follows from it: `FormDefinitionStore.pathById` is the one place that resolves `group.name`, and the model, the field tree, the drawer, the rule targets and the exported model access all read it.

**Conditional Fields Are A Condition, Not A Predicate.** Equality against one field is the whole grammar, because it has to be written out: the schema serializer states it as a `hidden()` rule, and the template gates the field on `hidden()`. The import reads only the template, so it keeps the field, drops the condition and says so, in an `in-the-schema` note. Equality is also what keeps the Studio a form previewer rather than a form builder: there is no sidebar control for it, and the sample is where a visitor meets it.

**The Per-Field Component Is Handed Its Field.** `PreviewForm` resolves each field's `FieldTree` from its model path and passes it in, and `PreviewField` binds it with `[formField]`. A group is a path, not a container, so a grouped field needs nothing an ungrouped one does not.

**A Field's Settings Are Rules.** `[formField]` owns `readonly`, `disabled`, `required` and the limits, and the compiler rejects a binding to any of them beside it. `fieldRules` in `preview-form.schema.ts` states them as rules instead, with the required marker as `REQUIRED` metadata so it marks without reporting, and the Specimen's cells share it. The rules read the specification live, so an edit on the `Settings` tab reaches the field without a new form.

**The Model Has A Key For Every Field.** Signal Forms binds a field only to a key its model defines, so the model is a `linkedSignal` over the fields and their paths: an added field brings its key at its value type's empty value, as the export's initial model does, and a field moved into a group takes its value with it. A hidden field keeps its key, which is why the drawer states it as hidden rather than absent.

**Chips Are Controls, And Are Derived**: each chip names the component its field is, opens that field on the `Settings` tab, and carries a `↗` to say so. The preview explains itself, and every explanation is also the way to change it, which is what replaces the instructions the page is required not to need.

Both halves of a chip come from the specification rather than from prose written beside it: the text is the kind's display name, and the tooltip is what the field is set to, read through the same `ALL_FIELD_ATTRIBUTES` table the markup serializer emits from. A written description cannot hold: editing the field on the `Settings` tab leaves it stating the old value, and a field added in the structure editor has none at all, so the page would be contradicting itself at exactly the moment the user starts working.

A chip is the portal's annotation rather than part of the form, so the `Field Types` switch on the stage bar turns the run of them off, which is what leaves the stage showing the form as a consumer's page would. Each field spans three rows of the field grid (itself, its chip, its accessibility readout) and lays them out as a subgrid, so a pair stays aligned when one field carries a hint or an error and the other does not, and the readouts start on the same line as well. The grid itself carries no row gap: each field states the space below itself, which is what keeps a field's own annotations closer to it than the next field is.

**Option Fields** always carry a sample option that is `disabled` and one that is `readonly`, so their theming is demonstrable.

**A Schema Is Fixed Once Its Form Exists.** A new validator, a new debounce or a structural edit therefore builds a new field tree, on an injector of its own that is destroyed with it, since a form's effects live as long as their injector. Every other setting a rule reads is read live, so it discards none of the touched, dirty and validation state the current tree holds.

**One Rule Set, Spelled Per Validator.** `preview-form.validation.ts` states the sample's rules once (each a target, a message and a check), and each validator spells them: `previewSchema` as Angular's own rules, `createPreviewSuite()` as a Vest suite and `previewZodSchema()` as a Zod schema, the last two run through `validateStandardSchema`. `schema-serializer.ts` writes the same three spellings as text. Switching the validator therefore changes the library and never the rules, which `preview-form.validation.spec.ts` proves by running each over the same models and expecting the same messages on the same paths.

- **Checks**: required, a pattern, a most-items limit, and a check across fields for a group rule or a whole-form rule. A pattern leaves `''` to the required check, which is what `pattern()` does on its own and what Vest's `omitWhen` and the Zod refinement repeat.
- **On The Form**: `rulesOn` leaves a rule out unless every field it reads is on the form and writes the value type it writes in the sample, on the stage and in the export alike, so the structure editor can build any form out of the sample. The type is what keeps a phone rule off a counter renamed `phone`, whose export would not compile; the presence is what keeps an issue off a key the model lacks, on which Signal Forms throws. The sample's types are derived from its definition.
- **Written Twice**: a check across fields is the code the stage runs and the source the export writes. The golden export runs the source over the same models as the stage and expects the same messages, which keeps the two in step.
- **The Required Marker**: `required()` marks the field it checks. Neither Vest nor Zod can tell Signal Forms a field is required, so under either the schema adds `REQUIRED` metadata for every required check.

**A Vest Suite Belongs To One Form.** Each tree gets a suite of its own from `createPreviewSuite()`. A suite from `create` carries state, and the cost of a run grows with every form that has ever used it: `runStatic` does not isolate that and `reset()` does not clear it. One module-level suite shared across forms is therefore quadratic in the number of forms.

**How A Vest Test Reaches Signal Forms.** A test's target becomes its issue's path, and `vest-integration.spec.ts` pins what follows from that:

- **Whole Form**: a target naming no field of the model reports on the root. An empty target would too, but breaks Vest's check that tests run in the same order on every run.
- **Unknown Path**: Signal Forms throws on an issue whose path runs through a key the model lacks.
- **Async Tests**: they never surface; the form stays valid and never pending.
- **Conditions**: a rule reads no condition, because a hidden field is left out of validation.

**How A Zod Schema Reaches Signal Forms.** A Zod schema holds no state, so one per tree is only for the rules that tree has. Its keys are the fields the rules read, typed from `FIELD_KIND_VALUE_TYPES`, and `zod-integration.spec.ts` pins how a check across fields reaches the form:

- **Refinements**: a refinement of the whole reports on the path it names, a group, and on the whole form when it names none.
- **Type Checks**: a key holding a value of another type fails with a message of Zod's own and stops every refinement, which is why an added key starts at its type's empty value, see **The Model Has A Key For Every Field**.
- **Namespace Import**: `import * as z from 'zod'`, as the export writes it. Tree shaking leaves out what goes unused; `import { z }` carries every locale Zod ships.

**Starting Theme**: a preset that is not the shipped default, so that the page is evidence of configurability from the first frame.

---

## Inspector

### Model

Expandable and collapsible panels over the form's current model, mirroring the preview's sections, plus errors, validity, dirty state and the raw serialization. The collapsed bar states fill count and validity and is never hidden, because it is the cheapest evidence that the form is real.

The library's Ubiquitous Language names the object a form edits the **model**. Errors, validity, dirty and submitting are read off the field tree rather than kept beside it, and a whole-form message is listed under `Whole Form`.

### Settings And Decoration

One editor, under an `Applies to` switch. The three positions are the three kinds of state there are, so nothing is filed under a scope it does not belong to.

| Scope            | Holds                                                   | State                             |
| :--------------- | :------------------------------------------------------ | :-------------------------------- |
| **App Defaults** | What `provideNgxFormidable({ defaults })` says          | `FormDefinitionStore.appDefaults` |
| **The Form**     | Master switches, adornment examples, locale, validation | `PortalFormDefinition.options`    |
| **This Field**   | Identity, state, decoration, behaviour, options         | One `PortalFieldSpec`             |

**Scope Is A Control, Not A Heading.** One editor with one set of groups is learned once, and a selected scope answers "how much does this change?" without being read. Decoration exists at two of the three scopes, so naming them in headings alone would put the same group on screen twice under names that have to be read to be told apart.

**The Field Picker Lives Inside Its Scope**, so every control on screen reaches something the visitor can see.

**Selection Follows Focus** while the tab is active, so that clicking a field uses it rather than selecting it. A hover-revealed chip and a field list cover the cases focus cannot reach.

**Groups Are Identical For Every Field**, so the layout is learned once: identity, state, decoration, behaviour, options.

**Capabilities Are Declared, Not Assumed**. `decoratorLayout` is fixed per field component and is not an input. Only the horizontal layout honours a label position other than `outside`, and the vertical layout renders no prefix or suffix at all. A capability table ships with the field model, so that the page whose claim is that everything is configurable never offers a control that silently does nothing.

**Every Option Changeable** means: every input in [`user/components.md`](../user/components.md) has a control, states its default and carries its one-line description. Function-typed inputs are offered as named presets rather than a code editor, because their purpose is to demonstrate what the input is for. Object-typed inputs are offered as preset sets.

**Adornments** are content projection rather than inputs, so no app default can supply one. They live in a field's decoration group and, as adornment examples, on `The Form`, each slot offering none, an icon, text or a button.

**App Defaults Are Given To The Preview.** `App Defaults` holds values of its own, because the library renders from them: `AppDefaultsProvider` provides `FORMIDABLE_DEFAULTS` on the preview `<form>` from `FormDefinitionStore.previewDefaults`, so the stage runs the library's resolution rather than a copy of it, and the chrome keeps the library's own. The form's own `revealOn` and `hideRequiredMarkers` are defaults the form scopes over its fields, so they sit over the app defaults there. A field reads its defaults once, when it is created, so a change rebuilds the preview's fields; the field tree survives it.

**A Field States Its Own Value Or Nothing.** An app-defaulted member is `undefined` in the specification until a field or the form states one, and the editor offers that as a first `App Default` choice naming the value in force. Each `App Defaults` control counts who states their own and clears them back to inheriting. `LIBRARY_DEFAULTS` and the capability table's `panel` name the library's own fallbacks for the `Library Default` choice.

**Adornment Examples Hold No Value.** A control there tallies the fields, states what most of them carry, counts the rest as overrides and offers to reassert its value over them. Holding a value instead would be a second source of truth that nothing renders from and that goes stale against the fields it claims to describe.

**Behaviour Is Split By Subject**: `Text`, `Panel`, `Locale And Format`, `On And Off`, `Range` and `Ticks And Labels`, each rendered only where the capability table says the field has it. A single `Behaviour` group would fill over half the editor for any one field while showing only a fraction of its controls.

**A Select States Its Value Through `portalSelectedValue`**, never through `[value]`, wherever its options come from `@for` or `@if`. A property binding on the `<select>` is applied in the update pass, before the control-flow block has produced any options, and a `<select>` given a value it cannot match falls back to its first option: a control stating the wrong setting, which then writes nothing when the user picks the value it was already claiming.

**Locale** is one control that moves the date field's translations, first day and token format together, and switches the paired field's format. Splitting it into separate controls would lose the demonstration.

### Structure And Generated Markup

An Angular production build contains no template compiler, so user-authored markup cannot become live components. The configuration is therefore the source of truth and the markup is derived from it.

| Direction     | Mechanism                                                                                                                         |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Out**       | The configuration serialized to an Angular template, a component, a schema and an app config, read-only, each with a copy control |
| **In**        | A pasted template parsed with `DOMParser` into the configuration, reporting what it ignored                                       |
| **Structure** | Fields added, removed and reordered through controls rather than by typing                                                        |

**The Export Is The Consumer Convention**: `my-form.html` binds every field by `[formField]` to the form `my-form.ts` holds (`form()` over a `signal` of the initial model), and `my-form.form.ts` holds the model's type, that initial model with every key defined, and the `schema()`. The top bar copies the theme alone: a template copied without the other two does not compile.

- **The Component Reads The Template**: `component-serializer.ts` imports exactly the components and directives the serialized template uses, found by their marks in it, so the two cannot disagree. The form's own `revealOn` and `hideRequiredMarkers` have no form-level input, so the component provides them over the app defaults as `FORMIDABLE_DEFAULTS`, the way the stage's `portalAppDefaults` does.
- **The Schema Holds What `[formField]` Owns**: the compiler rejects a binding to `name`, `readonly`, `disabled`, `required` or a limit beside `[formField]`, so `schema-serializer.ts` states them as rules, in the order `preview-form.schema.ts` does. The attribute table flags the limits as `rule`, so one table still feeds the template, the schema and the chips. The required marker is `REQUIRED` metadata, as on the stage, unless a required check marks the field, per **The Required Marker**.
- **The Validator Writes The Checks**: after the fields' own rules come the sample's, as the validator spells them: Angular's in the `schema()`, or a `createMyFormSuite()` or `myFormZodSchema` above it, run through `validateStandardSchema`. The file imports `vest` or `zod` only under its own validator. A suite is created per form for the reason in **A Vest Suite Belongs To One Form**; the schema function runs once per `form()`, so a factory called inside it is enough.
- **Every Key Starts Empty**: each key is typed from `FIELD_KIND_VALUE_TYPES` and starts at that type's empty value, a number at its field's `min`, because the export carries behaviour rather than the stage's current model.
- **Golden Export**: `src/app/golden-export/` holds the export of the sample form under Angular's rules, Vest and Zod, a directory each, checked in. Its spec requires the serializers to write each byte for byte, renders each (the fields, the required markers, a limit, a condition and a preset) and runs each over the same models as the stage, expecting the same messages on the same paths. The portal's tests compile them ahead of time, which is what catches a binding `[formField]` rejects and a Standard Schema whose input the model does not satisfy. The component imports the Studio's custom field from beside its own directory, so `golden-export/example-counter-field/` re-exports it there. The exports are excluded from Prettier, because they are the serializers' output rather than code written by hand.

**The App Config Is What The Export Leaves Out**: the template states a label position, an adornment alignment and a panel position, and the component `revealOn` and `hideRequiredMarkers`, only where a field or the form states its own, so the app defaults are what give the rest their value. `config-serializer.ts` emits the `app.config.ts` that provides them, beside the template for that reason. It is not read back in: it belongs to the app rather than the form, which is also why replacing the form leaves it alone.

`Structure` is three numbered steps rather than one accordion per form section, because a visitor who wants their own form has to be told that starting over is possible before being shown a list of somebody else's fields.

| Step                      | Offers                                                                       |
| :------------------------ | :--------------------------------------------------------------------------- |
| **1 Start**               | `Blank Form`, `The Sample`, `Paste Template`. The last opens Import & Export |
| **2 Sections And Fields** | The form as it is: reorder, remove, or open a field on `Settings`            |
| **3 Add**                 | A field of any type into any section, or a new section                       |

A blank form is one empty section rather than none: every add needs somewhere to add into, so a form with no sections at all would be a dead end rather than a beginning. Adding leaves step 3 open: building a form is a run of adds, and the new field is already visible on the stage. The form's heading and intro belong to the definition rather than the stage template, so a form built from scratch does not claim to be the sample.

The import handles a static, attribute-only subset and states so. It reads a field's name and group off its `[formField]` path, and takes out the `hidden()` gates the serializer writes. The schema is not read, so a field's state, limits, required marker and condition stay behind; the gate and a preset handler are listed, and the rest the `Import` lede states. Bindings and any other control flow are out of scope, and the parser lists unknown elements and attributes rather than failing silently. Both directions are pure functions with colocated specs, which is the highest-value target named in [`impl/testing.md`](../impl/testing.md).

---

## Documentation And Accessibility

**Inline Help** comes from the manifest and the field model, so a control and its description have one source.

**The Documentation Page** is a route of its own, and it **mirrors** `.documentation/user/*.md` rather than restating it. Each document is imported as text by the builder's `.md` loader and rendered, so the page a visitor reads and the file a maintainer edits are the same bytes and nothing is fetched at runtime. That is also why the page carries no generated variable table: [`user/theme-reference.md`](../user/theme-reference.md) is the variable table. Links between documents are rewritten: a `user/` one becomes a route, a `tech/` or `impl/` one goes to the repository, and a fragment on either is dropped because the portal already routes on the hash. An anchor within the document becomes its `docs/:topic/:anchor` route instead, since a bare fragment would replace the route and land on the Studio.

**Diagrams Are Drawn On The Page**: a Mermaid block renders as its code block, and `drawDiagrams` then replaces it with the drawing. Mermaid is imported only once a document holds a diagram, so it stays out of the bundle every other route loads. It bakes its theme into the drawing, so the page draws each diagram again from its kept source when the portal's appearance flips. Labels are SVG text rather than HTML, which the document's own styles would reach.

**The Manifest Transcribes The Reference**: a variable's description belongs to [`user/theme-reference.md`](../user/theme-reference.md), and the manifest carries a copy so the page can read it without fetching a document. `npm run docs:check` holds the two in step and fails CI when they disagree, which is the other half of the drift gate: the spec pins the **names** against the stylesheet at runtime, this pins the **text** against the reference.

**Accessibility Is Shown, Not Simulated**. An overlay reads the accessibility data the library actually produced (role, accessible name, described-by targets, invalid, required, expanded, active descendant and the focus order) and states it beside each field. A simulated screen reader cannot reproduce a real one, so it would misstate the library's behaviour rather than demonstrate it. The overlay is a quiet switch at the right of the stage bar, beside the one for the caption chips. It annotates the preview rather than builds a theme, so it is placed as an aside, and turning it on states the instruction to verify with a real screen reader.

---

## State

Three stores, holding signals. Everything a template reads is a `signal` or a `computed`, per [`impl/components.md`](../impl/components.md).

| Store               | Holds                                                                                    |
| :------------------ | :--------------------------------------------------------------------------------------- |
| **Form Definition** | One immutable field-specification tree, plus the form-level options and the app defaults |
| **Form Value**      | The model, and the field tree over it                                                    |
| **Theme**           | The user's overrides, the selected preset and scheme, and the resolved result            |

**One Signal Over A Tree**, not one signal per input. The renderer tracks by field identity, and each field component takes its specification as an input, so only the changed field's view is marked.

**The Schema Is Derived** from the definition rather than declared. A static one stops matching the moment a field is added, moved or renamed.

**The Resolved Theme Is One Computed**, feeding both the applied properties and the export, so the two cannot disagree. Application diffs against the set of previously applied keys and removes what is no longer set.

**Serialization Is Pure**: the export text and the generated markup are functions of the stores, with no state of their own.

---

## Build And Tooling

- **Router**: `@angular/router` is a dependency of the portal only; the library does not import it.
- **Mermaid**: a dependency of the portal only, loaded on demand by the `Docs` route. The CommonJS modules it pulls in are named in `allowedCommonJsDependencies`, beside `pikaday`.
- **Budgets**: both budgets in `angular.json` are set above Angular's defaults. The per-component style budget still binds, so each inspector panel is its own component.
- **Lint And Selectors**: the lint scripts and the selector-prefix rules cover the portal; see [`impl/developer-onboarding.md`](../impl/developer-onboarding.md) and [`impl/components.md`](../impl/components.md).
