import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { AutocompleteFieldComponent } from './components/autocomplete-field/autocomplete-field.component';
import { CheckboxGroupFieldComponent } from './components/checkbox-group-field/checkbox-group-field.component';
import { DateFieldComponent } from './components/date-field/date-field.component';
import { DropdownFieldComponent } from './components/dropdown-field/dropdown-field.component';
import { FieldDecoratorComponent } from './components/field-decorator/field-decorator.component';
import { FieldErrorsComponent } from './components/field-errors/field-errors.component';
import { FieldOptionComponent } from './components/field-option/field-option.component';
import { InputFieldComponent } from './components/input-field/input-field.component';
import { RadioGroupFieldComponent } from './components/radio-group-field/radio-group-field.component';
import { SelectFieldComponent } from './components/select-field/select-field.component';
import { TextareaFieldComponent } from './components/textarea-field/textarea-field.component';
import { FieldErrorsDirective } from './directives/field-errors.directive';
import { FieldLabelDirective } from './directives/field-label.directive';
import { FieldPrefixDirective } from './directives/field-prefix.directive';
import { FieldSuffixDirective } from './directives/field-suffix.directive';
import { FieldTooltipDirective } from './directives/field-tooltip.directive';
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
  FieldErrorsComponent,
  FieldDecoratorComponent,
  InputFieldComponent,
  DropdownFieldComponent,
  AutocompleteFieldComponent,
  DateFieldComponent,
  FieldOptionComponent,
  SelectFieldComponent,
  TextareaFieldComponent,
  RadioGroupFieldComponent,
  CheckboxGroupFieldComponent,
  // Formz Directives
  FieldTooltipDirective,
  FieldLabelDirective,
  FieldPrefixDirective,
  FieldSuffixDirective,
  FieldErrorsDirective
];

@NgModule({
  declarations: [components],
  imports: [
    CommonModule,
    FormsModule,
    // ngx-mask
    NgxMaskDirective,
    NgxMaskPipe
  ],
  exports: [
    components,
    FormsModule,
    // ngx-mask
    NgxMaskDirective,
    NgxMaskPipe
  ],
  providers: [
    // ngx-mask
    provideNgxMask({
      validation: false
    }),
    NgxMaskPipe // TODO remove?
  ]
})
export class FormzModule {}
