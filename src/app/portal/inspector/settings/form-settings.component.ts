import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SelectedValueDirective } from '../../chrome/selected-value.directive';
import { PortalFormOptions, PortalLocaleId } from '../../model/field-spec.model';
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
 * What the form owns rather than a field: the master switches every field obeys, and the validation.
 *
 * These are settings with nowhere else to live — a field has no copy of them to override, which is what
 * separates them from the decoration on the `All Fields` scope beside this one.
 *
 * Run and reveal are two axes, not one setting: run is Angular's `updateOn` and decides when the validator
 * runs, reveal is the library's `revealOn` and decides when the messages appear.
 */
@Component({
  selector: 'portal-form-settings',
  templateUrl: './form-settings.component.html',
  styleUrl: './form-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectedValueDirective]
})
export class FormSettingsComponent {
  protected readonly store = inject(FormDefinitionStore);

  protected readonly panelPositions = PANEL_POSITIONS;
  protected readonly reveals = REVEAL;
  protected readonly updateOns = UPDATE_ON;
  protected readonly validators = VALIDATORS;
  protected readonly locales = PORTAL_LOCALES;

  protected set<K extends keyof PortalFormOptions>(key: K, value: PortalFormOptions[K]): void {
    this.store.updateOptions({ [key]: value } as Partial<PortalFormOptions>);
  }

  protected setLocale(value: string): void {
    this.store.setFormLocale(value as PortalLocaleId);
  }
}
