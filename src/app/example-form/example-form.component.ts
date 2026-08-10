import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Fuse, { FuseResult } from 'fuse.js';
import {
  AutocompleteFieldComponent,
  CheckboxGroupFieldComponent,
  DateFieldComponent,
  DropdownFieldComponent,
  FieldAdornmentAlignment,
  FieldDecoratorComponent,
  FieldErrorsDirective,
  FieldHintDirective,
  FieldLabelAdornmentDirective,
  FieldLabelDirective,
  FieldLabelPosition,
  FieldOptionComponent,
  FieldPrefixDirective,
  FieldSuffixDirective,
  FieldToggleIconDirective,
  FormidablePanelPosition,
  IFormidableFieldOption,
  InputFieldComponent,
  NgxFormidableFormDirective,
  NgxFormidableFormModelDirective,
  NgxFormidableFormRootValidateDirective,
  NgxFormidableFormValidationOptions,
  RadioGroupFieldComponent,
  SelectFieldComponent,
  SliderFieldComponent,
  TextareaFieldComponent,
  TimeFieldComponent
} from 'ngx-formidable';
import { BehaviorSubject, combineLatest, map, Observable, startWith, Subject } from 'rxjs';
import { StaticSuite } from 'vest';
import { ToggleFieldComponent } from '../../../projects/ngx-formidable/src/lib/components/fields/toggle-field/toggle-field.component';
import { ExampleFuzzyOptionComponent } from '../example-fuzzy-option/example-fuzzy-option.component';
import { ExampleIconComponent } from '../example-icon/example-icon.component';
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
    ToggleFieldComponent,
    SliderFieldComponent,
    NgxFormidableFormDirective,
    NgxFormidableFormModelDirective,
    // NgxFormidableFormModelGroupDirective,
    NgxFormidableFormRootValidateDirective,
    FieldLabelAdornmentDirective,
    FieldLabelDirective,
    FieldPrefixDirective,
    FieldSuffixDirective,
    FieldToggleIconDirective,
    FieldErrorsDirective,
    FieldHintDirective,
    // Example
    ExampleIconComponent,
    ExampleTooltipComponent,
    ExampleFuzzyOptionComponent
  ]
})
export class ExampleFormComponent implements OnInit {
  constructor(
    @Inject(DOCUMENT) private doc: Document,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.restoreSchemes();
  }

  protected readonly formValue$ = new BehaviorSubject<ExampleFormModel>({
    firstName: 'Cynthion',
    middleName: undefined,
    lastName: undefined, // 'Morris',
    gender: undefined, // 'male',
    nationality: 'ch',
    hobby: undefined, // 'reading',
    animal: undefined, // 'cat',
    birthdate: undefined, // new Date(1989, 5, 29),
    time: undefined, // new Date(0, 0, 0, 12, 30, 15),
    religion: 'agnostic',
    allergies: ['dust', 'lactose'],
    isSingle: undefined, // true
    age: 50 // undefined
  });
  protected readonly formFrame = exampleFormFrame;
  protected readonly formSuite: StaticSuite<string, string, (model: ExampleFormModel, field?: string) => void> =
    exampleFormValidationSuite;
  protected readonly validationOptions: NgxFormidableFormValidationOptions = { debounceValidationInMs: 0 };

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

  // pinned first, ahead of the sortFn
  protected genderDefaultOption: IFormidableFieldOption = { value: 'unspecified', label: 'Prefer not to say' };

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

  protected nationalityDefaultOption: IFormidableFieldOption = { value: 'other', label: 'Other…' };

  protected nationalityNoOptionText = 'No nationality available.';

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

  // only rendered when the filter matches nothing
  protected hobbyDefaultOption: IFormidableFieldOption = { value: 'add-new', label: 'Add a new hobby…' };

  protected hobbyNoOptionText = 'No hobby available.';

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

  protected animalNoOptionText = 'No animal available.';

  protected religionOptions: IFormidableFieldOption[] = [
    { value: 'christian', label: 'Christianity' },
    { value: 'hindu', label: 'Hinduism' },
    { value: 'buddhist', label: 'Buddhism' }
  ];

  protected religionDefaultOption: IFormidableFieldOption = { value: 'none', label: 'None' };

  protected religionNoOptionText = 'No religion available.';

  protected allergiesOptions: IFormidableFieldOption[] = [
    { value: 'pollen', label: 'Pollen' },
    { value: 'dust', label: 'Dust' },
    { value: 'peanuts', label: 'Peanuts' },
    { value: 'shellfish', label: 'Shellfish' }
  ];

  // projected inside a wrapper element — only reachable with { descendants: true }
  protected allergiesProjectedOptions: IFormidableFieldOption[] = [
    { value: 'lactose', label: 'Lactose (disabled)', disabled: true },
    { value: 'gluten', label: 'GLUTEN' },
    { value: 'soy', label: 'Soy' }
  ];

  // only rendered when the group has no other option
  protected allergiesDefaultOption: IFormidableFieldOption = { value: 'unknown', label: 'Not known yet' };

  protected allergiesNoOptionText = 'No allergies available.';

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

  protected exampleCalendarSvg = `
  <svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round">
  <path d="M8 2v4" />
  <path d="M16 2v4" />
  <path d="M3 10h18" />
  <path d="M21 6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
</svg>
`;

  protected onValueChanged(_fieldName: string, _value: unknown): void {
    this.log(`Value changed on ${_fieldName} field: ${_value}`);

    if (_fieldName === 'hobby') this.simulateHobbyLookup();
  }

  protected onFocusChanged(_fieldName: string, _isFocused: boolean): void {
    this.log(`Focus changed on ${_fieldName} field: ${_isFocused}`);
  }

  // #region Prefix & Suffix Actions

  // The fields are one-way `[ngModel]`-bound to `formValue$`, and the form pipes its own changes back into
  // it, so writing here is what an action needs to change a value.
  private patchFormValue(patch: Partial<ExampleFormModel>): void {
    this.formValue$.next({ ...this.formValue$.value, ...patch });
  }

  protected clearField(key: 'firstName' | 'middleName'): void {
    this.patchFormValue({ [key]: '' });
    this.log(`Cleared ${key} from its suffix.`);
  }

  protected copyField(key: 'firstName' | 'middleName'): void {
    const value = this.formValue$.value[key] ?? '';

    navigator.clipboard.writeText(value);
    this.log(`Copied ${key} to the clipboard: ${value}`);
  }

  protected setToday(): void {
    this.patchFormValue({ birthdate: new Date() });
    this.log('Set birthdate to today from its prefix.');
  }

  protected isHobbyLoading = false;

  /** Stands in for an async lookup, so the suffix demonstrates a spinner that comes and goes. */
  private simulateHobbyLookup(): void {
    this.isHobbyLoading = true;

    setTimeout(() => {
      this.isHobbyLoading = false;
      this.cdRef.markForCheck();
    }, 800);
  }

  // #endregion

  protected transformValueToThumbLabel = (value: number): string => {
    return `${value} years`;
  };

  protected transformTickToTickLabel = (value: number): string => {
    return `${value}y`;
  };

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

  // #region Control Center & Debug Output

  protected logs: string[] = [];
  protected geometry: GeometryKey = 'outlined';
  protected color: ColorKey = 'slate';

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
    showActions: false,
    showLabelAdornments: true,
    showLabels: true,
    showHints: true,
    showAsReadonly: false,
    showAsDisabled: false
  };

  protected labelPosition: FieldLabelPosition = 'inside';
  protected adornmentAlignment: FieldAdornmentAlignment = 'center';
  protected panelPosition: FormidablePanelPosition = 'right';

  // Since all components are change-detection OnPush, we need to trigger a change detection cycle
  protected renderFlip = true;
  private appliedKeys = new Set<string>(); // track what we’ve set on :root

  onToggle(key: ControlKey, checked: boolean): void {
    this.controlCenter[key] = checked;
    this.renderFlip = !this.renderFlip;
    this.clearLogs();
    // this.cdRef.markForCheck();
  }

  setLabelPosition(position: FieldLabelPosition): void {
    this.labelPosition = position;
    this.clearLogs();
  }

  setAdornmentAlignment(alignment: FieldAdornmentAlignment): void {
    this.adornmentAlignment = alignment;
    this.clearLogs();
  }

  setPanelPosition(position: FormidablePanelPosition): void {
    this.panelPosition = position;
    this.clearLogs();
  }

  setGeometry(key: GeometryKey): void {
    this.geometry = key;
    this.applySchemes();
  }

  setColor(key: ColorKey): void {
    this.color = key;
    this.applySchemes();
  }

  // The two axes are independent: geometry sets dimensions, radii and thicknesses, colour sets colours.
  // Applied together so a scheme on one axis can be judged against any scheme on the other.
  private applySchemes(): void {
    const root = this.doc.documentElement;

    // 1) Clear previously applied custom vars
    this.appliedKeys.forEach((k) => root.style.removeProperty(k));
    this.appliedKeys.clear();

    // 2) Apply both axes. Both always apply: A on each axis is the shipped default stated in full.
    const vars = { ...this.geometrySchemes[this.geometry], ...this.colorSchemes[this.color] };
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
      this.appliedKeys.add(k);
    }

    // 3) Persist + nudge CD if needed
    localStorage.setItem('example.geometry', this.geometry);
    localStorage.setItem('example.color', this.color);
    this.cdRef.markForCheck();
  }

  private restoreSchemes(): void {
    const geometry = localStorage.getItem('example.geometry');
    const color = localStorage.getItem('example.color');

    if (geometry && geometry in this.geometrySchemes) this.geometry = geometry as GeometryKey;
    if (color && color in this.colorSchemes) this.color = color as ColorKey;

    this.applySchemes();
  }

  // The shipped default leads each axis and is what the form starts on. There is no separate "library
  // default" entry: A on both axes *is* the default, stated in full, so if either ever stops matching
  // `_tokens.scss` the drift is visible rather than hidden behind an empty option.
  protected readonly geometryOptions: readonly { key: GeometryKey; label: string }[] = [
    { key: 'outlined', label: 'A — Outlined ★' },
    { key: 'underlined', label: 'B — Underlined' },
    { key: 'soft', label: 'C — Soft' },
    { key: 'compact', label: 'D — Compact' },
    { key: 'pill', label: 'E — Pill' },
    { key: 'leaf', label: 'F — Leaf' },
    { key: 'tab', label: 'G — Tab' },
    { key: 'brutalist', label: 'H — Brutalist' },
    { key: 'airy', label: 'I — Airy' },
    { key: 'borderless', label: 'J — Borderless' }
  ];

  protected readonly colorOptions: readonly { key: ColorKey; label: string }[] = [
    { key: 'slate', label: 'A — Slate ★' },
    { key: 'ocean', label: 'B — Ocean' },
    { key: 'sand', label: 'C — Sand' },
    { key: 'forest', label: 'D — Forest' },
    { key: 'plum', label: 'E — Plum' },
    { key: 'mono', label: 'F — Mono' },
    { key: 'clinical', label: 'G — Clinical' },
    { key: 'ledger', label: 'H — Ledger' },
    { key: 'sunset', label: 'I — Sunset' },
    { key: 'midnight', label: 'J — Midnight (dark)' }
  ];

  // Geometry only: dimensions, radii and thicknesses. No colour, so any scheme here combines with any
  // scheme below. Catalogued in `theme-options.md`.
  // Units are mandatory on every length: a unitless `0` is a `<number>` in `calc()`, not a `<length>`,
  // and would invalidate every declaration that derives from it.
  private readonly geometrySchemes: Record<GeometryKey, ThemeVars> = {
    // A — Outlined ★ — the shipped default. Kept stated in full rather than aliased to `default`, so
    // selecting it must render identically to `Library Default`; if the two ever diverge, `_tokens.scss`
    // and this catalogue have drifted.
    outlined: {
      '--formidable-field-height': '56px',
      '--formidable-field-border-thickness': '1px',
      '--formidable-border-radius': '8px',
      '--formidable-field-padding-x': '16px'
    },
    // B — Underlined: no border, a line inside the bottom edge that thickens on focus, and a field
    // rounded only at the top — so a panel opening below mirrors the square bottom and the pair reads as
    // one box, while a panel that flips above picks up the 8px instead. Everything that is not a field
    // box keeps the shared radius, which is the point: the slider thumb, the toggle knob and the panels
    // do not follow the field's corners.
    underlined: {
      '--formidable-field-height': '56px',
      '--formidable-field-border-thickness': '0px',
      '--formidable-border-radius': '8px',
      '--formidable-field-border-radius': '0px',
      '--formidable-field-border-start-start-radius': '8px',
      '--formidable-field-border-start-end-radius': '8px',
      '--formidable-field-underline-thickness': '1px',
      '--formidable-field-underline-thickness-focus': '2px',
      '--formidable-field-underline-thickness-invalid': '2px',
      // A field group never takes an underline, and its border thickness follows the field's — which is
      // `0px` here. Left to derive, a focused group would show no focus indicator at all.
      '--formidable-field-group-border-thickness': '1px',
      // The focus ring's width follows the field's border too, so a group's ring needs it back. One width
      // covers every ring the library paints, so the fields take a hairline ring here alongside their
      // thickened underline — the alternative is restating the group's whole box-shadow composite.
      '--formidable-field-focus-ring-width': '1px',
      // A panel is outlined by its own border, which is the field's unless it is given one.
      '--formidable-panel-border-thickness': '1px',
      // The toggle's track is drawn by the field's border, so it needs a thickness of its own.
      '--formidable-toggle-field-track-border-thickness': '1px',
      '--formidable-slider-track-border-thickness': '1px'
    },
    // C — Soft: borderless, generously rounded, focus carried by a wide translucent ring.
    soft: {
      '--formidable-field-height': '60px',
      '--formidable-field-border-thickness': '0px',
      '--formidable-border-radius': '12px',
      '--formidable-field-padding-x': '16px',
      '--formidable-field-group-border-thickness': '1px',
      '--formidable-toggle-field-track-border-thickness': '1px',
      '--formidable-slider-track-border-thickness': '1px',
      // Borderless, so the ring needs a width of its own — stated once, for every ring.
      '--formidable-field-focus-ring-width': '3px',
      // The only place a geometry scheme touches a colour variable, and the width is no longer why: this
      // scheme wants a *translucent* ring, and the library has no variable for a ring colour on its own, so
      // all three composites are restated. They still read their hue from the active colour scheme, which
      // is what keeps the two axes independent.
      '--formidable-color-field-focus-box-shadow':
        '0 0 0 var(--formidable-field-focus-ring-width) color-mix(in srgb, var(--formidable-color-field-border-focus) 35%, transparent)',
      '--formidable-color-field-group-focus-box-shadow':
        '0 0 0 var(--formidable-field-focus-ring-width) color-mix(in srgb, var(--formidable-color-field-border-focus) 35%, transparent)',
      '--formidable-color-field-focus-box-shadow-invalid':
        '0 0 0 var(--formidable-field-focus-ring-width) color-mix(in srgb, var(--formidable-color-validation-error) 35%, transparent)'
    },
    // D — Compact: dense rows for data-entry screens. 44px is the floor for the `inside` label
    // positions — below it the floating label and the value no longer fit the field's inner height and
    // the two start to overlap.
    compact: {
      '--formidable-field-height': '44px',
      '--formidable-field-border-thickness': '1px',
      '--formidable-border-radius': '4px',
      '--formidable-field-padding-x': '12px',
      '--formidable-field-font-size': '14px',
      '--formidable-label-font-size': '14px',
      '--formidable-label-floating-font-size': '11px',
      '--formidable-field-toggle-size': '24px',
      '--formidable-field-group-option-padding': '4px 0px',
      '--formidable-option-prefix-dimension-outer': '16px',
      '--formidable-option-prefix-dimension-inner': '6px',
      '--formidable-option-prefix-gap': '10px',
      '--formidable-toggle-field-width': '36px',
      '--formidable-toggle-field-height': '20px',
      '--formidable-toggle-field-thumb-size': '12px'
    },
    // E — Pill: the field radius is half its height, so it is fully round; everything else that is
    // rounded goes round with it. An open panel mirrors the field's facing corners, so the panel's top
    // arrives at 26px too.
    pill: {
      '--formidable-field-height': '52px',
      '--formidable-field-border-thickness': '1px',
      '--formidable-border-radius': '16px',
      '--formidable-field-border-radius': '26px',
      '--formidable-field-group-border-radius': '20px',
      '--formidable-field-padding-x': '24px',
      '--formidable-panel-border-radius': '20px',
      '--formidable-toggle-field-track-border-radius': '999px',
      '--formidable-toggle-field-thumb-border-radius': '999px',
      '--formidable-slider-track-border-radius': '999px',
      '--formidable-slider-thumb-border-radius': '999px',
      '--formidable-slider-tick-mark-border-radius': '999px'
    },
    // F — Leaf: one diagonal pair of corners heavily rounded, the other pair nearly square. The four
    // per-corner variables exist for exactly this, and they shape the field box alone — the toggle, the
    // slider and the panels keep the shared 8px.
    leaf: {
      '--formidable-field-height': '56px',
      '--formidable-field-border-thickness': '1px',
      '--formidable-border-radius': '8px',
      '--formidable-field-border-radius': '2px',
      '--formidable-field-border-start-start-radius': '22px',
      '--formidable-field-border-end-end-radius': '22px',
      '--formidable-field-group-border-radius': '22px 2px',
      '--formidable-field-padding-x': '18px'
    },
    // G — Tab: rounded on top, square on the bottom. A panel opening below mirrors that square edge, so
    // the field and its panel read as a single card; one that flips above picks up the 18px instead.
    tab: {
      '--formidable-field-height': '56px',
      '--formidable-field-border-thickness': '1px',
      '--formidable-border-radius': '10px',
      '--formidable-field-border-radius': '0px',
      '--formidable-field-border-start-start-radius': '18px',
      '--formidable-field-border-start-end-radius': '18px',
      '--formidable-field-padding-x': '16px'
    },
    // H — Brutalist: no radius anywhere, heavy borders, and hard offset shadows instead of rings. The
    // shadows read their colours from the active colour scheme, so the axes stay independent.
    brutalist: {
      '--formidable-field-height': '52px',
      '--formidable-field-border-thickness': '3px',
      '--formidable-border-radius': '0px',
      '--formidable-field-padding-x': '14px',
      '--formidable-slider-thumb-border-thickness': '3px',
      '--formidable-color-field-focus-box-shadow': '5px 5px 0 0 var(--formidable-color-field-border-focus)',
      '--formidable-color-field-group-focus-box-shadow': '5px 5px 0 0 var(--formidable-color-field-border-focus)',
      '--formidable-color-field-focus-box-shadow-invalid': '5px 5px 0 0 var(--formidable-color-validation-error)',
      '--formidable-panel-box-shadow': '6px 6px 0 0 var(--formidable-color-field-border)',
      '--formidable-date-field-panel-box-shadow': '6px 6px 0 0 var(--formidable-color-field-border)'
    },
    // I — Airy: tall rows, generous padding, large radii. Reads calm rather than dense.
    airy: {
      '--formidable-field-height': '72px',
      '--formidable-field-border-thickness': '1px',
      '--formidable-border-radius': '18px',
      '--formidable-field-padding-x': '22px',
      '--formidable-field-before-margin-bottom': '16px',
      '--formidable-textarea-padding-top': '20px'
    },
    // J — Borderless: no border and, unlike B, nothing standing in for one — no underline at all. The fill
    // defines a field at rest and the ring defines it on focus, which makes this the scheme that proves the
    // escape hatches: every one of the five lengths below defaults to the field's border thickness, so at
    // `0px` a theme without them has no panel outline, no group box, and no focus indicator anywhere.
    borderless: {
      '--formidable-field-height': '56px',
      '--formidable-field-border-thickness': '0px',
      '--formidable-border-radius': '4px',
      '--formidable-field-padding-x': '16px',
      // The only focus indicator this scheme has, on fields and groups alike — there is no underline to
      // fall back on, and one width covers every ring the library paints.
      '--formidable-field-focus-ring-width': '2px',
      // A panel is outlined by its own border, which is the field's unless it is given one. Without this the
      // panels would be shadow-only, which at a 4px radius reads as detached rather than as the field's.
      '--formidable-panel-border-thickness': '1px',
      // A group is a box, not a filled row, so it keeps a hairline of its own.
      '--formidable-field-group-border-thickness': '1px',
      // The toggle's track and the slider's track are drawn by the field's border.
      '--formidable-toggle-field-track-border-thickness': '1px',
      '--formidable-slider-track-border-thickness': '1px'
    }
  };

  // Colour only: eight seed variables per scheme. Everything else in the library derives from them —
  // the border drives the underline, the toggle thumb, the slider fills and the option prefixes; the
  // background drives the panels, the groups and the readonly/disabled fills; the placeholder drives the
  // hints, the length indicator and the resting label. This is the "override the base, not the
  // derivative" rule from `theming.md`, demonstrated.
  private readonly colorSchemes: Record<ColorKey, ThemeVars> = {
    // A — Ocean: the library's incumbent blue, cleaned up.
    ocean: {
      '--formidable-color-validation-error': '#c53030',
      '--formidable-color-field-text': '#00345a',
      '--formidable-color-field-placeholder': '#4a7189',
      '--formidable-color-field-selection': '#9fb7c7',
      '--formidable-color-field-border': '#3e6988',
      '--formidable-color-field-border-focus': '#0b6fa4',
      '--formidable-color-field-background': '#f2faff',
      '--formidable-color-field-label-floating': '#255476'
    },
    // B — Slate ★ — the shipped default, for the reason stated: neutral chrome plus one accent reads as
    // deliberate without competing with the consumer's brand, and rebranding is one variable. Kept stated
    // in full so it must render identically to `Library Default`.
    slate: {
      '--formidable-color-validation-error': '#dc2626',
      '--formidable-color-field-text': '#1e293b',
      '--formidable-color-field-placeholder': '#5a6b82',
      '--formidable-color-field-selection': '#c7d2fe',
      '--formidable-color-field-border': '#94a3b8',
      '--formidable-color-field-border-focus': '#4f46e5',
      '--formidable-color-field-background': '#f8fafc',
      '--formidable-color-field-label-floating': '#4338ca'
    },
    // C — Sand: warm, low-contrast fill.
    sand: {
      '--formidable-color-validation-error': '#b91c1c',
      '--formidable-color-field-text': '#3f2d16',
      '--formidable-color-field-placeholder': '#8a6d4a',
      '--formidable-color-field-selection': '#fde68a',
      '--formidable-color-field-border': '#c9a227',
      '--formidable-color-field-border-focus': '#b45309',
      '--formidable-color-field-background': '#fdf8f0',
      '--formidable-color-field-label-floating': '#92400e'
    },
    // D — Forest: green accent on a cool neutral.
    forest: {
      '--formidable-color-validation-error': '#be123c',
      '--formidable-color-field-text': '#14342a',
      '--formidable-color-field-placeholder': '#4f6f63',
      '--formidable-color-field-selection': '#a7f3d0',
      '--formidable-color-field-border': '#3f6f5c',
      '--formidable-color-field-border-focus': '#059669',
      '--formidable-color-field-background': '#f4faf7',
      '--formidable-color-field-label-floating': '#047857'
    },
    // E — Plum: tinted fill, saturated accent.
    plum: {
      '--formidable-color-validation-error': '#c2183f',
      '--formidable-color-field-text': '#2e1065',
      '--formidable-color-field-placeholder': '#6d5f8c',
      '--formidable-color-field-selection': '#ddd6fe',
      '--formidable-color-field-border': '#8b7bb8',
      '--formidable-color-field-border-focus': '#7c3aed',
      '--formidable-color-field-background': '#faf5ff',
      '--formidable-color-field-label-floating': '#6d28d9'
    },
    // F — Mono: greyscale chrome, to prove the library reads with no brand colour at all. The error
    // colour stays red on purpose — dropping it would leave validation signalled by shape alone.
    mono: {
      '--formidable-color-validation-error': '#b00020',
      '--formidable-color-field-text': '#111111',
      '--formidable-color-field-placeholder': '#595959',
      '--formidable-color-field-selection': '#d4d4d4',
      '--formidable-color-field-border': '#767676',
      '--formidable-color-field-border-focus': '#111111',
      '--formidable-color-field-background': '#fafafa',
      '--formidable-color-field-label-floating': '#333333'
    },
    // G — Clinical: medical and pharma. Near-white, cool teal accent, deliberately high contrast.
    clinical: {
      '--formidable-color-validation-error': '#c2410c',
      '--formidable-color-field-text': '#0f2b2e',
      '--formidable-color-field-placeholder': '#4c6b6d',
      '--formidable-color-field-selection': '#99f6e4',
      '--formidable-color-field-border': '#7f9fa1',
      '--formidable-color-field-border-focus': '#0f766e',
      '--formidable-color-field-background': '#f7fdfd',
      '--formidable-color-field-label-floating': '#115e59'
    },
    // H — Ledger: banking and insurance. Warm paper, navy text, muted gold accent — conservative on
    // purpose, the palette a compliance department signs off on.
    ledger: {
      '--formidable-color-validation-error': '#991b1b',
      '--formidable-color-field-text': '#1c2c45',
      '--formidable-color-field-placeholder': '#6b6350',
      '--formidable-color-field-selection': '#e7d9ae',
      '--formidable-color-field-border': '#a9a190',
      '--formidable-color-field-border-focus': '#8a6d1f',
      '--formidable-color-field-background': '#fbfaf7',
      '--formidable-color-field-label-floating': '#5b4a12'
    },
    // I — Sunset: consumer and lifestyle. Warm, vivid, high-energy.
    sunset: {
      '--formidable-color-validation-error': '#9f1239',
      '--formidable-color-field-text': '#4c1d24',
      '--formidable-color-field-placeholder': '#9a5f57',
      '--formidable-color-field-selection': '#fecdd3',
      '--formidable-color-field-border': '#f0a08c',
      '--formidable-color-field-border-focus': '#e11d48',
      '--formidable-color-field-background': '#fff7f5',
      '--formidable-color-field-label-floating': '#be123c'
    },
    // J — Midnight: a dark field, to prove the seeds invert. Four extra variables are unavoidable and
    // each marks a real limit — see the dark-scheme notes in `theme-options.md`. `--example-page-*` is
    // the demo's own, not the library's: a dark theme needs a dark host page, which no token can supply.
    midnight: {
      '--formidable-color-validation-error': '#fb7185',
      '--formidable-color-field-text': '#e8ecf5',
      '--formidable-color-field-placeholder': '#8b95ab',
      '--formidable-color-field-selection': '#334155',
      '--formidable-color-field-border': '#3b465e',
      '--formidable-color-field-border-focus': '#5eead4',
      '--formidable-color-field-background': '#141824',
      '--formidable-color-field-label-floating': '#5eead4',
      // The readonly and disabled fills are the base mixed toward `transparent`, which lightens them
      // against the page rather than dimming them. On a dark field they have to be stated outright.
      '--formidable-color-field-background-readonly': '#1c2130',
      '--formidable-color-field-background-disabled': '#191d29',
      // The selected and highlighted option fills are black at low alpha — invisible on a dark panel.
      '--formidable-color-field-option-background-selected': 'rgb(255 255 255 / 6%)',
      '--formidable-color-field-option-background-highlighted': 'rgb(255 255 255 / 12%)',
      '--example-page-background': '#0b0e16',
      '--example-page-text': '#e8ecf5'
    }
  };

  // #endregion
}

type ControlKey =
  | 'showPrefixes'
  | 'showSuffixes'
  | 'showActions'
  | 'showLabelAdornments'
  | 'showLabels'
  | 'showHints'
  | 'showAsReadonly'
  | 'showAsDisabled';
type GeometryKey =
  | 'outlined'
  | 'underlined'
  | 'soft'
  | 'compact'
  | 'pill'
  | 'leaf'
  | 'tab'
  | 'brutalist'
  | 'airy'
  | 'borderless';
type ColorKey = 'slate' | 'ocean' | 'sand' | 'forest' | 'plum' | 'mono' | 'clinical' | 'ledger' | 'sunset' | 'midnight';
type ThemeVars = Record<string, string>;
