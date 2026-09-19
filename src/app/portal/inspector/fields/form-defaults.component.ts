import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import {
  PortalFieldDecoration,
  PortalFormOptions,
  PortalLocaleId,
  PortalSlotContent
} from '../../model/field-spec.model';
import { PORTAL_LOCALES } from '../../model/locales';
import { FormDefinitionStore } from '../../state/form-definition.store';

const LABEL_POSITIONS = [
  ['outside', 'Outside'],
  ['inside', 'Inside'],
  ['inside-placeholder', 'Inside, as placeholder'],
  ['inside-floating', 'Inside, floating only'],
  ['border', 'Border'],
  ['border-prefix', 'Border, at the prefix']
] as const;

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

const SLOTS = [
  ['none', 'None'],
  ['icon', 'Icon'],
  ['text', 'Text'],
  ['button', 'Button']
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

  protected readonly labelPositions = LABEL_POSITIONS;
  protected readonly panelPositions = PANEL_POSITIONS;
  protected readonly reveals = REVEAL;
  protected readonly updateOns = UPDATE_ON;
  protected readonly validators = VALIDATORS;
  protected readonly slots = SLOTS;
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
