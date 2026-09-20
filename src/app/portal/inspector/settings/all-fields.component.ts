import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SelectedValueDirective } from '../../chrome/selected-value.directive';
import {
  LABEL_POSITION_LABELS,
  PortalFieldDecoration,
  PortalFieldSpec,
  SLOT_LABELS
} from '../../model/field-spec.model';
import { FormDefinitionStore } from '../../state/form-definition.store';

/** What one form-scope control sets, and what it offers. */
interface BulkControl {
  readonly id: string;
  readonly label: string;
  /** The decoration keys it writes. `Adornment Align` moves the prefix and the suffix together. */
  readonly keys: readonly (keyof PortalFieldDecoration)[];
  readonly choices: readonly (readonly [string, string])[];
  readonly help?: string;
}

const ALIGNMENTS = [
  ['center', 'Centre Of The Box'],
  ['value', 'The Value']
] as const;

/** What every field carries a copy of, and can therefore be set on all of them at once. */
const CONTROLS: readonly BulkControl[] = [
  {
    id: 'label-position',
    label: 'Label Position',
    keys: ['labelPosition'],
    choices: Object.entries(LABEL_POSITION_LABELS),
    help: 'Honoured only by the horizontal layout. A group, a toggle and a slider always label outside.'
  },
  { id: 'label-adornment', label: 'Label Adornment', keys: ['labelAdornment'], choices: Object.entries(SLOT_LABELS) },
  { id: 'prefix', label: 'Prefix', keys: ['prefix'], choices: Object.entries(SLOT_LABELS) },
  { id: 'suffix', label: 'Suffix', keys: ['suffix'], choices: Object.entries(SLOT_LABELS) },
  { id: 'adornment-align', label: 'Adornment Align', keys: ['prefixAlign', 'suffixAlign'], choices: ALIGNMENTS }
];

/** One control's answer: what most fields say, and how many do not say it. */
interface BulkState {
  readonly value: string;
  readonly overrides: number;
}

/**
 * Decoration, set on every field at once.
 *
 * Decoration belongs to a field, so there is no form-level value here to show — each control reads its own
 * answer back off the fields. It states what most of them carry, says how many override it, and offers to
 * reassert it over all of them. Nothing is stored, so nothing can go stale against the fields it describes.
 */
@Component({
  selector: 'portal-all-fields',
  templateUrl: './all-fields.component.html',
  styleUrl: './all-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectedValueDirective]
})
export class AllFieldsComponent {
  private readonly store = inject(FormDefinitionStore);

  protected readonly controls = CONTROLS;
  protected readonly total = computed(() => this.store.fields().length);

  /** What most fields carry for one control, and how many disagree. Ties fall to the first field's value. */
  protected stateOf(control: BulkControl): BulkState {
    const fields = this.store.fields();
    const tally = new Map<string, number>();

    for (const field of fields) {
      const value = this.valueOf(field, control.keys);

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
    const patch = Object.fromEntries(control.keys.map((key) => [key, value]));

    this.store.setDecorationOnAllFields(patch as Partial<PortalFieldDecoration>);
  }

  /** A field's answer for one control, or `''` where the control's own keys disagree on that field. */
  private valueOf(field: PortalFieldSpec, keys: readonly (keyof PortalFieldDecoration)[]): string {
    const first = String(field.decoration[keys[0]!]);

    return keys.every((key) => String(field.decoration[key]) === first) ? first : '';
  }
}
