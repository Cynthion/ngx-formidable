import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Inject, Input, Optional } from '@angular/core';
import { FORMZ_OPTION_FIELD, IFormzFieldOption, IFormzOptionField } from '../../form-model';

@Component({
  selector: 'formz-field-option',
  templateUrl: './field-option.component.html',
  styleUrls: ['./field-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldOptionComponent implements IFormzFieldOption {
  @Input({ required: true }) value!: string;
  @Input() label?: string;

  @HostBinding('class.disabled')
  @Input()
  disabled = false;

  @HostBinding('class.highlighted') isHighlighted = false; // TODO make Input

  constructor(
    @Optional() @Inject(FORMZ_OPTION_FIELD) private parent: IFormzOptionField,
    private el: ElementRef
  ) {
    if (!this.parent) {
      throw new Error(
        'formz-field-option must be used inside a component that provides FORMZ_OPTION_FIELD (i.e. implements IFormzOptionField).'
      );
    }
  }

  select() {
    if (this.disabled) return;

    const option: IFormzFieldOption = {
      value: this.value,
      label: this.label ?? this.innerTextAsLabel,
      disabled: this.disabled
    };

    this.parent.selectOption(option);
  }

  setHighlighted(value: boolean) {
    this.isHighlighted = value;
  }

  get innerTextAsLabel(): string {
    return this.el.nativeElement.innerText.trim();
  }
}
