import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import {
  AutocompleteFieldComponent,
  CheckboxGroupFieldComponent,
  DateFieldComponent,
  DropdownFieldComponent,
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
  IFormidableOption,
  InputFieldComponent,
  NgxFormidableFieldValidateDirective,
  RadioGroupFieldComponent,
  SelectFieldComponent,
  SliderFieldComponent,
  TextareaFieldComponent,
  TimeFieldComponent,
  ToggleFieldComponent
} from '@cynthion/ngx-formidable';
import { ExampleCounterFieldComponent } from '../../../example-counter-field/example-counter-field.component';
import { ExampleFuzzyOptionComponent } from '../../../example-fuzzy-option/example-fuzzy-option.component';
import { ExampleIconComponent } from '../../../example-icon/example-icon.component';
import { ExampleTooltipComponent } from '../../../example-tooltip/example-tooltip.component';
import { fuzzyFilter } from '../../helpers/fuzzy.helpers';
import { AccessibilityReadoutComponent } from '../accessibility/accessibility-readout.component';
import { CALENDAR_SVG, MARKER_SVG, SPARK_SVG } from './preview-icons';
import { FIELD_CAPABILITIES } from '../../model/field-capabilities';
import { PortalFieldSpec, PortalFormOptions, PortalOptionSpec } from '../../model/field-spec.model';
import { localeOf } from '../../model/locales';
import { ANGULAR_MIN_LENGTHS, ANGULAR_REQUIRED_FIELDS } from '../../model/preview-form.validation';

/** The named formatters offered in place of a code editor for a slider's function-typed inputs. */
const FORMATTERS: Readonly<Record<string, (value: number) => string>> = {
  percent: (value) => `${value}%`,
  years: (value) => `${value} years`,
  currency: (value) => `€${value.toLocaleString('en-GB')}`,
  ordinal: (value) => `#${value}`
};

/**
 * One field of the preview form, rendered from its specification.
 *
 * The specification arrives as an input, so a change to one field marks only this view — which is what makes
 * one signal over the whole definition tree workable.
 */
@Component({
  selector: 'portal-preview-field',
  templateUrl: './preview-field.component.html',
  styleUrl: './preview-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    FieldDecoratorComponent,
    FieldErrorsDirective,
    FieldHintDirective,
    FieldLabelAdornmentDirective,
    FieldLabelDirective,
    FieldOptionComponent,
    FieldPrefixDirective,
    FieldSuffixDirective,
    FieldToggleIconDirective,
    NgxFormidableFieldValidateDirective,
    InputFieldComponent,
    TextareaFieldComponent,
    SelectFieldComponent,
    DropdownFieldComponent,
    AutocompleteFieldComponent,
    DateFieldComponent,
    TimeFieldComponent,
    ToggleFieldComponent,
    SliderFieldComponent,
    RadioGroupFieldComponent,
    CheckboxGroupFieldComponent,
    ExampleCounterFieldComponent,
    ExampleFuzzyOptionComponent,
    ExampleIconComponent,
    ExampleTooltipComponent,
    AccessibilityReadoutComponent
  ],
  // A field lives in its own component, and `@Host()` stops `ngModel`'s `ControlContainer` injection at that
  // boundary — so without this every control would register as standalone, outside the form. A standalone
  // `ngModel` also sets its control up before the field's view exists, which `impl/backlog.md` records as a
  // crash, so this is what makes the per-field component workable at all.
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
  host: {
    '[class.is-selected]': 'selected()',
    '[style.grid-column]': "spec().span === 2 ? '1 / -1' : null"
  }
})
export class PreviewFieldComponent {
  public readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  public readonly spec = input.required<PortalFieldSpec>();
  public readonly formOptions = input.required<PortalFormOptions>();
  public readonly value = input<unknown>(null);
  public readonly selected = input(false);
  public readonly showAccessibility = input(false);
  public readonly showCaptions = input(true);

  /** Selection follows focus, so clicking a field uses it rather than only selecting it. */
  public readonly focused = output<string>();
  /** A caption chip is a control: it opens the inspector at the field it names. */
  public readonly captionActivated = output<string>();

  protected readonly host = this.elementRef.nativeElement;

  protected readonly calendarSvg = CALENDAR_SVG;
  protected readonly markerSvg = MARKER_SVG;
  protected readonly sparkSvg = SPARK_SVG;

  protected readonly capabilities = computed(() => FIELD_CAPABILITIES[this.spec().kind]);

  /** Bumped whenever this field may have repainted, so the accessibility readout re-reads the DOM. */
  protected readonly revision = computed(() => {
    this.spec();
    this.value();
    this.formOptions();

    return Date.now();
  });

  protected readonly locale = computed(() => localeOf(this.spec().locale ?? this.formOptions().locale));

  protected readonly isReadonly = computed(() => this.spec().state.readonly || this.formOptions().readonly);
  protected readonly isDisabled = computed(() => this.spec().state.disabled || this.formOptions().disabled);

  protected readonly showLabel = computed(() => this.formOptions().showLabels && this.spec().decoration.showLabel);

  protected readonly labelPosition = computed<FieldLabelPosition>(() =>
    this.capabilities().labelPositions ? this.spec().decoration.labelPosition : 'outside'
  );

  protected readonly showHint = computed(() => this.formOptions().showHints && !!this.spec().decoration.hint);

  protected readonly showAdornments = computed(
    () => this.formOptions().showAdornments && this.capabilities().adornments
  );

  protected readonly panelPosition = computed(() => this.spec().panelPosition ?? this.formOptions().panelPosition);

  protected readonly options = computed<PortalOptionSpec[]>(() => [...(this.spec().options ?? [])]);

  protected readonly requiredInAngularMode = computed(
    () => this.formOptions().validator === 'angular' && ANGULAR_REQUIRED_FIELDS.has(this.spec().name)
  );

  protected readonly minLengthInAngularMode = computed(() =>
    this.formOptions().validator === 'angular' ? (ANGULAR_MIN_LENGTHS.get(this.spec().name) ?? null) : null
  );

  /** An `always` default is pinned first, exempt from both the sort and the autocomplete filter. */
  protected readonly defaultOption = computed(() => {
    const option = this.spec().defaultOption;

    return option ? { value: option.value, label: option.label } : undefined;
  });

  protected readonly sortFn = computed(() =>
    this.spec().sortAlphabetically
      ? (a: IFormidableOption, b: IFormidableOption) => (a.label ?? a.value).localeCompare(b.label ?? b.value)
      : undefined
  );

  protected readonly thumbLabelFn = computed(() => this.formatter(this.spec().thumbLabelFormat));
  protected readonly tickLabelFn = computed(() => this.formatter(this.spec().tickLabelFormat));

  /** An autocomplete emits its filter text and the consumer supplies the filtered list. */
  protected readonly filterText = signal('');

  /** Filtered with fuse.js, so the projected custom option has real match runs to mark. */
  protected readonly fuzzyMatches = computed(() => fuzzyFilter(this.options(), this.filterText()));

  protected onFocus(isFocused: boolean): void {
    if (isFocused) this.focused.emit(this.spec().id);
  }

  protected onCaption(): void {
    this.captionActivated.emit(this.spec().id);
  }

  private formatter(id: string | undefined): ((value: number) => string) | undefined {
    return id && id !== 'none' ? FORMATTERS[id] : undefined;
  }
}
