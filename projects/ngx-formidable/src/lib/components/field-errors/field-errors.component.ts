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
 * Renders the validation messages for one control. Reach for `formidableFieldErrors` instead — it places
 * this component for you, in the right spot. Place it by hand only to put the messages somewhere else.
 *
 * The messages are whatever wrote the control's errors: the connected validator, Angular's own validators,
 * or nothing at all. Provide `FORMIDABLE_ERROR_EXTRACTOR` to read a different error shape, and
 * `FORMIDABLE_ERROR_TRANSLATOR` to run every message through a translation of your own.
 */
@Component({
  selector: 'formidable-field-errors',
  templateUrl: './field-errors.component.html',
  styleUrls: ['./field-errors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class FieldErrorsComponent {
  /** The control to report on. Exactly one of this and `ngModelGroup` is set. */
  @Input() ngModel?: NgModel;

  /** The group to report on, for a rule whose target is the group rather than a field inside it. */
  @Input() ngModelGroup?: NgModelGroup;

  /** When the messages appear for this control. Overrides whatever the form set. */
  @Input() revealOn?: FormidableReveal;

  // Optional: messages render for any validator, and for none — neither the form directive nor a form is required.
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

  // This field's setting first, then the form's, then the default.
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
