import { Component, forwardRef, input } from '@angular/core';
import { FieldOption, FORMIDABLE_OPTION } from '@cynthion/ngx-formidable';
import { HighlightedEntries } from './example-fuzzy-option.model';

@Component({
  selector: 'example-fuzzy-option',
  templateUrl: './example-fuzzy-option.html',
  styleUrls: ['./example-fuzzy-option.scss'],
  imports: [],
  providers: [
    {
      // required to provide this component as FormidableOption
      provide: FORMIDABLE_OPTION,
      useExisting: forwardRef(() => ExampleFuzzyOption)
    }
  ]
})
export class ExampleFuzzyOption extends FieldOption {
  readonly subtitle = input<string | undefined>('sub');

  readonly highlightedEntries = input<HighlightedEntries>({
    labelEntries: [],
    subtitleEntries: []
  });
}
