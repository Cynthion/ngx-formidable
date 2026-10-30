# Studio

The Studio is a page that builds a theme and a form against the real components, and hands back the CSS and the Angular files to paste into a project. It is published as the [live Studio](https://cynthion.github.io/ngx-formidable/) and needs no install, no account and no build.

Nothing done in the Studio leaves the page. The theme and the panel sizes persist in the browser, so a return visit resumes where the last one stopped.

How theming works, and which variables are worth setting, is in [Theming](theming.md). Every variable is listed in [Theme Reference](theme-reference.md).

---

## The Three Routes

The top bar links the three routes, the repository on **GitHub**, the portal's appearance toggle, and **Copy Theme**.

| Route        | Holds                                              |
| :----------- | :------------------------------------------------- |
| **Studio**   | A live form, and the editor panel that changes it  |
| **Specimen** | Every field, one change at a time, under any theme |
| **Docs**     | The user documentation                             |

The appearance toggle cycles the portal through **Light**, **Dark** and **Follow the system**. It changes the portal's own chrome, not the theme.

---

## The Studio Layout

| Region           | Where            | Holds                                                                         |
| :--------------- | :--------------- | :---------------------------------------------------------------------------- |
| **Preview**      | The wide column  | The form, on an explicit page surface, with the **Model** drawer beneath it   |
| **Editor Panel** | Beside the stage | The **Theme**, **Form** and **Export & Import** tabs, over the same live form |

The form is never hidden, so every edit shows on it at once. Below a narrow breakpoint the editor panel becomes a bottom sheet instead of a column, so the fields stay visible while they are edited.

The panel's width and the drawer's height are dragged from the divider on their own edge and reset by double-clicking it. The chevron in the panel's header collapses it to a rail and expands it again.

### The Preview Switches

Two switches above the preview annotate it rather than change it. Neither reaches the exported template.

| Switch            | Default | Shows                                                                                         |
| :---------------- | :-----: | :-------------------------------------------------------------------------------------------- |
| **Field Types**   |   On    | A chip under each field naming its component. Clicking one opens that field for editing       |
| **Accessibility** |   Off   | The role, accessible name, described-by targets and focus order the library actually produced |

A chip's tooltip lists the field's current configuration. The accessibility readout is read off the rendered page and is not a simulation.

> **Note:** The accessibility readout does not replace a test with a real screen reader.

### The Model Drawer

The **Model** bar under the preview always states how many fields are filled and whether the form is valid, and marks the form **Dirty** or **Submitting** while it is. Opened, it shows three tabs:

| Tab            | Shows                                                            |
| :------------- | :--------------------------------------------------------------- |
| **By Section** | The model per section, each value with its messages              |
| **Errors**     | Every error the form reports, per field, group or **Whole Form** |
| **Raw**        | The model's raw serialization                                    |

A hidden conditional field is marked as kept in the model and left out of validation.

---

## Building A Theme

1. Open **Theme** > **Design**.
2. Pick a thumbnail under **Presets**, or press **Randomize**.
3. Set the brand colour under **Brand Colour**.
4. Set the colour seeds under **Repaint**.
5. Set the height, border thickness, radius and horizontal padding under **Reshape**.
6. Set the page surface under **The Page Behind The Form**.
7. Set the family, size, weight and line height under **Fonts**.

The preview wears the theme, and **Copy Theme** in the top bar shows how many variables it changes. The steps follow the order of [Theming](theming.md), and each can be the last one.

- **Presets**: each thumbnail is a real field rendered under that theme. **The Two Axes On Their Own** picks a **Geometry** and a **Colour** independently, and a preset is one pair of the two. **Reset To Default Theme** returns to the library's defaults.
- **The Page Behind The Form**: the library styles fields and never the surface they sit on, so this block is exported separately and commented as such.
- **Contrast Badges**: each seed with a contrast obligation shows its live ratio against the fill the browser paints, beside the required one.
- **Notices**: a notice appears where one value silently costs others. **A zero border erases five other lengths** offers **Restore The Five**, **A dark fill needs four values the seeds cannot derive** offers **Set The Four**, and **Below the 44px floor** warns that inside labels no longer fit. [Theming](theming.md) explains all three.

### The Variables Tab

**Theme** > **Variables** lists every themeable variable, grouped as [Theme Reference](theme-reference.md) groups them, each with its one-line description and its current value. The search field filters by name or description, and **Only What I Changed** shows exactly what the export carries.

A variable that derives from another says so and links to its base. Editing a derived variable pins it, and the control states that consequence.

The trailing group, **Variables The Library Sets Itself**, lists the variables the library sets on the element where each applies. They appear in the browser's inspector, but overriding one does nothing useful.

### The Change Count

The count on **Copy Theme** is the number of variables the theme sets over and above the library's defaults, not the size of the token surface. Equal values in different units, such as `56px` and `3.5rem`, count as unchanged. Eight to twelve is the number to expect.

---

## Shaping The Form

1. Open **Form** > **Structure**.
2. Under **Start**, choose **Blank Form**, **The Sample** or **Paste Template**.
3. Under **Sections And Fields**, reorder, remove or select the fields.
4. Under **Add**, add a field of any type to any section, or a new section.
5. Open **Form** > **Settings** to configure what was added.

The preview renders the form as structured, and the **Model** drawer lists its keys.

- **Starting Over**: **Blank Form** and **The Sample** replace the fields on the preview and leave the theme untouched. A blank form is one empty section, because every add needs somewhere to add into. **Paste Template** opens **Export & Import** > **Import** > **Template**.
- **The Field List**: **Move Up**, **Move Down** and **Remove This Field** sit beside each field, and selecting a field's name opens it on **Settings**.

### The Settings Scopes

**Form** > **Settings** is one editor with an **Applies to** switch above it, which selects how far a control reaches.

| Scope            | Changes                                                                           |
| :--------------- | :-------------------------------------------------------------------------------- |
| **App Defaults** | What `provideNgxFormidable({ defaults })` sets, for every form and field          |
| **The Form**     | The switches every field obeys, the locale, sample adornments, and the validation |
| **This Field**   | Identity, state, decoration, behaviour and options for the selected field         |

Selecting a field in the preview selects it here, and a field chip opens this tab at **This Field**.

- **App Defaults Are What The Preview Is Given**: the preview runs the library's own resolution, as [Getting Started](getting-started.md) describes it. Each control offers **Library Default** to set nothing and states how many fields, or whether the form, state their own value, with **Clear** to make them inherit again. The matching controls at **The Form** and **This Field** offer **App Default**, naming the value in force. A field reads its defaults when it is created, so changing one rebuilds the preview.
- **Icons**: **Toggles And Month Arrows** swaps the library's chevrons for stand-in components, as the `icons` of `provideNgxFormidable()` would.
- **Adornment Examples Are Samples**: an adornment is markup projected per field, so no default can supply one. **The Form** fills every field's slot with a sample, states how many fields override it, and offers **Apply To All**.
- **A Control Appears Only Where It Works**: only the horizontal layout honours a label position other than `outside`, and the vertical layout renders no prefix or suffix, so the Studio offers neither where it would do nothing. [Decoration](decoration.md) states the rule.
- **Locale**: one control under **Across The Form**, because it moves the date field's translations, its first day and its token format together.
- **Filtering**: **This Field** > **Filtering** > **Strategy** is the one control that is not an input on the field. The Studio filters an autocomplete's list itself, by **Fuzzy (fuse.js)**, **Contains** or **Starts With**, and gives each option a `match` that keeps it. [Fields](fields.md) states the field's own rule.

### The Sample Form

The sample form is a pizza order that starts filled in, so the filled, selected and floating-label states are on screen from the first load. Beyond a field of every type, it carries four things a single field cannot show on its own.

| Feature                | Where                                                                                                                           |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Groups**             | `When` and `Payment` each nest their fields under a key of their own in the model. `When` adds a rule that reports on the group |
| **Conditional Fields** | The handover toggle decides whether the address or the branch is rendered, and the payment method whether the card number is    |
| **A Template Picker**  | Choosing a pizza fills the sauce and the toppings, and leaves every other field alone                                           |
| **A Masked Field**     | An unmasked and a masked input side by side                                                                                     |

- **Every Field Type Is On Screen At Load**: some appear more than once for that reason.
- **The Pizza Is A Starting Point**: its preset applies when the picker changes and never again, so later edits stand. **Custom** carries no preset and changes nothing.

In the **Model** drawer the two groups nest, and a conditional field that is not rendered keeps its key and is not validated. [Forms](forms.md) covers conditional fields under each forms API.

---

## Exporting And Importing

1. Open **Export & Import** > **Export**.
2. Select a file: **Theme**, **Template**, **Component**, **Schema** or **App Config**.
3. Set the export options, for **Theme** only.
4. Press the copy icon in the bar naming the file.

The file is on the clipboard, under the name it takes in the project: `styles.css` or `styles.scss` for the theme, `example-form.html`, `example-form.ts`, `example.form.ts` and `app.config.ts` for the others.

**Copy Theme** in the top bar copies the theme directly. The form has no copy there, because its template does not compile without its component and its schema.

| File           | Export                                                      | Import                                  |
| :------------- | :---------------------------------------------------------- | :-------------------------------------- |
| **Theme**      | The `:root` block for the app's stylesheet                  | A block exported earlier                |
| **Template**   | The Angular template this configuration produces, read-only | A whole template, its sections included |
| **Component**  | The component the template binds, read-only                 | Not read back                           |
| **Schema**     | The model's type, its initial value and the form's rules    | Beside the template, each field's rules |
| **App Config** | The app defaults the template leaves out, read-only         | Not read back                           |

Every export is derived from what is on the preview, so none can disagree with it. The files are generated from the configuration, which is why they are read-only and why the structure is edited through the controls.

### The Theme Export

The options are **CSS** or **SCSS**, **Comments** for a description per variable, **Page Surface** for the page block, and **Explicit Defaults**. Declarations that only restate a library default are left out.

A theme block states a delta: what the theme says the library's defaults do not. It reproduces the theme wherever those defaults apply, as they do in an app's stylesheet. Two checkboxes close the gap when the block lands on another theme:

| Checkbox              |  Tab   | Effect                                                                                         |
| :-------------------- | :----: | :--------------------------------------------------------------------------------------------- |
| **Explicit Defaults** | Export | States the value in force for every variable a Studio theme can set, not only the changed ones |
| **Onto The Defaults** | Import | Puts the theme back to the library's defaults first, then applies the block. On by default     |

The page surface belongs to the page, so **Onto The Defaults** returns it to the Studio's own surface unless the block states it, which is what **Page Surface** is for.

### The Form Export

The three form files are one Signal Forms form, in the layout [Validation](validation.md) describes:

| File                | Tab           | Holds                                                                                              |
| :------------------ | :------------ | :------------------------------------------------------------------------------------------------- |
| `example-form.html` | **Template**  | `<form [formRoot]="form">`, and every field decorated and bound by `[formField]`                   |
| `example-form.ts`   | **Component** | The model `signal`, the `form()` over it, the components the template uses, the preset handlers    |
| `example.form.ts`   | **Schema**    | The model's type, an initial model defining every key, the `schema()`, and a suite or a Zod schema |

- **The Schema Holds A Field's State**: `[formField]` hands a field its readonly and disabled state, its required marker and its limits, and rejects a binding to any of them beside it. So the schema states them as rules, such as `readonly()`, `min()` and `maxLength()`, and a required marker with no rule behind it as `REQUIRED` metadata.
- **The Export Carries Behaviour, Not State**: a conditional field's condition is a `hidden()` rule in the schema, and the template wraps the field in `@if (!form.address().hidden())`, so a field the preview is currently hiding is still in the template. A grouped field is bound under its group, `form.payment.method`. Every key of the initial model starts empty.
- **Some Behaviour Belongs To The Component**: a template picker's presets are a map, which a template cannot hold. The template binds the handler to the field's pick, `(valueChange)="applyPizzaPreset($event)"`, and the **Component** file declares the handler and the map. Both names derive from the field, so the pair always fits together.
- **The App Config Holds What The Template Leaves Out**: a field or form that states nothing is exported without the attribute, so the app defaults give it its value. What the form states for itself, such as when messages appear, the component provides over them. **Copy App Config** under **App Defaults** > **Take It Away** copies the same file.

### The Validator

**Form** > **Settings** > **The Form** > **Validator** picks who writes the checks in `example.form.ts`. The sample's rules are the same under every validator: the same messages on the same fields, groups and whole form, on the preview and in the export alike.

| Validator                    | Writes The Checks As                                                           | Marks A Field Required        |
| :--------------------------- | :----------------------------------------------------------------------------- | :---------------------------- |
| **Angular's built-in rules** | `required()`, `pattern()`, `maxLength()` and `validate()` in the `schema()`    | `required()` itself           |
| **Vest suite**               | `createExampleSuite()`, a suite per form, run through `validateStandardSchema` | `REQUIRED` metadata beside it |
| **Zod schema**               | `exampleZodSchema`, run through `validateStandardSchema`                       | `REQUIRED` metadata beside it |
| **None**                     | Nothing: only the fields' own limits apply                                     | The marker alone              |

The file imports `vest` or `zod` only under its own validator. A rule is left out unless every field it reads is on the form and writes the same type as in the sample, so a form built from the sample exports only the rules it can run.

### Importing

1. Open **Export & Import** > **Import**.
2. Select **Theme** or **Template**.
3. Paste the exported text: for a template, the template under **Template** and its schema under **Schema**.
4. Press **Apply** for a theme, or **Replace The Form** for a template.

The preview takes the theme or the form, and a report lists what was read and what was not.

- **A Theme Import**: applies the variables the library declares and lists the rest under **Not applied:**.
- **A Template Import**: reads each field's name and group from its `[formField]` path, and its state, limits, required marker and condition from the pasted schema. Without a schema, the fields come back without them. The form's settings and its checks stay as the Studio has them.
- **What It Ignores, It Lists**: bindings to expressions, control flow, an `@if` whose condition no schema states, and a handler whose behaviour lives in the component are listed under **Ignored:** rather than dropped silently. Re-importing the sample therefore reports that its presets did not come with it.

---

## The Specimen

The **Specimen** route teaches the library one idea at a time: seven numbered chapters in three parts, each changing one thing and holding everything else still. It changes nothing and exports nothing.

| Part                         | Chapters                                                     |
| :--------------------------- | :----------------------------------------------------------- |
| **How A Field Is Painted**   | 1 What Paints What · 2 Defaults To Midnight · 3 Whole Themes |
| **How A Field Is Decorated** | 4 Label Positions · 5 Adornments                             |
| **How A Field Behaves**      | 6 States · 7 Panels                                          |

Each chapter states what to notice under **Notice**, one thing to try under **Try**, and the snippet that does it under **In Your Template** or **In Your Stylesheet**.

- **What Paints What Comes First**: it names the variable behind each part of a field, with the value the current theme gives it, and the rest of the Specimen builds on that map.
- **The Page Theme Repaints Everything**: **Page Theme** offers **Your Studio Theme**, the one built on the Studio route, and each preset; a ladder step starts again from the library's defaults. None of them changes the Studio's theme.
- **A Matrix Opens On A Few Fields**: chapters 4 to 6 compare fields in a grid and open on a few that cover the three layouts; **Show all** adds the rest.
- **Every Name Is A Link**: a field's name opens its entry in [Components](components.md), and a variable's name opens its own row in [Theme Reference](theme-reference.md).

---

## What The Studio Does Not Decide

- **The Page Behind The Form**: the library styles fields only, so the Studio exports that block separately, for the app to place.
- **The Validator For A Real Form**: the Studio runs and exports the sample's rules under Angular's own, Vest and Zod. [Validation](validation.md) covers connecting one to a real form.
- **The Layout**: the preview lays its fields on a grid of its own. The exported template carries the fields and their decorators, not that grid.

---

## Related

- [Theming](theming.md): the default theme, how theming works, and how to find a theme
- [Theme Reference](theme-reference.md): every overridable `--formidable-*` custom property
- [Getting Started](getting-started.md): install, wiring, the stylesheet, a first form
- [Validation](validation.md): Angular's rules, Vest, Zod or none; messages and their reveal
