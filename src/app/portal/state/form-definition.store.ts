import { computed, Injectable, signal } from '@angular/core';
import { FIELD_CAPABILITIES } from '../model/field-capabilities';
import {
  PortalFieldKind,
  PortalFieldSpec,
  PortalFormDefinition,
  PortalFormOptions,
  PortalSectionSpec
} from '../model/field-spec.model';
import { localeOf } from '../model/locales';
import { PREVIEW_FORM_DEFINITION } from '../model/preview-form.definition';

/**
 * One immutable field-specification tree, plus the form-level options.
 *
 * One signal over the whole tree, not one per input: the renderer tracks by field identity and each field
 * component takes its specification as an input, so only the changed field's view is marked.
 */
@Injectable({ providedIn: 'root' })
export class FormDefinitionStore {
  public readonly definition = signal<PortalFormDefinition>(PREVIEW_FORM_DEFINITION);

  /** Which field the inspector is editing. Followed from focus only while the Fields tab is showing. */
  public readonly selectedFieldId = signal<string | null>(PREVIEW_FORM_DEFINITION.fields[0]?.id ?? null);

  public readonly fields = computed(() => this.definition().fields);
  public readonly sections = computed(() => this.definition().sections);
  public readonly options = computed(() => this.definition().options);

  public readonly selectedField = computed<PortalFieldSpec | null>(() => {
    const id = this.selectedFieldId();

    return this.fields().find((field) => field.id === id) ?? null;
  });

  public readonly selectedCapabilities = computed(() => {
    const field = this.selectedField();

    return field ? FIELD_CAPABILITIES[field.kind] : null;
  });

  /** The sections with their fields, which is what the stage and the model drawer both render from. */
  public readonly sectionsWithFields = computed<readonly { section: PortalSectionSpec; fields: PortalFieldSpec[] }[]>(
    () => {
      const fields = this.fields();

      return this.sections().map((section) => ({
        section,
        fields: fields.filter((field) => field.sectionId === section.id)
      }));
    }
  );

  public select(id: string | null): void {
    this.selectedFieldId.set(id);
  }

  public updateOptions(patch: Partial<PortalFormOptions>): void {
    this.definition.update((definition) => ({ ...definition, options: { ...definition.options, ...patch } }));
  }

  public updateField(id: string, patch: Partial<PortalFieldSpec>): void {
    this.definition.update((definition) => ({
      ...definition,
      fields: definition.fields.map((field) => (field.id === id ? { ...field, ...patch } : field))
    }));
  }

  /**
   * Sets one decoration slot on every field at once. Adornments are content projection, so the form scope
   * offers the same four choices as a field does — but as a bulk set rather than a second default to resolve
   * against, which would leave a field's own value unreadable from either control.
   */
  public setDecorationOnAllFields(patch: Partial<PortalFieldSpec['decoration']>): void {
    this.definition.update((definition) => ({
      ...definition,
      fields: definition.fields.map((field) => ({ ...field, decoration: { ...field.decoration, ...patch } }))
    }));
  }

  public updateDecoration(id: string, patch: Partial<PortalFieldSpec['decoration']>): void {
    this.definition.update((definition) => ({
      ...definition,
      fields: definition.fields.map((field) =>
        field.id === id ? { ...field, decoration: { ...field.decoration, ...patch } } : field
      )
    }));
  }

  public updateState(id: string, patch: Partial<PortalFieldSpec['state']>): void {
    this.definition.update((definition) => ({
      ...definition,
      fields: definition.fields.map((field) =>
        field.id === id ? { ...field, state: { ...field.state, ...patch } } : field
      )
    }));
  }

  /** One control moves the calendar's translations, its first day and the token format together. */
  public setFieldLocale(id: string, locale: PortalFieldSpec['locale']): void {
    const resolved = localeOf(locale);

    this.definition.update((definition) => ({
      ...definition,
      fields: definition.fields.map((field) => {
        if (field.id !== id) return field;

        const format = field.kind === 'time' ? resolved.timeFormat : resolved.dateFormat;

        return { ...field, locale, unicodeTokenFormat: format };
      })
    }));
  }

  /** The form-level locale control, which moves every date and time field at once. */
  public setFormLocale(locale: PortalFormOptions['locale']): void {
    const resolved = localeOf(locale);

    this.definition.update((definition) => ({
      ...definition,
      options: { ...definition.options, locale },
      fields: definition.fields.map((field) =>
        field.kind === 'date' || field.kind === 'time'
          ? {
              ...field,
              locale,
              unicodeTokenFormat: field.kind === 'time' ? resolved.timeFormat : resolved.dateFormat
            }
          : field
      )
    }));
  }

  public addField(kind: PortalFieldKind, sectionId: string): string {
    const id = this.uniqueId(kind);
    const template = this.fields().find((field) => field.kind === kind);
    const base: PortalFieldSpec = template
      ? { ...template, options: template.options ? [...template.options] : undefined }
      : {
          id,
          kind,
          sectionId,
          name: id,
          label: 'New field',
          placeholder: '',
          caption: 'Added in the structure editor',
          span: 1,
          decoration: {
            showLabel: true,
            labelPosition: 'inside',
            showRequiredMarker: false,
            labelAdornment: 'none',
            prefix: 'none',
            prefixAlign: 'center',
            suffix: 'none',
            suffixAlign: 'center',
            hint: '',
            hintAlign: 'start'
          },
          state: { readonly: false, disabled: false, autoFocus: false }
        };

    const added: PortalFieldSpec = {
      ...base,
      id,
      name: id,
      sectionId,
      label: `New ${kind}`,
      caption: 'Added in the structure editor'
    };

    this.definition.update((definition) => ({ ...definition, fields: [...definition.fields, added] }));
    this.select(id);

    return id;
  }

  public removeField(id: string): void {
    this.definition.update((definition) => ({
      ...definition,
      fields: definition.fields.filter((field) => field.id !== id)
    }));

    if (this.selectedFieldId() === id) {
      this.select(this.fields()[0]?.id ?? null);
    }
  }

  /** Moves a field within its own section, which is the only ordering the stage shows. */
  public moveField(id: string, delta: -1 | 1): void {
    this.definition.update((definition) => {
      const fields = [...definition.fields];
      const index = fields.findIndex((field) => field.id === id);
      if (index < 0) return definition;

      const field = fields[index]!;
      const siblings = fields.filter((candidate) => candidate.sectionId === field.sectionId);
      const position = siblings.indexOf(field);
      const target = siblings[position + delta];
      if (!target) return definition;

      const targetIndex = fields.indexOf(target);
      fields[index] = target;
      fields[targetIndex] = field;

      return { ...definition, fields };
    });
  }

  /** Replaces the whole form, which is what a template import lands in. */
  public replaceForm(sections: readonly PortalSectionSpec[], fields: readonly PortalFieldSpec[]): void {
    this.definition.update((definition) => ({
      ...definition,
      sections: sections.length ? [...sections] : definition.sections,
      fields: [...fields]
    }));

    this.select(fields[0]?.id ?? null);
  }

  public addSection(title: string): string {
    // Counting is not enough: an imported form brings its own section ids, and a second `section-2` would
    // silently merge two sections into one.
    const taken = new Set(this.sections().map((section) => section.id));
    let index = this.sections().length + 1;

    while (taken.has(`section-${index}`)) index += 1;

    const id = `section-${index}`;

    this.definition.update((definition) => ({
      ...definition,
      sections: [...definition.sections, { id, title }]
    }));

    return id;
  }

  /** The sample form everybody lands on. */
  public reset(): void {
    this.definition.set(PREVIEW_FORM_DEFINITION);
    this.select(PREVIEW_FORM_DEFINITION.fields[0]?.id ?? null);
  }

  /**
   * An empty form, to build up from nothing.
   *
   * One section rather than none: every add needs a section to add into, so a form with no sections at all
   * would be a dead end rather than a beginning.
   */
  public clear(): void {
    this.definition.set({
      ...PREVIEW_FORM_DEFINITION,
      title: 'Your Form',
      intro: '',
      submit: { label: 'Submit', accepted: 'Submitted.', rejected: 'The form is incomplete.' },
      sections: [{ id: 'section-1', title: 'Fields' }],
      fields: []
    });

    this.select(null);
  }

  private uniqueId(kind: PortalFieldKind): string {
    const taken = new Set(this.fields().map((field) => field.id));
    let index = 1;
    let candidate = `${kind}${index}`;

    while (taken.has(candidate)) {
      index += 1;
      candidate = `${kind}${index}`;
    }

    return candidate;
  }
}
