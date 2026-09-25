import { ChangeDetectionStrategy, Component, computed, HostBinding, inject, input, signal } from '@angular/core';
import { AbstractControl, NgForm, NgModel, NgModelGroup } from '@angular/forms';
import { NgxFormidableFormDirective } from '../../forms/form.directive';
import { FORMIDABLE_DEFAULTS } from '../../models/formidable.model';
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
  protected readonly translateError = inject<FormidableErrorTranslatorFn>(FORMIDABLE_ERROR_TRANSLATOR);
  private readonly extractErrors = inject<FormidableErrorExtractorFn>(FORMIDABLE_ERROR_EXTRACTOR);

  /** The control to report on. Exactly one of this and `ngModelGroup` is set. */
  public readonly ngModel = input<NgModel | undefined>(undefined);

  /** The group to report on, for a rule whose target is the group rather than a field inside it. */
  public readonly ngModelGroup = input<NgModelGroup | undefined>(undefined);

  /** When the messages appear for this control. Overrides whatever the form set. */
  public readonly revealOn = input<FormidableReveal | undefined>(undefined);

  // Optional: messages render for any validator, and for none — neither the form directive nor a form is required.
  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true });
  private readonly ngForm = inject(NgForm, { optional: true });
  private readonly defaultRevealOn = inject(FORMIDABLE_DEFAULTS).revealOn ?? 'touched';

  private previousError?: string[];

  // Angular's form state is not signal-backed — `AbstractControl.errors`, `touched`, `dirty` and
  // `NgForm.submitted` are all plain — so nothing below can track it. `FieldErrorsDirective` knows when it
  // moved and bumps this; everything derived recomputes off it, and the views that read them repaint.
  private readonly revision = signal(0);

  get control(): AbstractControl | undefined {
    return this.ngModelGroup()?.control ?? this.ngModel()?.control;
  }

  readonly errors = computed<string[] | undefined>(() => {
    this.revision();

    // A pending control has no errors yet, so keep showing the last ones instead of flickering to none.
    if (this.control?.pending) {
      return this.previousError;
    }

    this.previousError = this.extractErrors(this.control?.errors ?? null);

    return this.previousError;
  });

  // This field's setting first, then the form's, then the app default.
  private get reveal(): FormidableReveal {
    return this.revealOn() ?? this.formDirective?.revealOn() ?? this.defaultRevealOn;
  }

  readonly invalid = computed(() => {
    // Reads the revision itself, and not only `errors()`: whether a control is touched, dirty or submitted
    // moves without its errors moving, and `errors()` is reference-equal across such a change.
    this.revision();

    if (!this.errors()?.length) return false;

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
  });

  @HostBinding('class.is-invalid')
  protected get isInvalid(): boolean {
    return this.invalid();
  }

  /** Re-reads the control. Called by `FieldErrorsDirective` whenever Angular's own form state has moved. */
  refresh(): void {
    this.revision.update((revision) => revision + 1);
  }
}
