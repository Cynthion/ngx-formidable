import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FIELD_CAPABILITIES, FIELD_KIND_LABELS } from '../../model/field-capabilities';
import {
  ADORNMENT_ALIGN_LABELS,
  FILTER_STRATEGY_LABELS,
  LABEL_POSITION_LABELS,
  LIBRARY_DEFAULTS,
  PANEL_POSITION_LABELS,
  PortalFieldDecoration,
  PortalFieldSpec,
  PortalFieldState,
  PortalLocaleId,
  PortalOptionSpec,
  SLOT_LABELS
} from '../../model/field-spec.model';
import { PORTAL_LOCALES } from '../../model/locales';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { SelectedValueDirective } from '../../chrome/selected-value.directive';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectedValueDirective]
})
export class FieldEditorComponent {
  protected readonly store = inject(FormDefinitionStore);

  protected readonly slots = Object.entries(SLOT_LABELS);
  protected readonly labelPositions = Object.entries(LABEL_POSITION_LABELS);
  protected readonly alignments = Object.entries(ADORNMENT_ALIGN_LABELS);
  protected readonly panelPositions = Object.entries(PANEL_POSITION_LABELS);
  protected readonly filterStrategies = Object.entries(FILTER_STRATEGY_LABELS);
  protected readonly formatters = FORMATTERS;
  protected readonly locales = PORTAL_LOCALES;
  protected readonly kindLabels = FIELD_KIND_LABELS;

  protected readonly field = computed(() => this.store.selectedField());
  protected readonly capabilities = computed(() => {
    const field = this.field();

    return field ? FIELD_CAPABILITIES[field.kind] : null;
  });

  protected readonly labelPositionApplies = computed(() => this.capabilities()?.labelPositions ?? false);

  /**
   * What each inheritable control falls back to while the field states nothing — the app default, then the
   * library's own — named, so the `App Default` choice says what is actually in force.
   */
  protected readonly inherited = computed(() => {
    const defaults = this.store.appDefaults();
    const panel = defaults.panelPosition ?? this.capabilities()?.panel;

    return {
      labelPosition: LABEL_POSITION_LABELS[defaults.labelPosition ?? LIBRARY_DEFAULTS.labelPosition],
      prefixAlign: ADORNMENT_ALIGN_LABELS[defaults.prefixAlign ?? LIBRARY_DEFAULTS.prefixAlign],
      suffixAlign: ADORNMENT_ALIGN_LABELS[defaults.suffixAlign ?? LIBRARY_DEFAULTS.suffixAlign],
      panelPosition: panel ? PANEL_POSITION_LABELS[panel] : ''
    };
  });

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
