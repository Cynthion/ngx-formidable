import { computed, inject, Injectable, signal } from '@angular/core';
import { FormidableFormErrors, WHOLE_FORM } from '@cynthion/ngx-formidable';
import { PortalFieldKind, PortalFieldSpec } from '../model/field-spec.model';
import { PREVIEW_INITIAL_MODEL } from '../model/preview-form.definition';
import { FormDefinitionStore } from './form-definition.store';

export type PortalModel = Record<string, unknown>;

/** What the shape holds for a kind. The library checks the model against it in dev mode. */
function shapeValueFor(kind: PortalFieldKind): unknown {
  switch (kind) {
    case 'checkbox-group':
      return [];
    case 'date':
    case 'time':
      return new Date();
    case 'toggle':
      return false;
    case 'slider':
    case 'counter':
      return 0;
    default:
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
  readonly value: unknown;
  readonly display: string;
  readonly filled: boolean;
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

  public readonly shape = computed<PortalModel>(() =>
    Object.fromEntries(this.definitionStore.fields().map((field) => [field.name, shapeValueFor(field.kind)]))
  );

  public readonly entries = computed<readonly ModelEntry[]>(() => {
    const model = this.model();
    const errors = this.errors();

    return this.definitionStore.fields().map((spec) => {
      const value = model[spec.name];

      return {
        spec,
        value,
        display: this.display(value),
        filled: isFilled(value),
        messages: errors[spec.name] ?? []
      };
    });
  });

  public readonly filledCount = computed(() => this.entries().filter((entry) => entry.filled).length);
  public readonly fieldCount = computed(() => this.entries().length);

  public readonly wholeFormMessages = computed<readonly string[]>(() => this.errors()[WHOLE_FORM] ?? []);

  public readonly errorCount = computed(() =>
    Object.values(this.errors()).reduce((total, messages) => total + messages.length, 0)
  );

  /** The model as the consumer would see it after a submit. */
  public readonly serialized = computed(() =>
    JSON.stringify(this.model(), (_key, value: unknown) => (value instanceof Date ? value.toISOString() : value), 2)
  );

  public setModel(model: PortalModel): void {
    this.model.set(model);
  }

  public reset(): void {
    this.model.set({ ...PREVIEW_INITIAL_MODEL });
    this.submitted.set(false);
  }

  public clear(): void {
    this.model.set(
      Object.fromEntries(
        this.definitionStore.fields().map((field) => [field.name, field.kind === 'checkbox-group' ? [] : null])
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
