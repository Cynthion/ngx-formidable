import { computed, effect, inject, Injectable, Injector, linkedSignal, signal, untracked } from '@angular/core';
import { form } from '@angular/forms/signals';
import { FORMIDABLE_ERROR_MESSAGE } from '@cynthion/ngx-formidable';
import { buildNested, fieldAt, readPath } from '../helpers/model-path.helpers';
import { emptyValueOf } from '../model/field-capabilities';
import { PortalFieldSpec } from '../model/field-spec.model';
import { PREVIEW_INITIAL_MODEL } from '../model/preview-form.definition';
import { previewSchema, PreviewSchemaField } from '../model/preview-form.schema';
import { FormDefinitionStore } from './form-definition.store';

export type PortalModel = Record<string, unknown>;

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;

  return true;
}

/** Two builds with the same fields at the same paths, in any order: nothing a schema is built from moved. */
function sameFields(a: readonly PreviewSchemaField[], b: readonly PreviewSchemaField[]): boolean {
  const key = (fields: readonly PreviewSchemaField[]) =>
    fields
      .map((field) => `${field.spec.id}=${field.path}`)
      .sort()
      .join('|');

  return key(a) === key(b);
}

/** One field's row in the model drawer. */
interface ModelEntry {
  readonly spec: PortalFieldSpec;
  /** Where this field's value sits in the model, which is `group.name` inside a grouped section. */
  readonly path: string;
  readonly value: unknown;
  readonly display: string;
  readonly filled: boolean;
  /** A condition is keeping this field off the form. Its key stays, and nothing validates it. */
  readonly hidden: boolean;
  readonly messages: readonly string[];
}

/**
 * The model the preview form edits, and the field tree over it that the form and the model drawer both read.
 */
@Injectable({ providedIn: 'root' })
export class FormValueStore {
  private readonly definitionStore = inject(FormDefinitionStore);
  private readonly injector = inject(Injector);
  private readonly message = inject(FORMIDABLE_ERROR_MESSAGE);

  /** The fields and their model paths, which only a structural edit changes. */
  private readonly fields = computed<readonly PreviewSchemaField[]>(
    () => {
      const paths = this.definitionStore.pathById();

      return this.definitionStore.fields().map((spec) => ({ spec, path: paths.get(spec.id) ?? spec.name }));
    },
    { equal: sameFields }
  );

  private readonly specById = computed(
    () => new Map(this.definitionStore.fields().map((field) => [field.id, field] as const))
  );

  /**
   * A key for every field the definition has. Signal Forms binds a field only to a key its model defines, so
   * a field added in the structure editor brings its key, empty, and a field moved into a group takes its
   * value with it.
   */
  public readonly model = linkedSignal<readonly PreviewSchemaField[], PortalModel>({
    source: this.fields,
    computation: (fields, previous) => {
      const model = previous?.value ?? PREVIEW_INITIAL_MODEL;
      const before = new Map(previous?.source.map((field) => [field.spec.id, field.path]));

      return buildNested(
        fields.map((field) => [
          field.path,
          readPath(model, before.get(field.spec.id) ?? field.path) ?? emptyValueOf(field.spec)
        ])
      );
    }
  });

  /** Whether the form has been submitted, which the footer answers with the definition's own two lines. */
  public readonly submitted = signal(false);

  private readonly validator = computed(() => this.definitionStore.options().validator);
  private readonly debounce = computed(() => this.definitionStore.options().debounce);

  /**
   * One build of the form: its field tree, and the injector the tree lives in.
   *
   * A schema is fixed once its form exists, so a new validator, a new debounce or a structural edit builds a
   * new one, with a Vest suite or a Zod schema of its own; every other setting a rule reads is read live.
   * Each tree gets an injector of its own and the effect below destroys it with the build, because a form's
   * effects — its validator's among them — live as long as their injector, and this store's lives as long
   * as the app.
   */
  private readonly build = computed(() => {
    const schema = previewSchema(
      { fields: this.fields(), validator: this.validator(), debounce: this.debounce() },
      {
        spec: (field) => this.specById().get(field.spec.id) ?? field.spec,
        options: () => this.definitionStore.options(),
        isHidden: (id) => this.hiddenFieldIds().has(id)
      }
    );

    return untracked(() => {
      const injector = Injector.create({ providers: [], parent: this.injector });
      const tree = form(this.model, schema, {
        injector,
        submission: {
          action: async () => this.submitted.set(true),
          onInvalid: () => this.submitted.set(true)
        }
      });

      return { injector, tree };
    });
  });

  /** The field tree the form binds and the model drawer reads its state off. */
  public readonly form = computed(() => this.build().tree);

  constructor() {
    effect((onCleanup) => {
      const { injector } = this.build();

      onCleanup(() => injector.destroy());
    });
  }

  /**
   * The fields a condition is currently keeping off the form, which the schema's `hidden()` rules read.
   * A condition naming a field that is no longer on the form renders rather than hides: removing one field
   * in the structure editor must not leave another permanently unreachable.
   */
  public readonly hiddenFieldIds = computed<ReadonlySet<string>>(() => {
    const model = this.model();
    const paths = this.definitionStore.pathById();
    const byName = new Map(this.definitionStore.fields().map((field) => [field.name, field]));

    const hidden = this.definitionStore.fields().filter((field) => {
      const condition = field.visibleWhen;
      if (!condition) return false;

      const watched = byName.get(condition.field);
      if (!watched) return false;

      return readPath(model, paths.get(watched.id) ?? watched.name) !== condition.equals;
    });

    return new Set(hidden.map((field) => field.id));
  });

  public readonly entries = computed<readonly ModelEntry[]>(() => {
    const model = this.model();
    const tree = this.form();
    const hidden = this.hiddenFieldIds();

    return this.fields().map(({ spec, path }) => {
      const value = readPath(model, path);

      return {
        spec: this.specById().get(spec.id) ?? spec,
        path,
        value,
        display: this.display(value),
        filled: isFilled(value),
        hidden: hidden.has(spec.id),
        messages: fieldAt(tree, path)().errors().map(this.message)
      };
    });
  });

  /** Both counts skip what a condition is hiding: a field that is not on the form cannot be filled in. */
  public readonly filledCount = computed(() => this.entries().filter((entry) => entry.filled && !entry.hidden).length);
  public readonly fieldCount = computed(() => this.entries().filter((entry) => !entry.hidden).length);

  /** Every message the form holds, keyed by its target's model path — `''` for the whole form. */
  public readonly errors = computed<Readonly<Record<string, readonly string[]>>>(() => {
    const root = this.form()().name();
    const errors: Record<string, string[]> = {};

    for (const error of this.form()().errorSummary()) {
      const target = error
        .fieldTree()
        .name()
        .slice(root.length + 1);

      (errors[target] ??= []).push(this.message(error));
    }

    return errors;
  });

  public readonly wholeFormMessages = computed(() => this.errors()[''] ?? []);
  public readonly errorCount = computed(() => this.form()().errorSummary().length);
  public readonly valid = computed(() => this.form()().valid());
  public readonly dirty = computed(() => this.form()().dirty());
  public readonly submitting = computed(() => this.form()().submitting());

  /** The model as the consumer would see it after a submit. */
  public readonly serialized = computed(() =>
    JSON.stringify(this.model(), (_key, value: unknown) => (value instanceof Date ? value.toISOString() : value), 2)
  );

  /**
   * Applies the preset of the option the user just chose, if it carries one.
   *
   * Called from the field's `valueChange`, which only the user's own pick emits — so a later edit to one of
   * the fields the preset filled stands, and the choice is a starting point, not a lock. The patch is a
   * spread, which is exactly what the exported component's handler does.
   */
  public applyPreset(spec: PortalFieldSpec, value: unknown): void {
    const preset = typeof value === 'string' ? spec.presets?.[value] : undefined;

    if (preset) this.model.update((model) => ({ ...model, ...preset }));
  }

  private display(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (value instanceof Date) return value.toISOString().slice(0, 16).replace('T', ' ');
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'string') return value.trim() ? value : '—';

    return String(value);
  }
}
