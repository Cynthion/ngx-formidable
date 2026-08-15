import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  Inject,
  inject,
  Input
} from '@angular/core';
import { AbstractControl, NgForm, NgModel, NgModelGroup } from '@angular/forms';
import { NgxFormidableFormDirective } from '../../forms/form.directive';
import {
  FORMIDABLE_ERROR_EXTRACTOR,
  FORMIDABLE_ERROR_TRANSLATOR,
  FormidableErrorExtractorFn,
  FormidableErrorTranslatorFn,
  FormidableReveal
} from '../../models/validation.model';

/**
 * Renders the list of validation error messages for a single NgModel or NgModelGroup.
 * - Automatically tracks previous errors while control is pending.
 * - Exposes `invalid` flag once the control has errors and `revealOn` says they may be shown, mirrored onto
 *   its host as `.is-invalid` and onto the surrounding decorator, which is what the state styling targets.
 * - Reads Angular's `AbstractControl.errors`, so it displays whatever wrote them — the form harness,
 *   Angular's built-in validators, or a consumer's own.
 * > Tip: provide `FORMIDABLE_ERROR_EXTRACTOR` to read a different error shape, and
 * > `FORMIDABLE_ERROR_TRANSLATOR` to globally translate the messages.
 *
 * Inputs:
 * - `@Input() ngModel?: NgModel`
 * - `@Input() ngModelGroup?: NgModelGroup`
 * - `@Input() revealOn?: FormidableReveal`
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

  /** This field's own reveal setting, which beats the form's. Pushed by `FieldErrorsDirective`. */
  @Input() revealOn?: FormidableReveal;

  // Optional: messages render for any validator, and for none — neither the harness nor a form is required.
  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true });
  private readonly ngForm = inject(NgForm, { optional: true });

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

  /** This field's setting first, then the form's, then the default. */
  private get reveal(): FormidableReveal {
    return this.revealOn ?? this.formDirective?.revealOn() ?? 'touched';
  }

  @HostBinding('class.is-invalid')
  get invalid(): boolean {
    if (!this.errors?.length) return false;

    switch (this.reveal) {
      case 'always':
        return true;
      case 'dirty':
        return !!this.control?.dirty;
      case 'submitted':
        return !!this.ngForm?.submitted;
      default:
        return !!this.control?.touched;
    }
  }

  markForCheck(): void {
    this.cdRef.markForCheck();
  }
}
