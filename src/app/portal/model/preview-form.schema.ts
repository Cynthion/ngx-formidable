import {
  debounce,
  disabled,
  hidden,
  max,
  maxLength,
  metadata,
  min,
  minLength,
  pattern,
  readonly,
  required,
  REQUIRED,
  SchemaFn,
  SchemaPath,
  SchemaPathTree,
  validate,
  validateStandardSchema
} from '@angular/forms/signals';
import { FIELD_KIND_VALUE_TYPES } from './field-capabilities';
import { PortalDebounce, PortalFieldSpec, PortalFormOptions, PortalValidatorKind } from './field-spec.model';
import { createPreviewSuite, PortalRule, previewZodSchema, rulesOn, SampleModel } from './preview-form.validation';

type PreviewModel = Record<string, unknown>;

/** One field of a build: its specification when the build was made, and where its value sits in the model. */
export interface PreviewSchemaField {
  readonly spec: PortalFieldSpec;
  readonly path: string;
}

/**
 * What a build of the schema is made from. A schema is fixed once its form exists, so changing any of these
 * builds a new form; everything else a rule needs it reads live, through `PreviewSchemaLive`.
 */
export interface PreviewSchemaBuild {
  readonly fields: readonly PreviewSchemaField[];
  readonly validator: PortalValidatorKind;
  readonly debounce: PortalDebounce;
}

/** What the rules read as they run, so an edit on the Settings tab reaches the form without a new build. */
export interface PreviewSchemaLive {
  spec(field: PreviewSchemaField): PortalFieldSpec;
  options(): PortalFormOptions;
  isHidden(id: string): boolean;
}

/**
 * A field's own settings, as rules — the only way a field bound by `[formField]` takes its state, which is
 * why they are here rather than bindings. Shared with the Specimen's cells, which render the same field.
 */
export function fieldRules(path: SchemaPath<unknown>, spec: () => PortalFieldSpec): void {
  readonly(path, () => spec().state.readonly);
  disabled(path, () => spec().state.disabled);
  // The marker with no rule behind it: a `required()` would report too, beside whatever the validator says.
  metadata(path, REQUIRED, () => spec().decoration.markRequired);
  // A limit a kind does not have is never set on it, so each is safe on every kind.
  minLength(path as SchemaPath<string>, () => spec().minLength);
  maxLength(path as SchemaPath<string>, () => spec().maxLength);
  min(path as SchemaPath<number>, () => spec().min);
  max(path as SchemaPath<number>, () => spec().max);
}

/**
 * The preview form's schema: the form's master switches, each field's settings and condition, then the
 * sample's rules as the validator spells them.
 */
export function previewSchema(build: PreviewSchemaBuild, live: PreviewSchemaLive): SchemaFn<PreviewModel> {
  return (root) => {
    // A rule on the root reaches every field under it: the debounce, readonly and disabled are inherited.
    debounce(root, build.debounce);
    readonly(root, () => live.options().readonly);
    disabled(root, () => live.options().disabled);

    for (const field of build.fields) {
      const path = pathAt(root, field.path);

      fieldRules(path, () => live.spec(field));
      hidden(path, () => live.isHidden(field.spec.id));
    }

    if (build.validator === 'none') return;

    const rules = rulesOn(new Map(build.fields.map((field) => [field.path, FIELD_KIND_VALUE_TYPES[field.spec.kind]])));

    if (build.validator === 'angular') return angularChecks(root, rules);

    // Neither Vest nor Zod can tell Signal Forms a field is required, so the schema says so beside them.
    for (const rule of rules) {
      if (rule.check.kind === 'required') metadata(pathAt(root, rule.target), REQUIRED, () => true);
    }

    validateStandardSchema(root, build.validator === 'vest' ? createPreviewSuite(rules) : previewZodSchema(rules));
  };
}

/**
 * The rules as Angular's own. `required()` marks the field as well as checking it, and `pattern()` leaves an
 * empty value alone by itself.
 */
function angularChecks(root: SchemaPathTree<PreviewModel>, rules: readonly PortalRule[]): void {
  for (const { target, message, check } of rules) {
    const path = target ? pathAt(root, target) : (root as SchemaPath<unknown>);

    switch (check.kind) {
      case 'required':
        required(path, { message });
        break;
      case 'pattern':
        pattern(path as SchemaPath<string>, check.pattern, { message });
        break;
      case 'maxItems':
        maxLength(path as SchemaPath<string[]>, check.max, { message });
        break;
      case 'cross':
        validate(path, (context) =>
          check.test(context.valueOf(root) as unknown as SampleModel) ? undefined : { kind: check.name, message }
        );
    }
  }
}

/** The schema path for a dotted model path, which is `group.name` for a field in a grouped section. */
function pathAt(root: SchemaPathTree<PreviewModel>, path: string): SchemaPath<unknown> {
  return path
    .split('.')
    .reduce<SchemaPath<unknown>>(
      (node, key) => (node as unknown as Record<string, SchemaPath<unknown>>)[key]!,
      root as SchemaPath<unknown>
    );
}
