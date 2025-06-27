import { ChangeDetectionStrategy, Component, ElementRef, Input, Optional } from '@angular/core';
import { IFormzFieldOption } from '../../form-model';
import { DropdownFieldComponent } from '../dropdown-field/dropdown-field.component';

@Component({
  selector: 'formz-field-option',
  templateUrl: './field-option.component.html',
  styleUrls: ['./field-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldOptionComponent implements IFormzFieldOption {
  @Input({ required: true }) value!: string;
  @Input() label?: string = undefined;

  constructor(
    @Optional() private dropdownField: DropdownFieldComponent,
    private el: ElementRef
  ) {}

  select() {
    if (!this.dropdownField) {
      throw new Error('formz-dropdown-option has no valid parent.');
    }
    this.dropdownField.selectOption(this.value, this.label ?? this.el.nativeElement.innerText.trim());
  }
}
