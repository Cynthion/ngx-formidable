import { computed, inject, Injectable, signal } from '@angular/core';
import { FormidableFormErrors, WHOLE_FORM } from '@cynthion/ngx-formidable';
import { buildNested, readPath } from '../helpers/model-path.helpers';
import { FIELD_KIND_VALUE_TYPES } from '../model/field-capabilities';
import { PortalFieldKind, PortalFieldSpec } from '../model/field-spec.model';
import { PREVIEW_INITIAL_MODEL } from '../model/preview-form.definition';
import { FormDefinitionStore } from './form-definition.store';

export type PortalModel = Record<string, unknown>;

/** What the shape holds for a kind. The library checks the model against it in dev mode. */
function shapeValueFor(kind: PortalFieldKind): unknown {
  switch (FIELD_KIND_VALUE_TYPES[kind]) {
    case 'string[]':
      return [];
    case 'Date':
      return new Date();
    case 'boolean':
      return false;
    case 'number':
      return 0;
    case 'string':
      return '';
  }
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;

  return true;
}

/** One field's row in the model drawer. */
interface ModelEntry {
  readonly spec: PortalFieldSpec;
  /** Where this field's value sits in the model, which is `group.name` inside an `ngModelGroup`. */
  readonly path: string;
  readonly value: unknown;
  readonly display: string;
  readonly filled: boolean;
  /** A condition is keeping this field off the form, so it has no control and no key in the model. */
  readonly hidden: boolean;
  readonly messages: readonly string[];
}

/**
 * The model the preview form edits, and the shape derived from the definition.
 *
 * The shape is derived rather than declared: a static one starts reporting mismatches the moment a field is
 * added or renamed, which the structure editor does constantly.
 */
@Injectable({ providedIn: 'root' })
export class FormValueStore {
  private readonly definitionStore = inject(FormDefinitionStore);

  public readonly model = signal<PortalModel>({ ...PREVIEW_INITIAL_MODEL });
  public readonly errors = signal<FormidableFormErrors>({});
  public readonly valid = signal<boolean | null>(null);
  public readonly dirty = signal<boolean | null>(null);
  public readonly submitted = signal(false);

  /**
   * The shape carries every field the form could render, including the two a condition currently hides.
   *
   * That is not a leak: the shape is a dev-mode typo check over `DeepPartial`, and it is checked against the
   * keys the *model* has. A key it lists and the model lacks is exactly the conditional case, and is legal.
   */
  public readonly shape = computed<PortalModel>(() => {
    const paths = this.definitionStore.pathById();

    return buildNested(
      this.definitionStore.fields().map((field) => [paths.get(field.id) ?? field.name, shapeValueFor(field.kind)])
    );
  });

  /**
   * The fields a condition is currently keeping off the form.
   *
   * `@if` destroys the control, so a hidden field has no entry in the model at all — which is why this is
   * derived from the model rather than read out of it.
   */
  public readonly hiddenFieldIds = computed<ReadonlySet<string>>(() => {
    const model = this.model();
    const paths = this.definitionStore.pathById();
    const byName = new Map(this.definitionStore.fields().map((field) => [field.name, field]));

    const hidden = this.definitionStore.fields().filter((field) => {
      const condition = field.visibleWhen;
      if (!condition) return false;

      // A condition naming a field that is no longer on the form renders rather than hides: removing one
      // field in the structure editor must not leave another permanently unreachable.
      const watched = byName.get(condition.field);
      if (!watched) return false;

      return readPath(model, paths.get(watched.id) ?? watched.name) !== condition.equals;
    });

    return new Set(hidden.map((field) => field.id));
  });

  public readonly entries = computed<readonly ModelEntry[]>(() => {
    const model = this.model();
    const errors = this.errors();
    const paths = this.definitionStore.pathById();
    const hidden = this.hiddenFieldIds();

    return this.definitionStore.fields().map((spec) => {
      const path = paths.get(spec.id) ?? spec.name;
      const value = readPath(model, path);

      return {
        spec,
        path,
        value,
        display: this.display(value),
        filled: isFilled(value),
        hidden: hidden.has(spec.id),
        messages: errors[path] ?? []
      };
    });
  });

  /** Both counts skip what a condition is hiding: a field with no control cannot be filled in. */
  public readonly filledCount = computed(() => this.entries().filter((entry) => entry.filled).length);
  public readonly fieldCount = computed(() => this.entries().filter((entry) => !entry.hidden).length);

  public readonly wholeFormMessages = computed<readonly string[]>(() => this.errors()[WHOLE_FORM] ?? []);

  public readonly errorCount = computed(() =>
    Object.values(this.errors()).reduce((total, messages) => total + messages.length, 0)
  );

  /** The model as the consumer would see it after a submit. */
  public readonly serialized = computed(() =>
    JSON.stringify(this.model(), (_key, value: unknown) => (value instanceof Date ? value.toISOString() : value), 2)
  );

  /**
   * Takes the model the form produced, with any template preset the change asked for applied over it.
   *
   * Here rather than on the field, because a preset writes keys the field it sits on does not own: it is a
   * change to the model, and this is what holds the model.
   */
  public setModel(model: PortalModel): void {
    this.model.set(this.withPresets(model));
  }

  /**
   * Applies the preset of every field whose own value just moved to an option that carries one.
   *
   * Measured against the previous model rather than against the field's value alone, so a later edit to one
   * of the fields a preset filled is not undone on the next keystroke — the choice is a starting point, not
   * a lock. The patch is a spread, which is exactly what the exported component's handler does.
   */
  private withPresets(model: PortalModel): PortalModel {
    const previous = this.model();
    const paths = this.definitionStore.pathById();
    let patched = model;

    for (const field of this.definitionStore.fields()) {
      if (!field.presets) continue;

      const path = paths.get(field.id) ?? field.name;
      const value = readPath(model, path);

      if (typeof value !== 'string' || value === readPath(previous, path)) continue;

      const preset = field.presets[value];
      if (preset) patched = { ...patched, ...preset };
    }

    return patched;
  }

  public reset(): void {
    this.model.set({ ...PREVIEW_INITIAL_MODEL });
    this.submitted.set(false);
  }

  public clear(): void {
    const paths = this.definitionStore.pathById();

    this.model.set(
      buildNested(
        this.definitionStore
          .fields()
          .map((field) => [paths.get(field.id) ?? field.name, field.kind === 'checkbox-group' ? [] : null])
      )
    );
    this.submitted.set(false);
  }

  private display(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (value instanceof Date) return value.toISOString().slice(0, 16).replace('T', ' ');
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'string') return value.trim() ? value : '—';

    return String(value);
  }
}
