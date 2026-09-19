import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FIELD_CAPABILITIES, FIELD_KIND_LABELS } from '../../model/field-capabilities';
import {
  LABEL_POSITION_LABELS,
  PortalFieldDecoration,
  PortalFieldSpec,
  PortalFieldState,
  PortalLocaleId,
  PortalOptionSpec,
  SLOT_LABELS
} from '../../model/field-spec.model';
import { PORTAL_LOCALES } from '../../model/locales';
import { FormDefinitionStore } from '../../state/form-definition.store';

const FORMATTERS = [
  ['none', 'Raw number'],
  ['percent', 'Percent'],
  ['years', 'Years'],
  ['currency', 'Currency'],
  ['ordinal', 'Ordinal']
] as const;

/**
 * Every input of the selected field, capability-gated.
 *
 * The groups are identical for every field — identity, state, decoration, behaviour, options — so the layout
 * is learned once. A control is offered only where the capability table says the field honours it, so the
 * page whose claim is that everything is configurable never shows one that silently does nothing.
 */
@Component({
  selector: 'portal-field-editor',
  templateUrl: './field-editor.component.html',
  styleUrl: './field-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldEditorComponent {
  protected readonly store = inject(FormDefinitionStore);

  protected readonly slots = Object.entries(SLOT_LABELS);
  protected readonly labelPositions = Object.entries(LABEL_POSITION_LABELS);
  protected readonly formatters = FORMATTERS;
  protected readonly locales = PORTAL_LOCALES;
  protected readonly kindLabels = FIELD_KIND_LABELS;

  protected readonly field = computed(() => this.store.selectedField());
  protected readonly capabilities = computed(() => {
    const field = this.field();

    return field ? FIELD_CAPABILITIES[field.kind] : null;
  });

  protected readonly labelPositionApplies = computed(() => this.capabilities()?.labelPositions ?? false);

  protected set<K extends keyof PortalFieldSpec>(key: K, value: PortalFieldSpec[K]): void {
    const field = this.field();
    if (field) this.store.updateField(field.id, { [key]: value } as Partial<PortalFieldSpec>);
  }

  protected setNumber(key: keyof PortalFieldSpec, raw: string): void {
    const value = Number(raw);
    if (Number.isFinite(value)) this.set(key, value as PortalFieldSpec[typeof key]);
  }

  protected setDecoration<K extends keyof PortalFieldDecoration>(key: K, value: PortalFieldDecoration[K]): void {
    const field = this.field();
    if (field) this.store.updateDecoration(field.id, { [key]: value } as Partial<PortalFieldDecoration>);
  }

  protected setState<K extends keyof PortalFieldState>(key: K, value: PortalFieldState[K]): void {
    const field = this.field();
    if (field) this.store.updateState(field.id, { [key]: value } as Partial<PortalFieldState>);
  }

  protected setLocale(value: string): void {
    const field = this.field();
    if (field) this.store.setFieldLocale(field.id, value as PortalLocaleId);
  }

  protected setOption(index: number, patch: Partial<PortalOptionSpec>): void {
    const field = this.field();
    if (!field?.options) return;

    this.set(
      'options',
      field.options.map((option, i) => (i === index ? { ...option, ...patch } : option))
    );
  }

  protected addOption(): void {
    const field = this.field();
    if (!field) return;

    const next = [
      ...(field.options ?? []),
      { value: `option-${(field.options?.length ?? 0) + 1}`, label: 'New option' }
    ];
    this.set('options', next);
  }

  protected removeOption(index: number): void {
    const field = this.field();
    if (!field?.options) return;

    this.set(
      'options',
      field.options.filter((_option, i) => i !== index)
    );
  }
}
