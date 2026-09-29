import { Component } from '@angular/core';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { FORMIDABLE_FIELD } from '../../../models/formidable.model';
import { BaseTextField } from '../base-text-field';

/**
 * A single-line text input, optionally masked — a phone number, an IBAN. `textarea-field` is the multi-line
 * one.
 *
 * `minLength` and `maxLength` are the native attributes and do not validate on their own; a rule in the
 * connected validator does that. Setting either alongside a `mask` that cannot satisfy it logs a warning.
 */
@Component({
  selector: 'formidable-input-field',
  templateUrl: './input-field.html',
  styleUrls: ['./input-field.scss'],
  imports: [NgxMaskDirective],
  providers: [
    // required to provide this component as FormidableField
    {
      provide: FORMIDABLE_FIELD,
      useExisting: InputField
    },
    NgxMaskPipe
  ]
})
export class InputField extends BaseTextField {
  protected doOnFocusChange(isFocused: boolean): void {
    if (isFocused) this.selectOnKeyboardFocus(this.editorRef().nativeElement, !!this.mask());
  }
}
