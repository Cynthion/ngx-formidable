import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { FieldOptionComponent, FORMIDABLE_OPTION } from '@cynthion/ngx-formidable';
import { HighlightedEntries } from '../example-form/example-form.model';

@Component({
  selector: 'example-fuzzy-option',
  templateUrl: './example-fuzzy-option.component.html',
  styleUrls: ['./example-fuzzy-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      // required to provide this component as IFormidableOption
      provide: FORMIDABLE_OPTION,
      useExisting: forwardRef(() => ExampleFuzzyOptionComponent)
    }
  ]
})
export class ExampleFuzzyOptionComponent extends FieldOptionComponent {
  @Input() subtitle?: string = 'sub';

  @Input() highlightedEntries?: HighlightedEntries = {
    labelEntries: [],
    subtitleEntries: []
  };
}
