import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toHex } from '../../helpers/color.helpers';
import { ThemeStore } from '../../state/theme.store';

const BRAND = '--formidable-color-field-border-focus';
const RESTING_ACCENT = '--formidable-color-field-label-floating';

/**
 * Step 1: one variable. It carries the focus border, the focused label, the focused underline and both focus
 * rings, so setting it is the whole of "match my brand".
 */
@Component({
  selector: 'portal-brand-step',
  templateUrl: './brand-step.component.html',
  styleUrl: './brand-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandStepComponent {
  protected readonly theme = inject(ThemeStore);

  protected readonly brandHex = computed(() => {
    const resolved = this.theme.resolveColorValue(this.theme.valueOf(BRAND));

    return resolved ? toHex(resolved) : '#000000';
  });

  protected readonly accentsRestingLabels = computed(
    () => this.theme.valueOf(RESTING_ACCENT).trim().toLowerCase() === this.theme.valueOf(BRAND).trim().toLowerCase()
  );

  protected setBrand(value: string): void {
    const alsoAccent = this.accentsRestingLabels();

    this.theme.setVariable(BRAND, value);
    if (alsoAccent) this.theme.setVariable(RESTING_ACCENT, value);
  }

  protected setAccentsRestingLabels(on: boolean): void {
    if (on) {
      this.theme.setVariable(RESTING_ACCENT, this.theme.valueOf(BRAND));
    } else {
      this.theme.clearVariable(RESTING_ACCENT);
    }
  }
}
