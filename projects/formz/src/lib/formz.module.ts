import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormFieldDropdownOptionComponent } from './components/form-field-dropdown-option/form-field-dropdown-option.component';
import { FormFieldDropdownComponent } from './components/form-field-dropdown/form-field-dropdown.component';
import { FormFieldErrorsComponent } from './components/form-field-errors/form-field-errors.component';
import { FormFieldRadioGroupOptionComponent } from './components/form-field-radio-group-option/form-field-radio-group-option.component';
import { FormFieldRadioGroupComponent } from './components/form-field-radio-group/form-field-radio-group.component';
import { FormFieldComponent } from './components/form-field/form-field.component';
import { InputFieldComponent } from './components/input-field/input-field.component';
import { FormFieldErrorsDirective } from './directives/form-field-errors.directive';
import { FormFieldLabelDirective } from './directives/form-field-label.directive';
import { FormFieldPrefixDirective } from './directives/form-field-prefix.directive';
import { FormFieldSuffixDirective } from './directives/form-field-suffix.directive';
import { FormFieldTooltipDirective } from './directives/form-field-tooltip.directive';
import { FormFieldDirective } from './directives/form-field.directive';
import { FormModelGroupDirective } from './directives/form-model-group.directive';
import { FormModelDirective } from './directives/form-model.directive';
import { FormDirective } from './directives/form.directive';
import { ValidateRootFormDirective } from './directives/validate-root-form.directive';

const components = [
  FormFieldComponent,
  // Ngx Vest Forms inspired
  FormDirective,
  FormModelDirective,
  FormModelGroupDirective,
  ValidateRootFormDirective,
  // Form Field Directives
  FormFieldDirective,
  FormFieldLabelDirective,
  FormFieldTooltipDirective,
  FormFieldPrefixDirective,
  FormFieldSuffixDirective,
  FormFieldErrorsDirective,
  // Form Field Components
  FormFieldDropdownComponent,
  FormFieldDropdownOptionComponent,
  FormFieldErrorsComponent,
  FormFieldRadioGroupComponent,
  FormFieldRadioGroupOptionComponent,
  // Field Components
  InputFieldComponent
];

@NgModule({
  declarations: [components],
  imports: [CommonModule, FormsModule],
  exports: [components, FormsModule],
  providers: []
})
export class FormzModule {}
