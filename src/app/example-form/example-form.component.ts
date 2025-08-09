import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Fuse, { FuseResult } from 'fuse.js';
import {
  AutocompleteFieldComponent,
  CheckboxGroupFieldComponent,
  DateFieldComponent,
  DropdownFieldComponent,
  FieldDecoratorComponent,
  FieldErrorsDirective,
  FieldLabelDirective,
  FieldOptionComponent,
  FieldPrefixDirective,
  FieldSuffixDirective,
  FieldTooltipDirective,
  FormDirective,
  FormModelDirective,
  FormRootValidateDirective,
  FormValidationOptions,
  IFormidableFieldOption,
  InputFieldComponent,
  RadioGroupFieldComponent,
  SelectFieldComponent,
  TextareaFieldComponent,
  TimeFieldComponent
} from 'ngx-formidable';
import { BehaviorSubject, combineLatest, map, Observable, startWith, Subject } from 'rxjs';
import { StaticSuite } from 'vest';
import { ExampleFuzzyOptionComponent } from '../example-fuzzy-option/example-fuzzy-option.component';
import { ExampleTooltipComponent } from '../example-tooltip/example-tooltip.component';
import {
  AnimalFormFieldOption,
  exampleFormFrame,
  ExampleFormModel,
  exampleFormValidationSuite,
  HighlightedEntries
} from './example-form.model';

@Component({
  selector: 'example-form',
  templateUrl: './example-form.component.html',
  styleUrls: ['./example-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    TimeFieldComponent,
    FormDirective,
    FormModelDirective,
    // FormModelGroupDirective,
    FormRootValidateDirective,
    FieldTooltipDirective,
    FieldLabelDirective,
    FieldPrefixDirective,
    FieldSuffixDirective,
    FieldErrorsDirective,
    // Example
    ExampleTooltipComponent,
    ExampleFuzzyOptionComponent
  ]
})
export class ExampleFormComponent {
  constructor(
    @Inject(DOCUMENT) private doc: Document,
    private cdRef: ChangeDetectorRef
  ) {}

  protected readonly formValue$ = new BehaviorSubject<ExampleFormModel>({
    firstName: undefined, // 'Cynthion',
    middleName: undefined, // 'Whatever',
    lastName: undefined, // 'Morris',
    gender: undefined, // 'male',
    nationality: undefined, // 'ch',
    hobby: undefined, // 'reading',
    animal: undefined, // 'cat',
    birthdate: undefined, // new Date(1989, 5, 29),
    time: undefined, // new Date(0, 0, 0, 12, 30, 15),
    religion: undefined, // 'agnostic',
    allergies: undefined // ['dust', 'lactose']
  });
  protected readonly formFrame = exampleFormFrame;
  protected readonly suite: StaticSuite<string, string, (model: ExampleFormModel, field?: string) => void> =
    exampleFormValidationSuite;
  protected readonly validationOptions: FormValidationOptions = { debounceValidationInMs: 0 };

  protected readonly isDirty$ = new BehaviorSubject<boolean | null>(null);
  protected readonly isValid$ = new BehaviorSubject<boolean | null>(null);
  protected readonly errors$ = new BehaviorSubject<Record<string, string>>({});

  protected readonly viewModel$ = combineLatest({
    formValue$: this.formValue$,
    isDirty$: this.isDirty$,
    isValid$: this.isValid$,
    errors$: this.errors$
  }).pipe(
    map(({ formValue$, isDirty$, isValid$, errors$ }) => ({
      formValue$,
      isDirty$,
      isValid$,
      errors$,
      // custom vieModel properties
      showPasswords: !!formValue$.firstName,
      confirmPasswordDisabled: !formValue$.passwords?.password
    }))
  );

  protected genderOptions: IFormidableFieldOption[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  protected nationalityOptions: IFormidableFieldOption[] = [
    { value: 'jp', label: 'Japan 🇯🇵' },
    { value: 'de', label: 'Germany 🇩🇪' },
    { value: 'fr', label: 'France 🇫🇷' }
    // { value: 'uk (no label)', label: '' }
  ];

  protected sortAlphabetically = (a: IFormidableFieldOption, b: IFormidableFieldOption): number => {
    if (!a.label && !b.label) {
      return a.value.localeCompare(b.value);
    }
    if (!a.label) return 1;
    if (!b.label) return -1;
    return a.label.localeCompare(b.label);
  };

  protected nationalityEmptyOption: IFormidableFieldOption = {
    value: 'empty',
    label: 'No nationality available.'
  };

  protected hobbyOptions: IFormidableFieldOption[] = [
    { value: 'dev', label: 'Software Development' },
    { value: 'gaming (no label)', label: '' },
    { value: 'reading', label: 'Reading' },
    // { value: 'sports', label: 'Sports' },
    {
      value: 'swimming',
      label: 'Swimming',
      match: (filterValue: string) =>
        ['swimming', 'pool', 'aqua', 'dive'].some((word) => word.includes(filterValue.toLowerCase()))
    },
    { value: 'cooking', label: 'Cooking' }
  ];

  protected hobbyEmptyOption: IFormidableFieldOption = {
    value: 'empty',
    label: 'No hobby available.'
  };

  protected animalOptionsDefault: IFormidableFieldOption[] = [
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

  protected animalEmptyOption: IFormidableFieldOption = {
    value: 'empty',
    label: 'No animal available.'
  };

  protected religionOptions: IFormidableFieldOption[] = [
    { value: 'christian', label: 'Christianity' },
    { value: 'hindu', label: 'Hinduism' },
    { value: 'buddhist', label: 'Buddhism' }
  ];

  protected religionEmptyOption: IFormidableFieldOption = {
    value: 'empty',
    label: 'No religion available.'
  };

  protected allergiesOptions: IFormidableFieldOption[] = [
    { value: 'pollen', label: 'Pollen' },
    { value: 'dust', label: 'Dust' },
    { value: 'peanuts', label: 'Peanuts' },
    { value: 'shellfish', label: 'Shellfish' }
  ];

  protected allergiesEmptyOption: IFormidableFieldOption = {
    value: 'empty',
    label: 'No allergies available.'
  };

  protected specialMatchFn = (filterValue: string): boolean => {
    // Custom matching logic for the religion field
    return ['special', 'legend', 'epic', 'custom', 'random'].some((word) => word.includes(filterValue.toLowerCase()));
  };

  protected I18N_CONFIG: Pikaday.PikadayI18nConfig = {
    previousMonth: 'datepicker.previous-month',
    nextMonth: 'datepicker.next-month',
    months: [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre'
    ],
    weekdays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    weekdaysShort: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  };

  protected exampleTooltipSvg = `
  <svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round">
  <circle cx="12" cy="12" r="10" />
  <line x1="12" y1="16" x2="12" y2="12" />
  <line x1="12" y1="8" x2="12" y2="8" />
</svg>
`;

  protected onValueChanged(_fieldName: string, _value: unknown): void {
    this.log(`Value changed on ${_fieldName} field: ${_value}`);
  }

  protected onFocusChanged(_fieldName: string, _isFocused: boolean): void {
    this.log(`Focus changed on ${_fieldName} field: ${_isFocused}`);
  }

  protected onSubmit(): void {
    if (this.isValid$.value) {
      this.log(JSON.stringify(this.formValue$.value));
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

  //#region Control Center & Debug Output

  protected logs: string[] = [];
  protected theme: ThemeKey = 'default';

  log(message: string): void {
    this.logs.unshift(message);
  }

  clearLogs(): void {
    this.logs = [];
  }

  controlCenterExpanded = false;
  debugExpanded = false;

  toggleControlCenter(): void {
    this.controlCenterExpanded = !this.controlCenterExpanded;
  }

  toggleDebug() {
    this.debugExpanded = !this.debugExpanded;
  }

  protected controlCenter = {
    showPrefixes: true,
    showSuffixes: true,
    showTooltips: true,
    showLabels: true,
    floatingLabels: true
  };

  // Since all components are change-detection OnPush, we need to trigger a change detection cycle
  protected renderFlip = true;
  private appliedKeys = new Set<string>(); // track what we’ve set on :root

  onToggle(key: ControlKey, checked: boolean): void {
    this.controlCenter[key] = checked;
    this.renderFlip = !this.renderFlip;
    this.clearLogs();
    // this.cdRef.markForCheck();
  }

  setTheme(key: ThemeKey): void {
    this.theme = key;

    const root = this.doc.documentElement;

    // 1) Clear previously applied custom vars
    this.appliedKeys.forEach((k) => root.style.removeProperty(k));
    this.appliedKeys.clear();

    // 2) Apply selected theme vars (default = {} → applies nothing)
    const vars = this.themes[key];
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
      this.appliedKeys.add(k);
    }

    // 3) Persist + nudge CD if needed
    localStorage.setItem('example.theme', key);
    this.cdRef.markForCheck();
  }

  private readonly themes: Record<ThemeKey, ThemeVars> = {
    default: {},
    theme2: {
      '--formidable-field-height': '64px',
      '--formidable-field-border-thickness': '2px',
      '--formidable-field-border-radius': '10px',
      '--formidable-color-validation-error': '#d61f69',
      '--formidable-color-field-text': '#1b1b1b',
      '--formidable-color-field-label': '#1b1b1b',
      '--formidable-color-field-label-floating': '#0e7490',
      '--formidable-color-field-placeholder': '#6b7280',
      '--formidable-color-field-selection': '#c084fc',
      '--formidable-color-field-border': '#0ea5e9',
      '--formidable-color-field-border-focus': '#3b82f6',
      '--formidable-color-field-background': '#ecfeff',
      '--formidable-color-field-background-readonly': '#bae6fd',
      '--formidable-color-field-background-disabled': '#e5e7eb',
      '--formidable-color-field-highlighted': 'rgba(14, 165, 233, 0.15)',
      '--formidable-color-field-hovered': 'rgba(59, 130, 246, 0.2)',
      '--formidable-date-field-panel-width': '260px',
      '--formidable-panel-background': '#f0f9ff',
      '--formidable-panel-box-shadow': '0 8px 32px rgba(0,0,0,0.15)'
    },
    theme3: {
      '--formidable-field-height': '60px',
      '--formidable-field-border-thickness': '3px',
      '--formidable-field-border-radius': '14px',
      '--formidable-color-validation-error': '#ff4d6d',
      '--formidable-color-field-text': '#1e293b',
      '--formidable-color-field-label': '#1e293b',
      '--formidable-color-field-label-floating': '#f97316',
      '--formidable-color-field-placeholder': '#f59e0b',
      '--formidable-color-field-selection': '#fde047',
      '--formidable-color-field-border': '#f97316',
      '--formidable-color-field-border-focus': '#ea580c',
      '--formidable-color-field-background': '#fffbeb',
      '--formidable-color-field-background-readonly': '#fde68a',
      '--formidable-color-field-background-disabled': '#fcd34d',
      '--formidable-color-field-highlighted': 'rgba(251, 191, 36, 0.25)',
      '--formidable-color-field-hovered': 'rgba(249, 115, 22, 0.2)',
      '--formidable-date-field-panel-width': '260px',
      '--formidable-panel-background': '#fff7ed',
      '--formidable-panel-box-shadow': '0 8px 32px rgba(255, 140, 0, 0.25)'
    },
    theme4: {
      '--formidable-field-height': '42px',
      '--formidable-field-border-thickness': '1px',
      '--formidable-field-border-radius': '4px',
      '--formidable-color-validation-error': '#b91c1c',
      '--formidable-color-field-text': '#111827',
      '--formidable-color-field-label': '#111827',
      '--formidable-color-field-label-floating': '#374151',
      '--formidable-color-field-placeholder': '#6b7280',
      '--formidable-color-field-selection': '#93c5fd',
      '--formidable-color-field-border': '#9ca3af',
      '--formidable-color-field-border-focus': '#2563eb',
      '--formidable-color-field-background': '#f9fafb',
      '--formidable-color-field-background-readonly': '#e5e7eb',
      '--formidable-color-field-background-disabled': '#e5e7eb',
      '--formidable-color-field-highlighted': 'rgba(37, 99, 235, 0.08)',
      '--formidable-color-field-hovered': 'rgba(37, 99, 235, 0.15)',
      '--formidable-date-field-panel-width': '200px',
      '--formidable-panel-background': '#ffffff',
      '--formidable-panel-box-shadow': '0 4px 20px rgba(0,0,0,0.08)'
    }
  };

  //#endregion
}

type ControlKey = 'showPrefixes' | 'showSuffixes' | 'showTooltips' | 'showLabels' | 'floatingLabels';
type ThemeKey = 'default' | 'theme2' | 'theme3' | 'theme4';
type ThemeVars = Record<string, string>;
