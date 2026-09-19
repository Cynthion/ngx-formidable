import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { FieldOptionComponent, FORMIDABLE_OPTION } from '@cynthion/ngx-formidable';
import { HighlightedEntries } from './example-fuzzy-option.model';

@Component({
  selector: 'example-fuzzy-option',
  templateUrl: './example-fuzzy-option.component.html',
  styleUrls: ['./example-fuzzy-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  providers: [
    {
      // required to provide this component as IFormidableOption
      provide: FORMIDABLE_OPTION,
      useExisting: forwardRef(() => ExampleFuzzyOptionComponent)
    }
  ]
})
export class ExampleFuzzyOptionComponent extends FieldOptionComponent {
  readonly subtitle = input<string | undefined>('sub');

  readonly highlightedEntries = input<HighlightedEntries>({
    labelEntries: [],
    subtitleEntries: []
  });
}
