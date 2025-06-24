import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldDecoratorComponent } from './components/field-decorator/field-decorator.component';
import { FormFieldErrorsComponent } from './components/form-field-errors/form-field-errors.component';
import { InputFieldComponent } from './components/input-field/input-field.component';
import { FieldAttributesDirective } from './directives/field-attributes.directive';
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
  // Ngx Vest Forms Directives
  FormDirective,
  FormModelDirective,
  FormModelGroupDirective,
  ValidateRootFormDirective,
  // Formz Components
  FieldDecoratorComponent,
  InputFieldComponent,
  // Formz Directives
  // TODO
  FormFieldDirective,
  FieldAttributesDirective,
  FormFieldLabelDirective,
  FormFieldTooltipDirective,
  FormFieldPrefixDirective,
  FormFieldSuffixDirective,
  FormFieldErrorsDirective,
  // FormFieldDropdownComponent,
  // FormFieldDropdownOptionComponent,
  FormFieldErrorsComponent
  // FormFieldRadioGroupComponent,
  // FormFieldRadioGroupOptionComponent,
];

@NgModule({
  declarations: [components],
  imports: [CommonModule, FormsModule],
  exports: [components, FormsModule],
  providers: []
})
export class FormzModule {}
