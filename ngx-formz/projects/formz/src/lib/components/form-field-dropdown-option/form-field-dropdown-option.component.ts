import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, Optional } from '@angular/core';
import { FormFieldDropdownComponent } from '../form-field-dropdown/form-field-dropdown.component';

@Component({
  selector: 'cmp-ui-form-field-dropdown-option',
  templateUrl: './form-field-dropdown-option.component.html',
  styleUrls: ['./form-field-dropdown-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldDropdownOptionComponent implements OnInit {
  @Input({ required: true }) value!: string;

  constructor(
    @Optional() private dropdown: FormFieldDropdownComponent,
    private el: ElementRef
  ) {}

  ngOnInit() {
    if (!this.dropdown) {
      throw new Error('cmp-ui-form-field-dropdown-option must be inside cmp-ui-form-field-dropdown!');
    }
  }

  get label(): string {
    return this.el.nativeElement.innerText.trim();
  }

  select() {
    this.dropdown.selectOption(this.value, this.label);
  }
}
