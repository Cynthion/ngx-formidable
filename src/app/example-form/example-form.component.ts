import { Component, computed, signal } from '@angular/core';
import { FormValidationOptions } from 'projects/formz/src/lib/form-model';
import { ExampleFormModel, exampleFormShape, exampleFormValidationSuite } from './example-form.model';

@Component({
  selector: 'formz-example-form',
  templateUrl: './example-form.component.html',
  styleUrls: ['./example-form.component.scss']
})
export class ExampleFormComponent {
  protected readonly formValue = signal<ExampleFormModel>({
    firstName: 'Chris',
    gender: 'male',
    nationality: 'jp',
    religion: 'buddhism'
  });
  protected readonly formShape = exampleFormShape;
  protected readonly suite = exampleFormValidationSuite;
  protected readonly validationOptions: FormValidationOptions = { debounceValidationInMs: 0 };

  protected readonly isDirty = signal<boolean | null>(null);
  protected readonly isValid = signal<boolean | null>(null);
  protected readonly errors = signal<Record<string, string>>({});

  // TODO add type for vm?
  private readonly viewModel = computed(() => {
    return {
      formValue: this.formValue(),
      isDirty: this.isDirty(),
      isValid: this.isValid(),
      errors: this.errors(),
      isReadOnly: false,
      isDisabled: false,

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
      // TODO remove
      console.log(this.formValue());
    }
  }
}
