import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Optional } from '@angular/core';
import { DropdownFieldComponent } from '../dropdown-field/dropdown-field.component';

@Component({
  selector: 'formz-dropdown-option',
  templateUrl: './dropdown-option.component.html',
  styleUrls: ['./dropdown-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropdownOptionComponent implements OnInit {
  @Input({ required: true }) value!: string;

  constructor(
    @Optional() private dropdownField: DropdownFieldComponent,
    private el: ElementRef
  ) {}

  ngOnInit() {
    if (!this.dropdownField) {
      throw new Error('formz-dropdown-option must be inside formz-dropdown-field!');
    }
  }

  get label(): string {
    return this.el.nativeElement.innerText.trim();
  }

  select() {
    this.dropdownField.selectOption(this.value, this.label);
  }
}
