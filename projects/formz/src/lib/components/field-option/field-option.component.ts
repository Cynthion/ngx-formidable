import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Inject,
  Input,
  Optional,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { FORMZ_OPTION_FIELD, IFormzFieldOption, IFormzOptionField } from '../../form-model';

@Component({
  selector: 'formz-field-option',
  templateUrl: './field-option.component.html',
  styleUrls: ['./field-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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

  @Input() match?: (filterValue: string) => boolean = (filterValue: string) => {
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

  select() {
    this.parent.selectOption(this);
  }
}
