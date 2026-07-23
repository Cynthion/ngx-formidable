---
name: create-component
description: Create or modify an Angular component in EnerQi with correct placement, selector, style-free composition, story, and docs.
---

# Create a component

## 1. Decide placement FIRST

- **Reusable** across features/views (an atom, form control, or layout wrapper)
  → `projects/app/src/lib/modules/ui/components/<basic|forms|layout>/<name>/`
  → selector `cmp-ui-<name>`; template set: `templates/reusable/`
  → **must** add or update its entry in @.documentation/ui_components.md (read the whole section).
- **Used once / feature- or view-specific**
  → colocate as a SIBLING next to its consumer (the highest shared parent that uses it), inside
  that page/container's folder — NOT under `modules/ui/components/`.
  → selector: feature `cmp-<name>`; view `cmp-<view>-<name>` (e.g. `cmp-patients-complaint-edit-form`).
  → template set: `templates/colocated/`
  → **not** listed in `ui_components.md` (that catalog is for reusable UI components only).
  Real examples: `modules/features/subscriptions/components/subscriptions-overview-page/checkout-failed-overlay/`,
  `modules/views/patients/components/complaint-edit-page/complaint-edit-form/`.

## 2. Files (copy from `templates/…`, rename)

`<name>.component.ts`, `.component.html`, `.component.scss`, `.stories.ts`. Adjust the relative `../` depth for the `@use '…/styles/variables'` and the `…/storybook/…` imports to match the folder nesting (e.g. 5 `../` for `basic/<name>/`, 6 for a nested view component).

## 3. Conventions (see @.documentation/conventions.md)

- Presentational component: `@Input()` / `@Output()` only, no store. Reusable UI: use `OnPush`.
- Compositions (pages, containers, form-orchestrators) stay style-free — layout rules only, no
  typography/colors. Only when the `.scss` has no rules at all, keep the
  `// No styles here — style the UI component in modules/ui/components/ instead` comment; drop it
  once any layout rule is added. Presentational leaf components may own their full styles.
- Self-responsive: handle breakpoints in SCSS (`@include mobile`), never via a size/compact `@Input`.
- Stories per @.documentation/storybook.md (CSF3, `Group / Variant` naming, correct decorators).
  Colocated view stories use the view decorator (`storybookPatientsDecorators`,
  `storybookAppointmentDecorators`, `storybookDashboardDecorators`, `storybookSettingsDecorators`);
  feature stories use `storybookCompositionDecorators`.
- Mirror sibling components (naming, input/output order, template attribute order, story shape).

## 4. Prove it — run the `verify` skill.
