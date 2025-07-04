import { ChangeDetectionStrategy, Component, forwardRef } from '@angular/core';
import { FieldOptionComponent, FORMZ_FIELD_OPTION } from 'formz';

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
  // TODO don't necessarily extend from FieldOptionComponent
}
