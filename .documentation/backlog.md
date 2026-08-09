# Backlog

Example:

- Update usage documentation according to EnerQi
- group example, using ngModelGroup (see EnerQi appointment-page.form)
- add badges to readme
- exact feature list (per field and component) in readme
- tag release commit
- add CONTRIBUTING.md
- logo for ngx-formidable
- how to create a custom field, see e.g. EnerQi `ConstitutionCounterFieldComponent`

Improvements:

- Add Storybook stories for layout options
- the whole internal SCSS implementation is public API by accident. `_ngx-formidable.scss` does `@forward './variables'`, and `variables.scss` forwards all four mixin partials, so **109 mixins and functions** — `field()`, `panel()`, every label and option mixin, `spacing()`, `hover()`, `absolute-cover()` — are in a consumer's namespace after `@use '@cynthion/ngx-formidable/styles/ngx-formidable'`. Verified by compiling a consumer-style stylesheet against `dist/`: `formidable.spacing(16)` returns `1rem` and `@include formidable.hover` expands, with no error. Nothing documents any of it, so every internal mixin rename is a silent breaking change. **The forward cannot simply be deleted**: `mixins/_pikaday.scss` holds 12 top-level rules (the calendar CSS, ~5 kB of the 22 kB output) and that forward is the only path by which they reach the page — removing it drops them. Fix: move those top-level rules into `_globals.scss` (or a `_pikaday-global.scss`) alongside the other unscoped rules, forward that instead, and drop `@forward './variables'`. Component SCSS is unaffected — all 14 files reach `styles/variables` by relative path, not through the entry point. Public SCSS surface, so it belongs with the Phase 13 API pass; define a clean CSS interface so consumers only can consume what is relevant to them
- replace `spacing()` and its `$spacing-map` with a one-line `rem($px)` function. The map is not a scale — it is a px→rem lookup whose members are whatever a token happened to need (`300` is the date panel's width), so it enforces no consistency; it `@error`s on any size not already listed, which is pure friction (adding `56` for the default theme meant editing the map first); and four entries — `60`, `64`, `80`, `400` — are dead
- extract a `BaseOptionFieldDirective` between `BaseFieldDirective` and the four option fields: `dropdown-field`, `autocomplete-field`, `radio-group-field` and `checkbox-group-field` each carry an identical `highlightedOptionIndex$` / `setHighlightedIndex` / `reconcileHighlightAfterOptionsChanged` block, and it would take `panelId` / `optionId` off the base with it

# Bugs:

- label position border: label is hidden behind the panel if it is open on top/before the field
- in the "Nationality" field example, the label always runs the animation on page reload. Animation of an inside label should only show/run when necessary
- date and time fields: make sure that clearing the input value resets the value. I saw this problem: select a date, then clear it with backspace, the pressing ArrowUp/ArrowDown, the date increased from the date set before instead of today
- date field: when readonly, when the field is clicked, the unicodeTokenFormat preview (placeholder?) is swapped to the mask, which must not be possible; possibly same issue for time-field, but doesn't show because it doesn't preview unicodeTokenFormat?
- zero border is not fully configurable: a panel has no border thickness of its own, so `--formidable-field-border-thickness: 0px` also strips the outline off every dropdown, autocomplete and date panel, leaving only the box-shadow. Add `--formidable-panel-border-thickness` defaulting to the field's, the same pattern `--formidable-toggle-field-track-border-thickness` already uses
- zero border is not fully configurable: `--formidable-label-border-band-reach` is pinned inside `:host(.is-focused)` in `field-decorator.component.scss`, which compiles to `.is-focused[_nghost-%COMP%]` — specificity (0,2,0), so a consumer's `:root` (0,1,0) cannot reach it. At rest the variable is overridable, focused it is not. A borderless theme that restates a wider focus ring therefore cannot tell a `border` label's band to cover that ring, and the ring shows above the label
- the focus ring's _width_ lives inside a colour-named variable — `--formidable-color-field-focus-box-shadow` is `0 0 0 var(--formidable-field-border-thickness) <colour>`. A theme that wants a wider ring, or any ring at all on a borderless field, has to restate all three shadows (field, group, invalid) instead of setting one length. Split the width out as `--formidable-field-focus-ring-width`
- `--formidable-field-border-thickness` does double duty as five other components' border thickness — the field group, the toggle track, the slider track, the slider thumb label and the panel. Four have their own escape-hatch variable, the panel does not. A consumer discovers this when their toggle vanishes; the group case is worse than cosmetic, since a focused radio/checkbox group loses its only focus indicator
- `44px` is an undocumented floor for the `inside` label positions: below it `--formidable-label-inside-slack` goes negative and the floating label overlaps the value. Nothing warns; the field just renders wrong. Either clamp the slack at `0px` or document the floor in `theming.md`

# Features:

- date field: in the panel, the current date must be visually highlighted (e.g., with a circle around it)
- date field: support entering a date range (from - to); this might be very tricky with respect to form state, keyboardhandling and visual representation; pikaday probably doesn't support it either
- possibility check: can the group fields (radio, checkbox) be configured with tokens so that the options (radio buttons, checkboxes) are left-aligned with the left border of other fields in the form (above and below)? or what would need to change? (background and border most probably would then be styled "transparent")
- dead style code found in Phase 12.5, kept rather than removed — decide on each: (a) the `icon` mixin in `_forms.scss` has zero call sites repo-wide; (b) `_formidable-vars.scss` does `@use './mixins/utils' as utils` and never references it; (c) three `:root` variables are read by nothing at all, not even another variable's fallback chain — `--formidable-overlay-z-index`, `--formidable-above-overlay-z-index`, `--formidable-date-field-panel-box-shadow`. Everything else that no mixin reads is load-bearing: `--formidable-border-radius`, `--formidable-label-line-height`, `--formidable-field-inner-height`, `--formidable-field-value-height`, `--formidable-label-inside-slack` and `--formidable-field-value-centered-top` are each read by a derived variable, so overriding one cascades. Those stay.
- group fields (radio / checkbox): Currently, they use borders and padding; consumers might want to left-align the options with other fields in the form; can this be done today or do we need additional feature and/or token support? (add a geometry example to the example demo)

# Documentation:

- all interfaces must be documented; this is a library, so the documentation is important for users to understand how to use it; keep it brief and short and simple
- ensure the ui_components.md is correct
- update the readme and ensure it is correct and up to date with the latest features and changes; make sure it sells all features

# Portal:

"Customize your own form theme".
The idea is a product page, where users can come to and play around with options to configure the theme for their own brand and product.

- preview of all fields (in an example form, funny context), the example form should use multiple fields of the same type (and can thus be a bit more complex) so that different variations of field type configs can be demoed
- the example form is fully functional and can be filled out, and the current values are shown in a separate view (see below)
- the fields of the new example form should be layed out in a grid and not all fields just using full width
- all options of every field can be changed in the portal and the result is shown in the preview form
- for options in fields, there should always be sample options that are disabled and readonly, so that the theming of them can be demoed
- all theme tokens can be changed (with color picker or sliders, etc.) in the portal and the result is shown in the preview form
- for theming, provide different categories (colors, geometry, typography, spacing, etc.), so that users can quickly find their baseline for further customization; today's example form already does this similarly, see also theme-options.md, which can be removed then
- support light and dark mode (i.e., define light and dark themes for colors)
- the resulting theme can be exported (copy-paste)
- the portal is deployed as GitHub Pages
- the example form is removed
- the root project is hosting the portal instead of the example form
- all theme tokens and field options are documented in the portal (with examples), inline to options and also in a separate documentation page
- the portal "control elements" shall use the ngx-formidable controls themselves, but with a distinct and compact theme
- the example form must use a different default theme and token config as the starting position
- portal also provides expandable/collapsible views for "form"-values, showing the current values entered in the example form
- portal also provides a (html-)editor to modify the example form and add/remove further fields and configurations, and the result is shown in the preview form
- the documentation and convention and definition of done is updated so that future features and fixes also find their way into the portal
- prefixes/suffixes can be added to fields and may be icons, text, or buttons. The portal should provide a way to configure them and show the result in the preview form.
- the portal should also link to the public github repository
- i18n config should also be changeable to best demonstrate the date field
- the portal has several pre-defined and well-designed themes that can be selected and applied to the example form, they serve as inspiration and starting point for users to create their own theme. The portal should also provide a way to export the theme configuration (copy-paste) and import it back into the portal. Add very different themes and variety in different token settings, since this is the super-power of this library: to pretty much customize everything.
- provide to choose different fonts; can some open source fonts be "bundled in" or fetched via borwser?
- do you have an idea how accessibility can be demonstrated in the portal? e.g., a "screen reader" mode that shows how the form is read out by a screen reader. This could be a separate view or a toggle button in the portal.

Before anything is implemented, propose a page structure and layout for the portal, including an optional navigation. The portal must be super intuitive and easy to use.

# Blog Post

- Create a blog post for the https://thedevexchange.com/, our company blog for devs
- I want to write a blog post about the ngx-formidable library, its features, and how it can be used to create beautiful and functional forms in Angular applications. The blog post should include code examples, screenshots, and a link to the GitHub repository. It should also highlight the benefits of using ngx-formidable over other form libraries and provide a call to action for readers to try it out.
- Reference the portal and github repo
- Interview me first to get my perspective and insights on the library, its development process, and its future roadmap. Use this information to create a compelling narrative for the blog post that showcases the library's unique features and advantages.
- Keep the text humorous and light, but also informative and professional. Use a conversational tone that engages the reader and makes them feel like they are part of the development journey.
- add a section on the blog post about the challenges and lessons learned during the development of ngx-formidable, and how these experiences have shaped the library's design and functionality. This will provide readers with valuable insights into the development process and help them understand the thought process behind the library's features.

# Deferred And Unscheduled:

Real items, deliberately not in any phase of `implementation.md`. Revisit explicitly; do not pull them into a phase without deciding to.

- update all dependencies (angular 20). Deferred so all feature work happens on one baseline. Consequence: the release is tagged on the current Angular major, and `ngx-mask` is already a major ahead of it — a peer mismatch that ships with it.
- remove validation from the library, only provide ui components. The Vest bridge is currently a headline feature and the largest possible breaking change; parked as an open question, not scheduled.
- there is no CI workflow — nothing runs lint, stylelint, prettier or tests on push. `deploy.yml` also reinstalls from scratch instead of from the lockfile, so builds are not reproducible.
- re-run the timer audit once the app is zoneless (comes with the Angular 20 update). Under zone change detection a
  `queueMicrotask` runs _before_ change detection, which is why no `setTimeout` could convert in Phase 10 — every
  remaining one waits on rendered DOM or on ngxMask init. Zoneless changes that, and makes `afterNextRender` the
  candidate rather than `queueMicrotask`.
- EnerQi consumes the library as a tarball and its example form still uses `formidableFieldTooltip` and a prefix/suffix on its group fields. Both were removed here; propagate them the next time the tarball is rebuilt.
