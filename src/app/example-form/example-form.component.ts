import { Component, computed, signal } from '@angular/core';
import { FormValidationOptions, IFormzFieldOption } from 'projects/formz/src/lib/form-model';
import {
  AnimalFormFieldOption,
  ExampleFormModel,
  exampleFormShape,
  exampleFormValidationSuite
} from './example-form.model';

@Component({
  selector: 'formz-example-form',
  templateUrl: './example-form.component.html',
  styleUrls: ['./example-form.component.scss']
})
export class ExampleFormComponent {
  protected readonly formValue = signal<ExampleFormModel>({
    firstName: 'Cynth¡on',
    lastName: '',
    gender: 'male',
    nationality: 'ch',
    hobby: 'gaming',
    animal: 'cat',
    religion: 'christian'
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
    { value: 'jp', label: '🇯🇵  Japan' },
    { value: 'uk (no label)', label: '' }
  ];

  protected nationalityEmptyOption: IFormzFieldOption = {
    value: 'empty',
    label: 'No nationality available.'
  };

  protected hobbyOptions: IFormzFieldOption[] = [
    { value: 'dev', label: 'Software Development' },
    { value: 'gaming (no label)', label: '' },
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

  protected animalOptionsDefault: IFormzFieldOption[] = [
    { value: 'cat', label: 'Cat' },
    { value: 'dog', label: 'Dog' }
  ];

  protected animalOptionsExtended: AnimalFormFieldOption[] = [
    { value: 'axolotl', label: 'Axolotl', subtitle: 'Mexican salamander' },
    { value: 'capybara', label: 'Capybara', subtitle: "World's largest rodent" },
    { value: 'fennec_fox', label: 'Fennec Fox', subtitle: 'Small desert fox' },
    { value: 'pangolin', label: 'Pangolin', subtitle: 'Scaly anteater' },
    { value: 'quokka', label: 'Quokka', subtitle: 'Happiest animal on Earth' },
    { value: 'slow_loris', label: 'Slow Loris', subtitle: 'Venomous primate', disabled: true },
    { value: 'tarsier', label: 'Tarsier', subtitle: 'Small primate with large eyes' },
    { value: 'kinkajou', label: 'Kinkajou', subtitle: 'Honey bear' },
    { value: 'okapi', label: 'Okapi', subtitle: 'Forest giraffe' },
    { value: 'maned_wolf', label: 'Maned Wolf', subtitle: 'Tall, long-legged canid' }
  ];

  protected animalEmptyOption: IFormzFieldOption = {
    value: 'empty',
    label: 'No animal available.'
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
