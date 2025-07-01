import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, Optional } from '@angular/core';
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

  @HostBinding('class.disabled')
  @Input()
  disabled = false;

  @HostBinding('class.highlighted') isHighlighted = false;

  constructor(
    @Optional() private dropdownField: DropdownFieldComponent,
    private el: ElementRef
  ) {}

  select() {
    if (this.disabled) return;

    if (!this.dropdownField) {
      throw new Error('formz-dropdown-option has no valid parent.');
    }

    const option: IFormzFieldOption = {
      value: this.value,
      label: this.label ?? this.innerTextAsLabel,
      disabled: this.disabled
    };

    this.dropdownField.selectOption(option);
  }

  setHighlighted(value: boolean) {
    this.isHighlighted = value;
  }

  get innerTextAsLabel(): string {
    return this.el.nativeElement.innerText.trim();
  }
}
