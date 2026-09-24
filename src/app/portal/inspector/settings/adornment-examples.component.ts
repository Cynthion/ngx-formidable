import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SelectedValueDirective } from '../../chrome/selected-value.directive';
import { PortalFieldDecoration, SLOT_LABELS } from '../../model/field-spec.model';
import { FormDefinitionStore } from '../../state/form-definition.store';

/** What one control sets, and what it offers. */
interface BulkControl {
  readonly id: string;
  readonly label: string;
  readonly key: 'labelAdornment' | 'prefix' | 'suffix';
}

/** The three projection slots every field has, each filled with the same kind of sample content. */
const CONTROLS: readonly BulkControl[] = [
  { id: 'label-adornment', label: 'Label Adornment', key: 'labelAdornment' },
  { id: 'prefix', label: 'Prefix', key: 'prefix' },
  { id: 'suffix', label: 'Suffix', key: 'suffix' }
];

/** One control's answer: what most fields say, and how many do not say it. */
interface BulkState {
  readonly value: string;
  readonly overrides: number;
}

/**
 * Sample adornments, set on every field at once.
 *
 * An adornment is content the consumer projects per field, so no app default can supply one and these are
 * not in the App Config. They fill the slots so a theme can be judged with them, and the template export
 * writes a placeholder where the consumer's own content goes.
 *
 * There is no value here of its own to show — each control reads its answer back off the fields. It states
 * what most of them carry, says how many override it, and offers to reassert it over all of them. Nothing is
 * stored, so nothing can go stale against the fields it describes.
 */
@Component({
  selector: 'portal-adornment-examples',
  templateUrl: './adornment-examples.component.html',
  styleUrl: './adornment-examples.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectedValueDirective]
})
export class AdornmentExamplesComponent {
  private readonly store = inject(FormDefinitionStore);

  protected readonly controls = CONTROLS;
  protected readonly choices = Object.entries(SLOT_LABELS);
  protected readonly total = computed(() => this.store.fields().length);

  /** What most fields carry for one control, and how many disagree. Ties fall to the first field's value. */
  protected stateOf(control: BulkControl): BulkState {
    const fields = this.store.fields();
    const tally = new Map<string, number>();

    for (const field of fields) {
      const value = field.decoration[control.key];

      tally.set(value, (tally.get(value) ?? 0) + 1);
    }

    let value = '';
    let agreeing = 0;

    for (const [candidate, count] of tally) {
      if (count > agreeing) {
        value = candidate;
        agreeing = count;
      }
    }

    return { value, overrides: fields.length - agreeing };
  }

  protected apply(control: BulkControl, value: string): void {
    this.store.setDecorationOnAllFields({ [control.key]: value } as Partial<PortalFieldDecoration>);
  }
}
