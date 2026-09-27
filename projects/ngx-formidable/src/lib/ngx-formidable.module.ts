import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldDecorator } from './components/field-decorator/field-decorator';
import { FieldErrors } from './components/field-errors/field-errors';
import { FieldOption } from './components/field-option/field-option';
import { AutocompleteField } from './components/fields/autocomplete-field/autocomplete-field';
import { CheckboxGroupField } from './components/fields/checkbox-group-field/checkbox-group-field';
import { DateField } from './components/fields/date-field/date-field';
import { DropdownField } from './components/fields/dropdown-field/dropdown-field';
import { InputField } from './components/fields/input-field/input-field';
import { RadioGroupField } from './components/fields/radio-group-field/radio-group-field';
import { SelectField } from './components/fields/select-field/select-field';
import { SliderField } from './components/fields/slider-field/slider-field';
import { TextareaField } from './components/fields/textarea-field/textarea-field';
import { TimeField } from './components/fields/time-field/time-field';
import { ToggleField } from './components/fields/toggle-field/toggle-field';
import { FieldErrorsRenderer } from './directives/field-errors-renderer';
import { FieldHint } from './directives/field-hint';
import { FieldLabelAdornment } from './directives/field-label-adornment';
import { FieldLabel } from './directives/field-label';
import { FieldPrefix } from './directives/field-prefix';
import { FieldSuffix } from './directives/field-suffix';
import { FieldToggleIcon } from './directives/field-toggle-icon';
import { NgxFormidableGroupValidate } from './forms/group-validate.directive';
import { NgxFormidableFieldValidate } from './forms/field-validate.directive';
import { NgxFormidableWholeFormValidate } from './forms/whole-form-validate.directive';
import { NgxFormidableForm } from './forms/form.directive';
import { NgxFormidableConfig, provideNgxFormidable } from './provide-ngx-formidable';

const components = [
  // Form Directives
  NgxFormidableForm,
  NgxFormidableFieldValidate,
  NgxFormidableGroupValidate,
  NgxFormidableWholeFormValidate,
  // Field Directives
  FieldLabelAdornment,
  FieldLabel,
  FieldPrefix,
  FieldSuffix,
  FieldToggleIcon,
  FieldErrorsRenderer,
  FieldHint,
  // Field Components
  FieldErrors,
  FieldDecorator,
  InputField,
  DropdownField,
  AutocompleteField,
  DateField,
  FieldOption,
  SelectField,
  TextareaField,
  RadioGroupField,
  CheckboxGroupField,
  TimeField,
  ToggleField,
  SliderField
];

/**
 * Re-exports every component and directive, plus `FormsModule`, for an app that is not standalone. Everything
 * in it is standalone regardless, so importing the pieces directly works just as well.
 */
@NgModule({
  imports: [...components, FormsModule],
  exports: [...components, FormsModule]
})
export class NgxFormidableModule {
  /** Import this once, at the root, to register the providers. Elsewhere import the module plain. */
  static forRoot(config: NgxFormidableConfig = {}): ModuleWithProviders<NgxFormidableModule> {
    return {
      ngModule: NgxFormidableModule,
      providers: [...provideNgxFormidable(config)]
    };
  }
}
