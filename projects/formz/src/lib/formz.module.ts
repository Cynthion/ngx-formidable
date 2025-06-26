import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldDecoratorComponent } from './components/field-decorator/field-decorator.component';
import { FormFieldErrorsComponent } from './components/form-field-errors/form-field-errors.component';
import { InputFieldComponent } from './components/input-field/input-field.component';
import { SelectFieldComponent } from './components/select-field/select-field.component';
import { TextareaFieldComponent } from './components/textarea-field/textarea-field.component';
import { FieldErrorsDirective } from './directives/field-errors.directive';
import { FieldLabelDirective } from './directives/field-label.directive';
import { FieldPrefixDirective } from './directives/field-prefix.directive';
import { FieldSuffixDirective } from './directives/field-suffix.directive';
import { FieldTooltipDirective } from './directives/field-tooltip.directive';
import { FieldDirective } from './directives/field.directive';
import { FormModelGroupDirective } from './directives/form-model-group.directive';
import { FormModelDirective } from './directives/form-model.directive';
import { FormRootValidateDirective } from './directives/form-root-validate.directive';
import { FormDirective } from './directives/form.directive';

const components = [
  // Ngx Vest Forms Directives
  FormDirective,
  FormModelDirective,
  FormModelGroupDirective,
  FormRootValidateDirective,
  // Formz Components
  FormFieldErrorsComponent,
  FieldDecoratorComponent,
  InputFieldComponent,
  SelectFieldComponent,
  TextareaFieldComponent,
  // Formz Directives
  FieldDirective,
  FieldTooltipDirective,
  FieldLabelDirective,
  FieldPrefixDirective,
  FieldSuffixDirective,
  FieldErrorsDirective
  // TODO
  // FormFieldDropdownComponent,
  // FormFieldDropdownOptionComponent,
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
