import { Component, computed, inject } from '@angular/core';
import { SelectedValue } from '../../chrome/selected-value';
import {
  LIBRARY_DEFAULTS,
  PortalDebounce,
  PortalFormOptions,
  PortalLocaleId,
  REVEAL_LABELS
} from '../../model/field-spec.model';
import { PORTAL_LOCALES } from '../../model/locales';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { AdornmentExamples } from './adornment-examples';

const DEBOUNCES = [
  ['0', 'Every Change'],
  ['300', 'A 300 ms Pause'],
  ['blur', 'Blur']
] as const;

const VALIDATORS = [
  ['angular', "Angular's built-in rules"],
  ['vest', 'Vest suite'],
  ['zod', 'Zod schema'],
  ['none', 'None']
] as const;

/**
 * What the form owns rather than a field: the master switches every field obeys, and the validation.
 *
 * These are settings with nowhere else to live — a field has no copy of them to override. Two of them are
 * inputs the app default covers as well, so each offers to state nothing and follow it.
 *
 * The adornment examples are here rather than among the app defaults because projected content is markup,
 * which no default can supply — they sit under the master switch that already shows or hides them.
 *
 * Debounce and reveal are two axes, not one setting: the debounce is Signal Forms' and decides when an edit
 * reaches the model and the rules run, reveal is the library's `revealOn` and decides when the messages appear.
 */
@Component({
  selector: 'portal-form-settings',
  templateUrl: './form-settings.html',
  styleUrl: './form-settings.scss',
  imports: [SelectedValue, AdornmentExamples]
})
export class FormSettings {
  protected readonly store = inject(FormDefinitionStore);

  protected readonly reveals = Object.entries(REVEAL_LABELS);
  protected readonly debounces = DEBOUNCES;
  protected readonly validators = VALIDATORS;
  protected readonly locales = PORTAL_LOCALES;

  /** What the form falls back to while it states nothing: the app default, then the library's own. */
  protected readonly defaultReveal = computed(
    () => REVEAL_LABELS[this.store.appDefaults().revealOn ?? LIBRARY_DEFAULTS.revealOn]
  );
  protected readonly defaultMarkers = computed(() =>
    (this.store.appDefaults().hideRequiredMarkers ?? LIBRARY_DEFAULTS.hideRequiredMarkers) ? 'Hidden' : 'Shown'
  );

  /** A select's value for an optional option, `''` standing for "state nothing". */
  protected stated(value: unknown): string {
    return value === undefined ? '' : String(value);
  }

  protected setDebounce(raw: string): void {
    this.set('debounce', (raw === 'blur' ? raw : Number(raw)) as PortalDebounce);
  }

  protected setRevealOn(raw: string): void {
    this.set('revealOn', raw ? (raw as PortalFormOptions['revealOn']) : undefined);
  }

  protected setRequiredMarkers(raw: string): void {
    this.set('hideRequiredMarkers', raw ? raw === 'true' : undefined);
  }

  protected set<K extends keyof PortalFormOptions>(key: K, value: PortalFormOptions[K]): void {
    this.store.updateOptions({ [key]: value } as Partial<PortalFormOptions>);
  }

  protected setLocale(value: string): void {
    this.store.setFormLocale(value as PortalLocaleId);
  }
}
