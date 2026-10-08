import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import {
  AutocompleteField,
  CheckboxGroupField,
  DateField,
  DropdownField,
  FieldDecorator,
  FieldHint,
  FieldLabel,
  FieldOption,
  InputField,
  RadioGroupField,
  SelectField,
  SliderField,
  TextareaField,
  TimeField,
  ToggleField
} from '@cynthion/ngx-formidable';
// The Studio's own custom field: import yours instead, see user/custom-fields.md
import { ExampleCounterField } from '../example-counter-field/example-counter-field';
import { initialExampleFormModel, ExampleFormModel, exampleSchema } from './example.form';

@Component({
  selector: 'app-example-form',
  templateUrl: './example-form.html',
  imports: [
    FormRoot,
    FormField,
    AutocompleteField,
    CheckboxGroupField,
    DateField,
    DropdownField,
    FieldDecorator,
    FieldHint,
    FieldLabel,
    FieldOption,
    InputField,
    RadioGroupField,
    SelectField,
    SliderField,
    TextareaField,
    TimeField,
    ToggleField,
    ExampleCounterField
  ]
})
export class ExampleForm {
  readonly model = signal<ExampleFormModel>(initialExampleFormModel);
  readonly form = form(this.model, exampleSchema);

  /** What each option of `pizza` writes into the rest of the model. */
  readonly pizzaPresets: Record<string, Partial<ExampleFormModel>> = {
    margherita: { sauce: 'tomato', toppings: ['mozzarella', 'basil'] },
    marinara: { sauce: 'tomato', toppings: [] },
    funghi: { sauce: 'tomato', toppings: ['mozzarella', 'mushrooms'] },
    diavola: { sauce: 'arrabbiata', toppings: ['mozzarella', 'salami', 'chilli'] },
    hawaii: { sauce: 'tomato', toppings: ['mozzarella', 'ham', 'pineapple'] },
    'quattro-formaggi': { sauce: 'gorgonzola', toppings: ['mozzarella'] }
  };

  applyPizzaPreset(value: string | null): void {
    if (value) this.model.update((model) => ({ ...model, ...this.pizzaPresets[value] }));
  }
}
