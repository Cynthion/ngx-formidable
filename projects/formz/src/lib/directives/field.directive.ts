import { Directive, Host } from '@angular/core';
import { FormzFieldBase } from '../form-model';

@Directive({ selector: '[formzField]' })
export class FieldDirective {
  constructor(@Host() public formzField: FormzFieldBase) {}
}
