import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { AbstractControl, NgModel, NgModelGroup } from '@angular/forms';

@Component({
  selector: 'cmp-ui-form-field-errors',
  templateUrl: './form-field-errors.component.html',
  styleUrls: ['./form-field-errors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldErrorsComponent {
  @Input() ngModel?: NgModel;
  @Input() ngModelGroup?: NgModelGroup;

  private previousError?: string[];

  constructor(private readonly cdRef: ChangeDetectorRef) {}

  get control(): AbstractControl | undefined {
    return this.ngModelGroup?.control ?? this.ngModel?.control;
  }

  get errors(): string[] | undefined {
    if (this.control?.pending) {
      return this.previousError;
    } else {
      this.previousError = this.control?.errors?.['errors'];
    }

    return this.control?.errors?.['errors'];
  }

  get invalid(): boolean {
    return !!this.control?.touched && !!this.errors?.length;
  }

  markForCheck(): void {
    this.cdRef.markForCheck();
  }

  trackError(_index: number, error: string): string {
    return error;
  }
}
