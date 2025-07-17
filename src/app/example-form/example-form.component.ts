import { Component, computed, signal } from '@angular/core';
import Fuse, { FuseResult } from 'fuse.js';
import { FormValidationOptions, IFormzFieldOption } from 'projects/formz/src/lib/formz.model';
import { map, Observable, startWith, Subject } from 'rxjs';
import {
  AnimalFormFieldOption,
  ExampleFormModel,
  exampleFormShape,
  exampleFormValidationSuite,
  HighlightedEntries
} from './example-form.model';

@Component({
  selector: 'formz-example-form',
  templateUrl: './example-form.component.html',
  styleUrls: ['./example-form.component.scss']
})
export class ExampleFormComponent {
  protected readonly formValue = signal<ExampleFormModel>({
    firstName: 'Cynthion',
    lastName: '',
    gender: 'male',
    nationality: 'ch',
    hobby: 'reading',
    animal: 'cat',
    birthdate: '1989-06-29',
    religion: 'agnostic',
    allergies: ['dust', 'lactose']
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
    // { value: 'dev', label: 'Software Development' },
    // { value: 'gaming (no label)', label: '' },
    // { value: 'reading', label: 'Reading' },
    // { value: 'sports', label: 'Sports' },
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

  protected animalOptionsForFiltering: AnimalFormFieldOption[] = [
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

  protected religionOptions: IFormzFieldOption[] = [
    { value: 'christian', label: 'Christianity' },
    { value: 'hindu', label: 'Hinduism' },
    { value: 'buddhist', label: 'Buddhism' }
  ];

  protected religionEmptyOption: IFormzFieldOption = {
    value: 'empty',
    label: 'No religion available.'
  };

  protected allergiesOptions: IFormzFieldOption[] = [
    { value: 'pollen', label: 'Pollen' },
    { value: 'dust', label: 'Dust' },
    { value: 'peanuts', label: 'Peanuts' },
    { value: 'shellfish', label: 'Shellfish' }
  ];

  protected allergiesEmptyOption: IFormzFieldOption = {
    value: 'empty',
    label: 'No allergies available.'
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

  protected onValueChanged(_fieldName: string, _value: string | string[]): void {
    console.log(`Value changed on ${_fieldName} field:`, _value);
  }

  protected onFocusChanged(_fieldName: string, _isFocused: boolean): void {
    // console.log(`Focus changed on ${_fieldName} field:`, _isFocused);
  }

  protected onSubmit(): void {
    // TODO choose either formz-form-submit.sibmitClick or form.ngSubmit
    if (this.isValid()) {
      console.log(this.formValue());
    }
  }

  private readonly fuseIndex = new Fuse(this.animalOptionsForFiltering, {
    keys: [
      { name: 'label', weight: 0.8 },
      { name: 'subtitle', weight: 0.2 }
    ],
    threshold: 0.17,
    includeMatches: true,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 3
  });

  private readonly animalFilter$ = new Subject<string>();

  protected onAnimalFilterChange(filterValue: string): void {
    this.animalFilter$.next(filterValue);
  }

  protected animalOptionsFiltered$: Observable<AnimalFormFieldOption[]> = this.animalFilter$.pipe(
    map((filterValue) => {
      const trimmed = filterValue.trim().toLowerCase();
      if (!trimmed) return this.animalOptionsForFiltering;

      const results = this.fuseIndex.search(trimmed);

      const sorted = results.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

      const enriched = sorted.map((result: FuseResult<AnimalFormFieldOption>) => ({
        ...result.item,
        highlightedEntries: this.extractHighlights(result)
      }));

      return enriched;
    }),
    startWith(this.animalOptionsForFiltering)
  );

  private extractHighlights<T>(
    fuseResult: FuseResult<T>,
    fields: (keyof HighlightedEntries)[] = ['labelEntries', 'subtitleEntries']
  ): HighlightedEntries {
    const highlights: HighlightedEntries = {
      labelEntries: [],
      subtitleEntries: []
    };

    if (!fuseResult.matches) return highlights;

    for (const match of fuseResult.matches) {
      const key = match.key;
      const value = String(match.value);
      const indices = match.indices;

      // Map match.key ("label" or "subtitle") → entries key
      const targetKey = key === 'label' ? 'labelEntries' : key === 'subtitle' ? 'subtitleEntries' : null;

      if (!targetKey || !fields.includes(targetKey as keyof HighlightedEntries)) continue;

      let lastIndex = 0;
      for (const [start, end] of indices) {
        // Push unhighlighted segment
        if (start > lastIndex) {
          highlights[targetKey].push({
            text: value.slice(lastIndex, start),
            isHighlighted: false
          });
        }

        // Push highlighted segment
        highlights[targetKey].push({
          text: value.slice(start, end + 1),
          isHighlighted: true
        });

        lastIndex = end + 1;
      }

      // Push the remaining unhighlighted segment
      if (lastIndex < value.length) {
        highlights[targetKey].push({
          text: value.slice(lastIndex),
          isHighlighted: false
        });
      }
    }

    return highlights;
  }
}
