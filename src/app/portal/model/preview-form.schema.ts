import {
  debounce,
  disabled,
  hidden,
  max,
  maxLength,
  metadata,
  min,
  minLength,
  readonly,
  required,
  REQUIRED,
  SchemaFn,
  SchemaPath,
  SchemaPathTree,
  validateStandardSchema
} from '@angular/forms/signals';
import { PortalDebounce, PortalFieldSpec, PortalFormOptions, PortalValidatorKind } from './field-spec.model';
import { ANGULAR_MIN_LENGTHS, ANGULAR_REQUIRED_FIELDS, createPreviewValidationSuite } from './preview-form.validation';

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

/** The preview form's schema: the form's master switches, each field's settings and condition, and the rules. */
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

      if (build.validator !== 'angular') continue;

      if (ANGULAR_REQUIRED_FIELDS.has(field.spec.name)) required(path);

      const length = ANGULAR_MIN_LENGTHS.get(field.spec.name);
      if (length) minLength(path as SchemaPath<string>, length);
    }

    if (build.validator === 'vest') validateStandardSchema(root, createPreviewValidationSuite());
  };
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
