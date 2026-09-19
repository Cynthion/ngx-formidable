# Portal

Design of the portal: the interactive page a developer uses to build a theme for their own brand, which
replaces the demo's example form as the GitHub Pages deploy. The phase table and its ordering live in
`impl/implementation.md`; this document is the design those phases are built and reviewed against.

For the theming model itself see `user/theming.md` and `user/theme-reference.md`. For coding conventions and
the Definition of Done see `impl/conventions.md`.

## Scope

**The Bar**: a developer lands knowing nothing about the library and leaves with a theme in their clipboard,
having read no instructions. Every decision in this document is judged against that sentence.

| Concern        | Portal                                                           |
| :------------- | :--------------------------------------------------------------- |
| **Location**   | `src/app/portal/`, inside the existing demo application          |
| **Replaces**   | `src/app/example-form/`, at the cutover phase                    |
| **Deploy**     | The existing Pages workflow, with no change to the workflow file |
| **Supersedes** | `user/theme-options.md`, retired at cutover                      |

A separate Angular project is not used. The cutover phase reduces to deleting one directory and changing one
component reference, rather than a whole-tree move and import rewrite in the final session.

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
│ ◇ ngx-formidable      [ Studio │ Docs ]  ⌘GitHub ◐ [Copy 16│Export ↗]    │
│   what the Studio does, in one line                                      │
├───────────────────────────────────────────┬──────────────────────────────┤
│ PREVIEW  live  Captions  Accessibility    │ INSPECTOR                 ›  │
│ ┌─ your page ───────────────────────────┐ │ Theme │ Form │ Import&Export │
│ │  Section heading                      │ │ ┌ Design │ Variables ┐       │
│ │  ┌──────────────┐ ┌──────────────┐    │ │ │ Pick a look, then work…   │
│ │  │ field        │ │ field        │    │ │ │ ▾ Presets Start here   12 │
│ │  └──────────────┘ └──────────────┘    │ │ │   [ Randomize ] + why     │
│ │   (caption ↗)      (caption ↗)        │ │ │   [thumbnails…]           │
│ │  ┌──────────────┐ ┌──────────────┐    │ │ │ ▸ 1 Brand Colour    1 var │
│ │  │ field        │ │ field        │    │ │ │ ▸ 2 Repaint       8 seeds │
│ │  └──────────────┘ └──────────────┘    │ │ │ ▸ 3 Reshape     4 lengths │
│ └───────────────────────────────────────┘ │ │ ▸ 4 The Page Behind The…  │
├═══════════════════════ drag ══════════════┤◂drag 5 Fonts                 │
│ ▾ MODEL   22 Of 24 Filled · Form Invalid  │                              │
│   By Section │ Errors │ Raw               │                              │
└───────────────────────────────────────────┴──────────────────────────────┘
```

**Stage Surface**: the form sits on an explicit page surface with a visible edge. That surface is the object a
dark theme needs, because the library styles fields and never the page behind them.

**Model Drawer**: belongs to the stage column, not the page width, so the inspector keeps its full height. Its
collapsed bar always states the fill count and validity.

**Narrow Viewports**: below the two-column breakpoint the inspector becomes a bottom sheet covering at most
three fifths of the height, so fields stay visible and live while they are edited. When a library `sheet`
panel opens, the inspector sheet collapses, because a `sheet` is anchored to the screen.

**Stacking**: the inspector takes a `z-index` above `--formidable-sheet-z-index`, so a panel scrolled beneath
it cannot punch through. `tech/layering.md` holds the layer model.

**Change Counter**: the copy button states the number of variables the user has changed, never the size of the
token surface. The library's own guidance is that eight to twelve variables are enough, and a number that
rises as the user works states that without a sentence of explanation. "Changed" is measured against the
library's own default rather than against an empty set, and through the browser rather than as text — the
schemes state their values in full, and several restate a token default in a different unit. The count is
itself a control: it opens the block it counts, so the theme is never uninspectable.

**Resizable Panels**: the inspector's width and the model drawer's height are dragged from the divider on
their own edge, reset by double-clicking it, and persisted. A divider reports the pointer's position and the
panel does the arithmetic, because the two measure from opposite edges. The drawer's height is the whole
drawer's, bar included, so the divider tracks the pointer rather than lagging it by the bar.

---

## Navigation

Routes are introduced with hash location.

| Route                   | Tab       | Holds                                              |
| :---------------------- | :-------- | :------------------------------------------------- |
| `/`                     | `Studio`  | The stage and the inspector                        |
| `/docs`, `/docs/:topic` | `Docs`    | The documentation page, lazily loaded              |
| `/preview`              | `Preview` | The form alone, without the stage or the inspector |

The top bar is on every one of them and its three tabs are the only navigation there is, so no route carries
a back control of its own.

**Hash Location**: GitHub Pages serves no SPA fallback, so a path-routed deep link requires an `index.html`
copy published as `404.html` and is then served with an HTTP 404 status. Hash location needs neither, and the
deploy workflow is not touched by the portal at any phase.

**Tabs Are Not Routes**: the inspector's tabs are simultaneous views of one live object, and routing them
would hide either the preview or the editor. There are three, in the order the work happens.

| Area                | Halves                 | Answers                                                               |
| :------------------ | :--------------------- | :-------------------------------------------------------------------- |
| **Theme**           | `Design`, `Variables`  | How the fields look                                                   |
| **Form**            | `Structure`, `Fields`  | Which fields exist, and what each one is                              |
| **Import & Export** | One scroll, two blocks | What you take away and paste back: the `:root` block and the template |

`Form` is `Structure` first: which fields exist has to be settled before what one of them is is worth
saying. `Import & Export` is one scroll rather than a third level of tabs: its two blocks are read once at
the end, not worked in, so a pair of accordions keeps them apart at no navigational cost. Each carries its
own import, because the way back in belongs beside the way out — which is what the tab is named for. Which
of the two is open is held in the inspector store, not the component: the top bar opens the theme half and
`Structure`'s third way to start opens the markup half. Inside every area the sections are accordions with one
open at a time, so the run of collapsed headers is the panel's table of contents rather than a scroll the
user has to survey.

**Anchor Targets**: per-token deep links use a route parameter and scroll programmatically. A fragment on top
of a hash route is ambiguous.

---

## Theming

### Where The Theme Is Applied

**The user's theme is written to `:root`**, as a consumer would write it, using
`document.documentElement.style`.

A custom property's `var()` is substituted where the property is **declared**. Descendants inherit the
substituted value. Most of the library's custom properties are derived from others and are declared once, in
the `:root` block of `projects/ngx-formidable/src/lib/styles/_formidable-vars.scss`:

```scss
--formidable-field-inner-height: calc(var(--formidable-field-height, …) - 2 * var(--formidable-field-border-thickness, …));
```

Setting `--formidable-field-height` on a wrapper element therefore leaves `--formidable-field-inner-height`
frozen at the value computed for `:root`. Scoping the user's theme to the preview subtree does not fail
visibly; it half-applies. `user/theming.md` states the consumer-facing half of this rule.

Applying to `:root` has a second consequence worth stating: what the user copies is the same block that is
live, so the export cannot drift from what is on screen.

### Chrome Insulation

The portal's own controls are built from the library's components, so they read `--formidable-*` and a `:root`
theme reaches them. The cascade cannot insulate them, for the reason above.

**The chrome re-emits the full default variable block under its own selector**, where derivation recomputes
correctly against the chrome's own base values. This requires one library change: the `:root` block in
`_formidable-vars.scss` becomes a mixin, with `:root` including it. The emitted CSS is unchanged, and the
mixin is not forwarded, so the closed SCSS surface described in `impl/conventions.md` still holds. The demo
already reaches library styles by path through the `stylePreprocessorOptions.includePaths` entry in
`angular.json`.

The chrome's own theme is compact and is not user-editable. Font family is an ordinary inherited property
rather than a custom property, so the chrome pins its own.

### The Theme Editor

The ladder in `user/theming.md` is the layout: one scrollable column of numbered steps, in that order, which
a user may stop at any point in.

| Step    | Control                                                       | Variables |
| :------ | :------------------------------------------------------------ | --------: |
| Presets | Named looks, each a live miniature of a real field            |         — |
| 1       | Brand colour, with an option to accent resting labels         |         1 |
| 2       | Repaint: the colour seeds                                     |         8 |
| 3       | Reshape: height, border thickness, radius, horizontal padding |         4 |
| 4       | The page behind the form                                      |         — |
| 5       | Fonts                                                         |         — |
| All     | Every themeable variable, grouped, behind a disclosure        |       All |

**Presets First**: the existing geometry and colour schemes ship as named pairs with live thumbnails. They are
what a cold visitor clicks, and they are the fastest evidence that the library is not a one-colour library.
The two independent axes remain available behind a disclosure.

**Grouping**: the groups are the sections of `user/theme-reference.md`, which already carries a one-line
description per variable for inline help.

**Derived Variables Are Marked**: a derived variable renders as following its base, with a link to it. Editing
one pins it, which is what `user/theming.md` advises against, so the interface states the consequence rather
than hiding the control.

**Show Only What I Changed**: one toggle collapses the full list to the user's own theme. That view is the
export preview.

**Traps Handled By The Interface** rather than by documentation:

- **Units**: length editors always emit a unit, so a unitless zero cannot be produced.
- **Gradients**: colour wells accept colours only, because the fill feeds `color-mix()`.
- **Borderless Geometry**: setting the field border thickness to zero raises a notice naming the five lengths
  it also erases, with a control that restores them. `user/theme-options.md` lists the five.
- **Dark Fills**: a dark fill raises a notice offering to set the four values the seeds cannot derive.

**Contrast Badges**: the seeds that carry a documented contrast obligation show a live ratio against the
current fill. This is part of the theme editor rather than the accessibility view, because it prevents an
inaccessible theme from being exported at all.

**Export And Import**: the copy button copies the `:root` block with no intermediate dialog. Options cover
format, whether the page surface is included, and whether the per-variable comments are emitted. The page
surface is emitted as a separately commented block, because the distinction between what the library styles
and what the consumer styles is the most confusable thing on the page. Import parses a pasted block, applies
what it recognises, and lists what it did not. Export and import round-trip without loss.

### Token Manifest

An editor cannot enumerate the themeable surface from the `:root` block alone, and cannot infer a control type
from a value. The manifest is the curation that makes both possible.

| Class                                         | Editable | Notes                                                               |
| :-------------------------------------------- | :------: | :------------------------------------------------------------------ |
| Declared in the `:root` block                 |   Yes    | The bulk of the surface                                             |
| Overridable, read at use site, never declared |   Yes    | The four logical corner radii, the panel and toggle-track thickness |
| Written by the library itself                 |    No    | Listed in `user/theme-reference.md`                                 |

The second class is deliberately absent from `:root` so that it works on a single field as well as globally.
It is what an asymmetric field shape needs, so a generator that reads only `:root` misses exactly the
interesting variables. The third class is overwritten by the library on the next render, so exposing it would
produce a control that appears to do nothing.

**Structure**: a checked-in TypeScript manifest carrying the name, group, control type and class of each
variable. Defaults are read at runtime with `getComputedStyle` and never stored, so a default cannot drift
from the token that produces it.

**Control Types Are Curated, Not Inferred**: a quoted string for the required marker, a timing function, a
viewport unit, shorthand pairs, unitless line heights used as multiplicands, box-shadow composites, and a
colour whose name carries no colour prefix all defeat inference from the value.

**Drift Gate**: a spec walks `document.styleSheets`, collects the declared `--formidable-*` properties and
asserts that the manifest and the stylesheet agree in both directions, and that no library-written variable is
exposed. It runs in the demo project, which already loads the library stylesheet and already runs in CI.

### Colour Schemes

Two independent light and dark concepts exist, and they carry distinct names because conflating them makes the
page incomprehensible.

| Name                     | Owner    | Exported |
| :----------------------- | :------- | :------: |
| **Page Behind The Form** | Consumer |   Yes    |
| **Portal Appearance**    | Portal   |    No    |

The library styles fields and never the surface behind them, so the page surface is the portal's own variable
and is exported as a separately commented block. The portal's own appearance follows the operating system
preference by default.

A dark fill needs four values beyond the seeds, because the readonly and disabled fills are mixed toward
`transparent` and the option fills default to black at low alpha. `user/theme-options.md` records them.

### Fonts

The library exposes font size, weight and line height. It exposes no font family: every field takes the host
page's family through `font: inherit`. The portal therefore writes `font-family` to `:root` beside the tokens
and exports it as an ordinary declaration together with its `@font-face`.

Adding a family token to the library is a public API change with its own Definition-of-Done obligations, and
is filed in `impl/backlog.md` rather than absorbed into this phase.

**Fonts Are Bundled**, self-hosted, in a compressed web format, as a small curated set covering the common
archetypes plus a free-text entry. The deploy is static and must work offline and behind a proxy, and a
fetched family adds a third-party origin and a flash of unstyled text that undoes the instant repaint the
presets exist to demonstrate. Families load on demand, so they are assets rather than initial bundle.

---

## Preview Form

**The Context Is A Time Traveller's Visa Application.** It is chosen for the date field, which is the
library's most configurable component and the one a contrived pairing shows on: two dates in two formats and
two locales is the premise rather than a demo artifact. It also gives every option field a real reason for a
`disabled` and a `readonly` entry, and it carries a submit destination — an issued visa — so the form is
visibly a form.

**Every Field Is Previewed**, inside one example form with a consistent context, laid out on a grid rather
than at uniform full width. The form is fully functional and fillable, and starts pre-filled: an empty form
shows none of the filled, selected or floating-label states that a theme is judged by.

| Section           | Field                   | Type                             |
| :---------------- | :---------------------- | :------------------------------- |
| **The Traveller** | Name                    | `input`                          |
|                   | Temporal identifier     | `input`, masked                  |
|                   | Origin era              | `select`                         |
| **The Journey**   | Destination era         | `dropdown`                       |
|                   | Arrival date            | `date`                           |
|                   | Return date             | `date`, second locale and format |
|                   | Arrival time            | `time`                           |
|                   | Companions              | the custom counter field         |
| **The Rules**     | Purpose of visit        | `radio-group`                    |
|                   | Declarations            | `checkbox-group`                 |
|                   | Paradox tolerance       | `slider`                         |
|                   | Anchor point            | `autocomplete`                   |
| **Small Print**   | Have you met yourself   | `toggle`                         |
|                   | Notes to your past self | `textarea`                       |

**Disabled And Readonly Carry The Context**: an era closed for maintenance is `disabled`, an era open to
observers only is `readonly`. The state has a reason a visitor understands without a caption, which is what
makes the sample honest rather than decorative.

**Several Fields Per Type**: the table above is the core set, not the final field list. Each type appears at
least twice with deliberately different configuration, and the pair sits adjacent in the same row so the
difference is visible without scrolling. A caption strip beneath each pair names exactly what differs. The two
dates are the pair the context exists for.

**Caption Chips Are Controls**: each chip opens the field it names on the `Fields` tab, and carries a `↗` to
say so. The preview explains itself, and every explanation is also the way to change it — which is what
replaces the instructions the page is required not to need. A chip is the portal's annotation rather than
part of the form, so a `Captions` switch on the stage bar turns the run of them off, and `/preview` never
renders them at all. Each sits at the bottom of its grid row, so a pair stays aligned when one field carries
a hint and the other does not.

**Option Fields** always carry a sample option that is `disabled` and one that is `readonly`, so their theming
is demonstrable.

**Starting Theme**: a preset that is not the shipped default, so that the page is evidence of configurability
from the first frame.

---

## Inspector

### Model

Expandable and collapsible panels over the form's current model, mirroring the preview's sections, plus
errors, validity, dirty state and the raw serialization. The collapsed bar states fill count and validity and
is never hidden, because it is the cheapest evidence that the form is real.

The library's Ubiquitous Language names the object a form edits the **model**. `formValue` remains the
directive's input name, which is the binding rather than the concept.

### Fields And Decoration

Two scopes, so that the repeated inputs are set once and the specific ones are set per field.

| Scope                          | Holds                                                                                      |
| :----------------------------- | :----------------------------------------------------------------------------------------- |
| **Every Field: Decoration**    | Label position, required markers, hints, adornments, alignment, readonly, disabled, locale |
| **Every Field: Validation**    | Which validator runs, when it runs, and when its messages appear                           |
| **This Field Only: `<label>`** | Identity, state, decoration, behaviour and options for the selected field                  |

The scopes are spelled out on screen rather than named "form defaults" and "this field": a user arriving cold
cannot infer how far a control reaches from a heading that does not say.

**Selection Follows Focus** while the tab is active, so that clicking a field uses it rather than selecting
it. A hover-revealed chip and a field list cover the cases focus cannot reach.

**Groups Are Identical For Every Field**, so the layout is learned once: identity, state, decoration,
behaviour, options.

**Capabilities Are Declared, Not Assumed**. `decoratorLayout` is fixed per field component and is not an
input. Only the horizontal layout honours a label position other than `outside`, and the vertical layout
renders no prefix or suffix at all. A capability table ships with the field model, before any editor exists,
so that the page whose claim is that everything is configurable never offers a control that silently does
nothing.

**Every Option Changeable** means: every input in `user/components.md` has a control, states its default and
carries its one-line description. Function-typed inputs are offered as named presets rather than a code
editor, because their purpose is to demonstrate what the input is for. Object-typed inputs are offered as
preset sets.

**Adornments** are content projection rather than inputs, so they live in the decoration group at both scopes,
each slot offering none, an icon, text or a button.

**Locale** is one control that moves the date field's translations, first day and token format together, and
switches the paired field's format. Splitting it into separate controls would lose the demonstration.

### Structure And Generated Markup

An Angular production build contains no template compiler, so user-authored markup cannot become live
components. The configuration is therefore the source of truth and the markup is derived from it.

| Direction     | Mechanism                                                                                   |
| :------------ | :------------------------------------------------------------------------------------------ |
| **Out**       | The configuration serialized to an Angular template, read-only, with a copy control         |
| **In**        | A pasted template parsed with `DOMParser` into the configuration, reporting what it ignored |
| **Structure** | Fields added, removed and reordered through controls rather than by typing                  |

`Structure` is three numbered steps rather than one accordion per form section, because a visitor who wants
their own form has to be told that starting over is possible before being shown a list of somebody else's
fields.

| Step                      | Offers                                                                      |
| :------------------------ | :-------------------------------------------------------------------------- |
| **1 Start**               | `Blank Form`, `The Sample`, `Paste Markup` — the last opens Import & Export |
| **2 Sections And Fields** | The form as it is: reorder, remove, or open a field on `Fields`             |
| **3 Add**                 | A field of any type into any section, or a new section                      |

A blank form is one empty section rather than none: every add needs somewhere to add into, so a form with no
sections at all would be a dead end rather than a beginning. Adding leaves step 3 open — building a form is a
run of adds, and the new field is already visible on the stage. The form's heading and intro belong to the
definition rather than the stage template, so a form built from scratch does not claim to be the sample.

The import handles a static, attribute-only subset and states so. Bindings and control flow are out of scope,
and the parser lists unknown elements and attributes rather than failing silently. Both directions are pure
functions with colocated specs, which is the highest-value target named in `impl/testing.md`.

---

## Documentation And Accessibility

**Inline Help** comes from the manifest and the field model, so a control and its description have one source.

**The Documentation Page** is a route of its own, and it **mirrors** `.documentation/user/*.md` rather than
restating it. Each document is imported as text by the builder's `.md` loader and rendered, so the page a
visitor reads and the file a maintainer edits are the same bytes and nothing is fetched at runtime. That is
also why the page carries no generated variable table: `user/theme-reference.md` is the variable table.
Links between documents are rewritten — a `user/` one becomes a route, a `tech/` or `impl/` one goes to the
repository, and a fragment is dropped because the portal already routes on the hash.

**The Manifest Transcribes The Reference**: a variable's description belongs to `user/theme-reference.md`,
and the manifest carries a copy so the page can read it without fetching a document. `npm run docs:check`
holds the two in step and fails CI when they disagree, which is the other half of the drift gate — the spec
pins the **names** against the stylesheet at runtime, this pins the **text** against the reference.

**Accessibility Is Shown, Not Simulated**. An overlay reads the accessibility data the library actually
produced — role, accessible name, described-by targets, invalid, required, expanded, active descendant and the
focus order — and states it beside each field. A simulated screen reader cannot reproduce a real one, so it
would misstate the library's behaviour rather than demonstrate it. The overlay is a quiet switch at the right of the stage bar, beside
the one for the caption chips — it annotates the preview rather than builds a theme, so it is placed as an
aside — and turning it on states the instruction to verify with a real screen reader.

---

## State

Three stores, holding signals. Everything a template reads is a `signal` or a `computed`, per
`impl/conventions.md`.

| Store               | Holds                                                                         |
| :------------------ | :---------------------------------------------------------------------------- |
| **Form Definition** | One immutable field-specification tree, plus the form-level options           |
| **Form Value**      | The model, and the shape derived from the definition                          |
| **Theme**           | The user's overrides, the selected preset and scheme, and the resolved result |

**One Signal Over A Tree**, not one signal per input. The renderer tracks by field identity, and each field
component takes its specification as an input, so only the changed field's view is marked.

**The Shape Is Derived** from the definition rather than declared. A static shape starts reporting mismatches
the moment a field is added or renamed.

**The Resolved Theme Is One Computed**, feeding both the applied properties and the export, so the two cannot
disagree. Application diffs against the set of previously applied keys and removes what is no longer set.

**Serialization Is Pure**: the export text and the generated markup are functions of the stores, with no state
of their own.

---

## Build And Tooling

| Concern            | Consequence                                                                                                                                                   |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Router**         | A new dependency, added with the shell                                                                                                                        |
| **Budgets**        | The initial budget is raised. The per-component style budget is kept, so each inspector panel is its own component                                            |
| **Lint**           | The lint and style-lint scripts are extended to the application sources                                                                                       |
| **Selector Rules** | The component and directive selector-prefix rules are scoped to a path that does not exist and have never run. The glob is corrected and a portal block added |
| **Example Form**   | Frozen until cutover. Its change-detection spec selects by DOM position and runs in CI                                                                        |
| **Cutover**        | The example form's model is relocated, because the validation integration spec imports it                                                                     |

**Definition Of Done Sites** naming the example form as the showcase and the only visual-test surface:
`impl/conventions.md`, `impl/testing.md`, `tech/architecture.md`, the root `CONTRIBUTING.md` and the `verify`
skill. All are updated at cutover.

---

## Open Questions

| Question          | Recommendation                                                                     |
| :---------------- | :--------------------------------------------------------------------------------- |
| **Font Set**      | One grotesque, one humanist, one serif, one monospace, one display, plus free text |
| **Accessibility** | The overlay above, with no simulated screen reader                                 |
