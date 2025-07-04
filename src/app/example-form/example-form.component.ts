import { Component, computed, signal } from '@angular/core';
import { FormValidationOptions, IFormzFieldOption } from 'projects/formz/src/lib/form-model';
import { ExampleFormModel, exampleFormShape, exampleFormValidationSuite } from './example-form.model';

@Component({
  selector: 'formz-example-form',
  templateUrl: './example-form.component.html',
  styleUrls: ['./example-form.component.scss']
})
export class ExampleFormComponent {
  protected readonly formValue = signal<ExampleFormModel>({
    firstName: 'Chris',
    lastName: '',
    gender: 'male',
    hobby: 'dev',
    nationality: 'jp',
    religion: 'buddhism'
  });
  protected readonly formShape = exampleFormShape;
  protected readonly suite = exampleFormValidationSuite;
  protected readonly validationOptions: FormValidationOptions = { debounceValidationInMs: 0 };

  protected readonly isDirty = signal<boolean | null>(null);
  protected readonly isValid = signal<boolean | null>(null);
  protected readonly errors = signal<Record<string, string>>({});

  protected genderOptions: IFormzFieldOption[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  protected nationalityOptions: IFormzFieldOption[] = [
    { value: 'de', label: '🇩🇪  Germany' },
    { value: 'fr', label: '🇫🇷  France' },
    { value: 'jp', label: '🇯🇵  Japan' }
  ];

  protected nationalityEmptyOption: IFormzFieldOption = {
    value: 'empty',
    label: 'No nationality available.'
  };

  protected hobbyOptions: IFormzFieldOption[] = [
    { value: 'dev', label: 'Software Development' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'reading', label: 'Reading' },
    { value: 'sports', label: 'Sports' },
    {
      value: 'swimming',
      label: 'Swimming',
      match: (filterValue: string) =>
        ['swimming', 'pool', 'aqua', 'dive'].some((word) => word.includes(filterValue.toLowerCase()))
    },
    { value: 'cooking', label: 'Cooking' }
  ];

  protected hobbyEmptyOption: IFormzFieldOption = {
    value: 'empty',
    label: 'No hobby available.'
  };

  protected specialMatchFn = (filterValue: string): boolean => {
    // Custom matching logic for the religion field
    return ['special', 'legend', 'epic', 'custom', 'random'].some((word) => word.includes(filterValue.toLowerCase()));
  };

  // TODO add type for vm?
  private readonly viewModel = computed(() => {
    return {
      formValue: this.formValue(),
      isDirty: this.isDirty(),
      isValid: this.isValid(),
      errors: this.errors(),

      // custom vieModel properties
      showPasswords: this.formValue().firstName,
      confirmPasswordDisabled: !this.formValue().passwords?.password
    };
  });

  protected get vm() {
    return this.viewModel();
  }

  protected setFormValue(formValue: ExampleFormModel): void {
    this.formValue.set(formValue);
  }

  protected onSubmit(): void {
    // TODO choose either formz-form-submit.sibmitClick or form.ngSubmit
    if (this.isValid()) {
      console.log(this.formValue());
    }
  }
}
