import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
// import { ButtonColor } from '../../../../../common/models/button.model';

@Component({
  selector: 'formidable-form-submit',
  templateUrl: './form-submit.component.html',
  styleUrls: ['./form-submit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormSubmitComponent {
  @Input() submitLabel?: string;
  @Input() cancelLabel?: string;

  @Input() isSubmitLoading = false;
  @Input() isSubmitDisabled = false;
  @Input() isCancelDisabled = false;

  // @Input() submitColor: ButtonColor = 'default';
  // @Input() cancelColor: ButtonColor = 'ghost';

  @Output() submitClick = new EventEmitter<void>();
  @Output() cancelClick = new EventEmitter<void>();
}
