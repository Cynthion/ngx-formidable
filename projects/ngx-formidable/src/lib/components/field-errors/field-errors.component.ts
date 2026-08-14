import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, Inject, Input } from '@angular/core';
import { AbstractControl, NgModel, NgModelGroup } from '@angular/forms';
import {
  FORMIDABLE_ERROR_EXTRACTOR,
  FORMIDABLE_ERROR_TRANSLATOR,
  FormidableErrorExtractorFn,
  FormidableErrorTranslatorFn
} from '../../models/validation.model';

/**
 * Renders the list of validation error messages for a single NgModel or NgModelGroup.
 * - Automatically tracks previous errors while control is pending.
 * - Exposes `invalid` flag once the control is touched and has errors, mirrored onto its host as
 *   `.is-invalid` and onto the surrounding decorator, which is what the state styling targets.
 * - Reads Angular's `AbstractControl.errors`, so it displays whatever wrote them — the form harness,
 *   Angular's built-in validators, or a consumer's own.
 * > Tip: provide `FORMIDABLE_ERROR_EXTRACTOR` to read a different error shape, and
 * > `FORMIDABLE_ERROR_TRANSLATOR` to globally translate the messages.
 *
 * Inputs:
 * - `@Input() ngModel?: NgModel`
 * - `@Input() ngModelGroup?: NgModelGroup`
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
  standalone: true
})
export class FieldErrorsComponent {
  @Input() ngModel?: NgModel;
  @Input() ngModelGroup?: NgModelGroup;

  private previousError?: string[];

  constructor(
    private readonly cdRef: ChangeDetectorRef,
    @Inject(FORMIDABLE_ERROR_TRANSLATOR) protected readonly translateError: FormidableErrorTranslatorFn,
    @Inject(FORMIDABLE_ERROR_EXTRACTOR) private readonly extractErrors: FormidableErrorExtractorFn
  ) {}

  get control(): AbstractControl | undefined {
    return this.ngModelGroup?.control ?? this.ngModel?.control;
  }

  get errors(): string[] | undefined {
    // A pending control has no errors yet, so keep showing the last ones instead of flickering to none.
    if (this.control?.pending) {
      return this.previousError;
    }

    this.previousError = this.extractErrors(this.control?.errors ?? null);

    return this.previousError;
  }

  @HostBinding('class.is-invalid')
  get invalid(): boolean {
    return !!this.control?.touched && !!this.errors?.length;
  }

  markForCheck(): void {
    this.cdRef.markForCheck();
  }
}
