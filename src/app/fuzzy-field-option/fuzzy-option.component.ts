import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { FieldOptionComponent, FORMZ_FIELD_OPTION } from 'formz';
import { HighlightedEntries } from '../example-form/example-form.model';

@Component({
  selector: 'fuzzy-field-option',
  templateUrl: './fuzzy-option.component.html',
  styleUrls: ['./fuzzy-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      // required to provide this component as IFormzFieldOption
      provide: FORMZ_FIELD_OPTION,
      useExisting: forwardRef(() => FuzzyFieldOptionComponent)
    }
  ]
})
export class FuzzyFieldOptionComponent extends FieldOptionComponent {
  @Input() subtitle?: string = 'sub';

  @Input() highlightedEntries?: HighlightedEntries = {
    labelEntries: [],
    subtitleEntries: []
  };
}
