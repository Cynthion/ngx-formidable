import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgModel } from '@angular/forms';

@Component({
  selector: 'formz-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputFieldComponent {
  @Input() ngModel?: NgModel;
}
