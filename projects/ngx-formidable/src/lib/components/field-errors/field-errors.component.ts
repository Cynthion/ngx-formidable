import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { AbstractControl, NgModel, NgModelGroup } from '@angular/forms';

/**
 * Renders the list of validation error messages for a single NgModel or NgModelGroup.
 * - Automatically tracks previous errors while control is pending.
 * - Exposes `invalid` flag once the control is touched and has errors.
 *
 * Inputs:
 * - `@Input() ngModel?: NgModel`
 * - `@Input() ngModelGroup?: NgModelGroup`
 *
 * Template displays `control.errors['errors']` array.
 *
 * @example
 * ```html
 * <input name="username" ngModel required />
 * <formidable-field-errors [ngModel]="usernameModel"></formidable-field-errors>
 * ```
 */
@Component({
  selector: 'formidable-field-errors',
  templateUrl: './field-errors.component.html',
  styleUrls: ['./field-errors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class FieldErrorsComponent {
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
