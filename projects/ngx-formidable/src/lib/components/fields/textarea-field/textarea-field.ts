import { Component, input, signal } from '@angular/core';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { FieldValueAlignment, FORMIDABLE_FIELD } from '../../../models/formidable.model';
import { BaseTextField } from '../base-text-field';

/**
 * A multi-line text input, optionally masked, that can grow with its content (`enableAutosize`) and show a
 * character count against `maxLength` (`showLengthIndicator`). `input-field` is the single-line one.
 *
 * Its box grows downward, so it top-aligns its value and a projected prefix follows that rather than
 * centring.
 */
@Component({
  selector: 'formidable-textarea-field',
  templateUrl: './textarea-field.html',
  styleUrls: ['./textarea-field.scss'],
  imports: [NgxMaskDirective],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: TextareaField
    },
    NgxMaskPipe
  ]
})
export class TextareaField extends BaseTextField {
  // A textarea keeps the browser's own focus behaviour — a caret, and no selection. One keystroke wiping
  // a paragraph is not what a multi-line field should offer, and no browser offers it.
  protected doOnFocusChange(): void {
    // No additional actions needed
  }

  // What the length indicator counts: the characters shown, which `maxLength` caps — a mask's included. A
  // signal, because a masked render lands in a timer no render owns.
  protected readonly valueLength = signal(0);

  protected override onTextChanged(): void {
    this.valueLength.set(this.editorValue.length);
    this.autoResize();
  }

  // A textarea top-aligns its value and grows as the value does, so a projected prefix/suffix sits on the
  // first line rather than drifting down with the box's middle.
  valueAlignment: FieldValueAlignment = 'top';

  // #region Textarea

  /** Grows the box with the content instead of scrolling it. */
  public readonly enableAutosize = input(true);

  /** Shows the character count below the value, against `maxLength` when there is one. */
  public readonly showLengthIndicator = input(false);

  // #endregion

  private autoResize(): void {
    if (!this.enableAutosize()) return;

    const el = this.editorRef().nativeElement;

    el.style.height = 'auto'; // reset height to recalculate
    el.style.height = `${el.scrollHeight}px`;
  }
}
