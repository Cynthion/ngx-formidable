import { Directive, HostBinding } from '@angular/core';
import { v4 as uuid } from 'uuid';

// TODO move this back into FormFieldDirective
/**
 * Abstract directive for form (group) fields with common behaviors:
 * - Automatically generates a unique ID for the form (group) field.
 */
@Directive()
export abstract class AbstractFormFieldDirective {
  // auto-generate a unique ID for the form field
  @HostBinding('attr.id') id = `cmp-ui-form-field-${uuid()}`;
}
