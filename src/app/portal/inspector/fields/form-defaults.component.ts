import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import {
  LABEL_POSITION_LABELS,
  PortalFieldDecoration,
  PortalFormOptions,
  PortalLocaleId,
  PortalSlotContent,
  SLOT_LABELS
} from '../../model/field-spec.model';
import { PORTAL_LOCALES } from '../../model/locales';
import { FormDefinitionStore } from '../../state/form-definition.store';

const PANEL_POSITIONS = [
  ['left', 'Left'],
  ['right', 'Right'],
  ['full', 'Full width'],
  ['sheet', 'Bottom sheet']
] as const;

const REVEAL = [
  ['touched', 'Touched'],
  ['dirty', 'Dirty'],
  ['submitted', 'Submitted'],
  ['always', 'Always']
] as const;

const UPDATE_ON = [
  ['change', 'Change'],
  ['blur', 'Blur'],
  ['submit', 'Submit']
] as const;

const VALIDATORS = [
  ['vest', 'Vest suite'],
  ['angular', "Angular's own validators"],
  ['none', 'None']
] as const;

/**
 * The repeated inputs, set once for every field.
 *
 * Run and reveal are two axes, not one setting: run is Angular's `updateOn` and decides when the validator
 * runs, reveal is the library's `revealOn` and decides when the messages appear.
 */
@Component({
  selector: 'portal-form-defaults',
  templateUrl: './form-defaults.component.html',
  styleUrl: './form-defaults.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormDefaultsComponent {
  protected readonly store = inject(FormDefinitionStore);

  /** Which half to render. The two are separate accordions, but one component owns both. */
  public readonly section = input.required<'decoration' | 'validation'>();

  protected readonly labelPositions = Object.entries(LABEL_POSITION_LABELS);
  protected readonly panelPositions = PANEL_POSITIONS;
  protected readonly reveals = REVEAL;
  protected readonly updateOns = UPDATE_ON;
  protected readonly validators = VALIDATORS;
  protected readonly slots = Object.entries(SLOT_LABELS);
  protected readonly locales = PORTAL_LOCALES;

  protected set<K extends keyof PortalFormOptions>(key: K, value: PortalFormOptions[K]): void {
    this.store.updateOptions({ [key]: value } as Partial<PortalFormOptions>);
  }

  protected setLocale(value: string): void {
    this.store.setFormLocale(value as PortalLocaleId);
  }

  /** Sets one adornment slot on every field. The same four choices a single field offers. */
  protected setSlotOnAllFields(slot: keyof PortalFieldDecoration, value: string): void {
    this.store.setDecorationOnAllFields({ [slot]: value as PortalSlotContent } as Partial<PortalFieldDecoration>);
  }
}
