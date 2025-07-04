import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  Optional,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { FORMZ_FIELD_OPTION, FORMZ_OPTION_FIELD, IFormzFieldOption, IFormzOptionField } from '../../form-model';

@Component({
  selector: 'formz-field-option',
  templateUrl: './field-option.component.html',
  styleUrls: ['./field-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      // required to provide this component as IFormzFieldOption
      provide: FORMZ_FIELD_OPTION,
      useExisting: forwardRef(() => FieldOptionComponent)
    }
  ]
})
export class FieldOptionComponent implements IFormzFieldOption {
  @ViewChild('contentTemplate', { static: true }) private contentTemplate!: TemplateRef<unknown>;

  @Input({ required: true }) value!: string;
  @Input() label?: string;

  @HostBinding('class.disabled')
  @Input()
  disabled = false;

  @HostBinding('class.highlighted')
  @Input()
  highlighted = false;

  @Input() select?: () => void = () => {
    // default select
    this.parent.selectOption(this);
  };

  @Input() match?: (filterValue: string) => boolean = (filterValue: string) => {
    // default match
    return this.label?.toLowerCase().includes(filterValue.toLowerCase()) ?? false;
  };

  get template(): TemplateRef<unknown> {
    return this.contentTemplate;
  }

  protected hasProjectedContent = true;

  constructor(@Optional() @Inject(FORMZ_OPTION_FIELD) private parent: IFormzOptionField) {
    if (!this.parent) {
      throw new Error(
        'formz-field-option must be used inside a component that provides FORMZ_OPTION_FIELD (i.e. implements IFormzOptionField).'
      );
    }
  }
}
