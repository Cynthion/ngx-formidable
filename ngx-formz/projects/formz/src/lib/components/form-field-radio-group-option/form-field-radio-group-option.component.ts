import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  Optional
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormFieldRadioGroupComponent } from '../form-field-radio-group/form-field-radio-group.component';

@Component({
  selector: 'cmp-ui-form-field-radio-group-option',
  templateUrl: './form-field-radio-group-option.component.html',
  styleUrls: ['./form-field-radio-group-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldRadioGroupOptionComponent implements OnInit, OnDestroy {
  @Input({ required: true }) value!: string;

  protected isChecked = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private cdRef: ChangeDetectorRef,
    @Optional() protected radioGroup: FormFieldRadioGroupComponent
  ) {}

  ngOnInit() {
    if (!this.radioGroup) {
      throw new Error('cmp-ui-form-field-radio-group-option must be inside cmp-ui-form-field-radio-group!');
    }

    // TODO move this to the c'tor?
    this.radioGroup.valueChange$.pipe(takeUntil(this.destroy$)).subscribe((val) => {
      console.log('FormFieldRadioGroupOptionComponent valueChange', val);
      this.isChecked = val === this.value;
      this.cdRef.markForCheck(); // TODO needed?
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onChange() {
    this.radioGroup.selectOption(this.value);
    console.log('FormFieldRadioGroupOptionComponent onChange', this.value);
  }

  onFocus() {
    this.radioGroup.emitFocus(true);
  }

  onBlur() {
    this.radioGroup.emitFocus(false);
  }
}
