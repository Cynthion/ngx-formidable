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

- ensure all fields can be "focus on page load" (without panels being opened)
- make DateFieldComponent `smaller` or render better for smaller screens
- Prefer queueMicrotask over setTimeout where possible
- Add Storybook stories for layout options
- Toggle: allow setting layout to 'inline' or 'group'
- add option to date field to show at bottom of screen (e.g., see VIAC app)
- ARIA attributes

# Bugs:

- label position border: label is hidden behind the panel if it is open on top/before the field
- in the "Nationality" field example, the label always runs the animation on page reload. Animation of an inside label should only show/run when necessary

# Features:

- date/time field: arrow up/down to increment/decrement years/months/days and hours/minutes
- date field: arrow down should not open panel, only navigate throught the dates. when the panel is open, the arrow keys must move the date selection in the panel.
- allow the bottom border to be configured (thickness and color) when the field is invalid or focused (and defined default values)
- allow the border corner radius to be configured (so each can have different, e.g. only top rounded)
- possibility check: can the group fields (radio, checkbox) be configured with tokens so that the options (radio buttons, checkboxes) are left-aligned with the left border of other fields in the form (above and below)? or what would need to change? (background and border most probably would then be styled "transparent")

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
- the resulting theme can be exported (copy-paste)
- the portal is deployed as GitHub Pages
- the example form is removed
- the root project is hosting the portal instead of the example form
- all theme tokens and field options are documented in the portal (with examples), inline to options and also in a separate documentation page
- the portal "control elements" shall use the ngx-formidable controls themselves, but with a distinct theme
- the example form must use a different default theme and token config as the starting position
- portal also provides expandable/collapsible views for "form"-values, showing the current values entered in the example form
- portal also provides a (html-)editor to modify the example form and add/remove further fields and configurations, and the result is shown in the preview form
- the documentation is updated so that future features and fixes also find their way into the portal
- prefixes/suffixes can be added to fields and may be icons, text, or buttons. The portal should provide a way to configure them and show the result in the preview form.
- the portal should also link to the public github repository
- i18n config should also be changeable to best demonstrate the date field

Before all, propose a page structure and layout for the portal, including an optional navigation. The portal must be super intuitive and easy to use.

# Deferred And Unscheduled:

Real items, deliberately not in any phase of `implementation.md`. Revisit explicitly; do not pull them into a phase without deciding to.

- update all dependencies (angular 20). Deferred so all feature work happens on one baseline. Consequence: the release is tagged on the current Angular major, and `ngx-mask` is already a major ahead of it — a peer mismatch that ships with it.
- remove validation from the library, only provide ui components. The Vest bridge is currently a headline feature and the largest possible breaking change; parked as an open question, not scheduled.
- the demo writes the selected theme to `localStorage` but never reads it back on init, so the choice does not survive a reload.
- there is no CI workflow — nothing runs lint, stylelint, prettier or tests on push. `deploy.yml` also reinstalls from scratch instead of from the lockfile, so builds are not reproducible.
- EnerQi consumes the library as a tarball and its example form still uses `formidableFieldTooltip` and a prefix/suffix on its group fields. Both were removed here; propagate them the next time the tarball is rebuilt.
