import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { FORMIDABLE_ICONS, FormidableIcons } from '../../models/formidable.model';

/** The library's own icons: one polyline each, on the 24-unit grid most icon sets draw on. */
const POLYLINES: Record<keyof FormidableIcons, string> = {
  fieldClear: '7 7 17 17 12 12 7 17 17 7',
  fieldOptionSelected: '5 12.5 9.5 17 19 7.5',
  fieldToggle: '4.25 7.75 12 15.5 19.75 7.75',
  fieldToggleOpen: '4.25 16.25 12 8.5 19.75 16.25',
  dateFieldToggle: '4.25 7.75 12 15.5 19.75 7.75',
  dateFieldToggleOpen: '4.25 16.25 12 8.5 19.75 16.25',
  dateFieldPanelPrevious: '16.25 4.25 8.5 12 16.25 19.75',
  dateFieldPanelNext: '7.75 4.25 15.5 12 7.75 19.75'
};

/** The provided icons an unset one falls back to, in order, before the library's own. */
const FALLBACKS: Partial<Record<keyof FormidableIcons, (keyof FormidableIcons)[]>> = {
  fieldToggleOpen: ['fieldToggle'],
  dateFieldToggle: ['fieldToggle'],
  dateFieldToggleOpen: ['dateFieldToggle', 'fieldToggleOpen', 'fieldToggle']
};

/**
 * Draws one of the library's icons: the one `FORMIDABLE_ICONS` provides under `name` or, unset, under its
 * `FALLBACKS`, else the library's own as inline SVG, which no Content Security Policy can block. Internal; a consumer replaces an icon
 * through `FORMIDABLE_ICONS` or by projecting `[formidableFieldToggleIcon]`.
 */
@Component({
  selector: 'formidable-field-icon',
  templateUrl: './field-icon.html',
  styleUrls: ['./field-icon.scss'],
  imports: [NgComponentOutlet],
  host: { 'aria-hidden': 'true' }
})
export class FieldIcon {
  private readonly icons = inject(FORMIDABLE_ICONS);

  public readonly name = input.required<keyof FormidableIcons>();

  protected readonly icon = computed(() =>
    [this.name(), ...(FALLBACKS[this.name()] ?? [])].map((name) => this.icons[name]).find((icon) => icon)
  );
  protected readonly points = computed(() => POLYLINES[this.name()]);
}
