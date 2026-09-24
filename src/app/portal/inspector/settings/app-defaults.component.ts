import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormidableDefaults } from '@cynthion/ngx-formidable';
import { SelectedValueDirective } from '../../chrome/selected-value.directive';
import { serializeAppConfig } from '../../export/config-serializer';
import { copyText } from '../../helpers/clipboard.helpers';
import { FIELD_CAPABILITIES } from '../../model/field-capabilities';
import {
  ADORNMENT_ALIGN_LABELS,
  LABEL_POSITION_LABELS,
  LIBRARY_DEFAULTS,
  PANEL_POSITION_LABELS,
  PortalFieldSpec,
  REVEAL_LABELS
} from '../../model/field-spec.model';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { InspectorStore } from '../../state/inspector.store';

/** The defaults a field can state its own value for, and the one the form can. */
type FieldKey = 'labelPosition' | 'prefixAlign' | 'suffixAlign' | 'panelPosition';
type FormKey = 'revealOn' | 'showRequiredMarkers';

/** One default: what it offers, and what the library falls back to without it. */
interface DefaultControl<K extends FieldKey | FormKey> {
  readonly key: K;
  readonly label: string;
  readonly choices: readonly (readonly [string, string])[];
  readonly libraryDefault: string;
  readonly help?: string;
}

const FIELD_CONTROLS: readonly DefaultControl<FieldKey>[] = [
  {
    key: 'labelPosition',
    label: 'Label Position',
    choices: Object.entries(LABEL_POSITION_LABELS),
    libraryDefault: LABEL_POSITION_LABELS[LIBRARY_DEFAULTS.labelPosition],
    help: 'Honoured only by the horizontal layout. A group, a toggle and a slider always label outside.'
  },
  {
    key: 'prefixAlign',
    label: 'Prefix Follows',
    choices: Object.entries(ADORNMENT_ALIGN_LABELS),
    libraryDefault: ADORNMENT_ALIGN_LABELS[LIBRARY_DEFAULTS.prefixAlign]
  },
  {
    key: 'suffixAlign',
    label: 'Suffix Follows',
    choices: Object.entries(ADORNMENT_ALIGN_LABELS),
    libraryDefault: ADORNMENT_ALIGN_LABELS[LIBRARY_DEFAULTS.suffixAlign]
  },
  {
    key: 'panelPosition',
    label: 'Panel Position',
    choices: Object.entries(PANEL_POSITION_LABELS),
    libraryDefault: 'Per Field',
    help: 'Unset, a dropdown and an autocomplete open full width, and a date to the right.'
  }
];

const FORM_CONTROLS: readonly DefaultControl<FormKey>[] = [
  {
    key: 'revealOn',
    label: 'Reveal On',
    choices: Object.entries(REVEAL_LABELS),
    libraryDefault: REVEAL_LABELS[LIBRARY_DEFAULTS.revealOn],
    help: 'When the messages appear, on every form — and on a field that has no form.'
  },
  {
    key: 'showRequiredMarkers',
    label: 'Required Markers',
    choices: [
      ['true', 'Shown'],
      ['false', 'Hidden']
    ],
    libraryDefault: 'Shown',
    help: 'A field still has to ask for its own marker.'
  }
];

/** Whether a field honours a default at all, so a count never includes a field it cannot reach. */
function applies(field: PortalFieldSpec, key: FieldKey): boolean {
  const capabilities = FIELD_CAPABILITIES[field.kind];

  if (key === 'labelPosition') return capabilities.labelPositions;
  if (key === 'panelPosition') return capabilities.panel !== null;

  return capabilities.adornments;
}

/** What a field states for a default of its own, `undefined` where it inherits. */
function statedBy(field: PortalFieldSpec, key: FieldKey): string | undefined {
  return key === 'panelPosition' ? field.panelPosition : field.decoration[key];
}

/**
 * The app defaults: what a consumer passes to `provideNgxFormidable({ defaults })`.
 *
 * Unlike the form scope beside it, this holds values of its own, because the library renders from them — the
 * preview form is provided exactly these. Each control says how many fields, or whether the form, state their
 * own value instead, and clears them back to inheriting.
 */
@Component({
  selector: 'portal-app-defaults',
  templateUrl: './app-defaults.component.html',
  styleUrl: './app-defaults.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectedValueDirective]
})
export class AppDefaultsComponent {
  private readonly store = inject(FormDefinitionStore);
  protected readonly inspector = inject(InspectorStore);

  protected readonly fieldControls = FIELD_CONTROLS;
  protected readonly formControls = FORM_CONTROLS;
  protected readonly libraryDebounceMs = LIBRARY_DEFAULTS.debounceMs;

  protected readonly defaults = computed(() => this.store.appDefaults());
  protected readonly setCount = computed(() => Object.keys(this.defaults()).length);
  protected readonly justCopied = signal(false);

  protected valueOf(key: FieldKey | FormKey): string {
    const value = this.defaults()[key];

    return value === undefined ? '' : String(value);
  }

  protected set(key: FieldKey | FormKey, raw: string): void {
    const value = raw === '' ? undefined : key === 'showRequiredMarkers' ? raw === 'true' : raw;

    this.store.updateAppDefaults({ [key]: value } as FormidableDefaults);
  }

  protected setDebounce(raw: string): void {
    const value = raw.trim() === '' ? undefined : Number(raw);

    if (value === undefined || (Number.isFinite(value) && value >= 0))
      this.store.updateAppDefaults({ debounceMs: value });
  }

  /** The fields this default reaches, and how many of them state their own value instead. */
  protected overridesOf(key: FieldKey): { stating: number; reached: number } {
    const reached = this.store.fields().filter((field) => applies(field, key));

    return { stating: reached.filter((field) => statedBy(field, key) !== undefined).length, reached: reached.length };
  }

  protected formStates(key: FormKey): boolean {
    return this.store.options()[key] !== undefined;
  }

  protected clearFields(key: FieldKey): void {
    if (key === 'panelPosition') {
      this.store.updateAllFields({ panelPosition: undefined });
    } else {
      this.store.setDecorationOnAllFields({ [key]: undefined });
    }
  }

  protected clearForm(key: FormKey): void {
    this.store.updateOptions({ [key]: undefined });
  }

  protected copy(): Promise<void> {
    return copyText(serializeAppConfig(this.defaults()), this.justCopied);
  }
}
