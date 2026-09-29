import { Component, ElementRef, input, viewChild } from '@angular/core';
import { NgxMaskDirective } from 'ngx-mask';
import { normalizeDatePart, UNICODE_TIME_TOKENS } from '../../../helpers/format.helpers';
import { FORMIDABLE_FIELD } from '../../../models/formidable.model';
import { BaseDateTimeField } from '../base-date-time-field';

/**
 * A time of day, typed into a mask derived from `unicodeTokenFormat` or stepped with the arrow keys on the
 * segment under the caret. No panel — the mask and the arrows are the whole interface.
 *
 * The value is a full `Date` whose date part is normalized away, so only the time carries meaning. Typing
 * commits on blur; clearing the field and the arrows commit at once. `date-field` is the same interface for
 * a date, with a calendar panel added.
 */
@Component({
  selector: 'formidable-time-field',
  templateUrl: './time-field.html',
  styleUrls: ['./time-field.scss'],
  imports: [NgxMaskDirective],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: TimeField
    }
  ]
})
export class TimeField extends BaseDateTimeField {
  readonly timeRef = viewChild.required<ElementRef<HTMLDivElement>>('timeRef');

  protected keyboardCallback = (event: KeyboardEvent) => this.handleKeydown(event);
  protected registeredKeys = ['Enter', 'ArrowUp', 'ArrowDown'];

  protected readonly defaultUnicodeTokenFormat = 'HH.mm';
  protected readonly unicodeTokens = UNICODE_TIME_TOKENS;

  private handleKeydown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'Enter':
        this.commitText();
        return true;
      case 'ArrowUp':
        this.stepSegment(1);
        return true;
      case 'ArrowDown':
        this.stepSegment(-1);
        return true;
      default:
        return false;
    }
  }

  protected normalize(value: Date): Date {
    return normalizeDatePart(value);
  }

  protected stepSeed(): Date {
    return new Date(1970, 0, 1);
  }

  protected select(value: Date | null): void {
    this.selectTime(value);
  }

  // #region FormidableField

  get fieldRef(): ElementRef<HTMLElement> {
    return this.timeRef() as ElementRef<HTMLElement>;
  }

  // #endregion

  // #region Time Field

  /**
   * A Unicode time format (`H`, `h`, `m`, `s`, `a` tokens). Decides the mask, the display, and which segment
   * the arrow keys step. An unrecognized format warns and falls back to the default.
   */
  public readonly unicodeTokenFormat = input(this.defaultUnicodeTokenFormat);

  /** Commits a time as the user's pick, as the arrow keys do. The same time of day is no change. */
  public selectTime(time: Date | null): void {
    if (this.isSameValue(this.value(), time)) return;

    this.setValue(time ? this.normalize(time) : null);
    this.touch.emit();
  }

  // #endregion
}
