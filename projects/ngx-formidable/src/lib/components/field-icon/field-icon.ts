import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { FORMIDABLE_ICONS, FormidableIcons } from '../../models/formidable.model';

/** The library's own icons: one chevron each, on the 24-unit grid most icon sets draw on. */
const CHEVRONS: Record<keyof FormidableIcons, string> = {
  fieldToggle: '4.25 7.75 12 15.5 19.75 7.75',
  fieldToggleOpen: '4.25 16.25 12 8.5 19.75 16.25',
  dateFieldPanelPrevious: '16.25 4.25 8.5 12 16.25 19.75',
  dateFieldPanelNext: '7.75 4.25 15.5 12 7.75 19.75'
};

/**
 * Draws one of the library's icons: the one `FORMIDABLE_ICONS` provides under `name`, else the library's
 * chevron as inline SVG, which no Content Security Policy can block. Internal; a consumer replaces an icon
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
    this.name() === 'fieldToggleOpen' ? (this.icons.fieldToggleOpen ?? this.icons.fieldToggle) : this.icons[this.name()]
  );
  protected readonly points = computed(() => CHEVRONS[this.name()]);
}
