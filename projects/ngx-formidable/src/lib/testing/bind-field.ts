import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AbstractControl,
  FormControl,
  FormsModule,
  NgModel,
  ReactiveFormsModule,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { disabled, form, FormField, readonly, required, validate } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { FieldDecorator } from '../components/field-decorator/field-decorator';
import { FieldOption } from '../components/field-option/field-option';
import { AutocompleteField } from '../components/fields/autocomplete-field/autocomplete-field';
import { CheckboxGroupField } from '../components/fields/checkbox-group-field/checkbox-group-field';
import { DateField } from '../components/fields/date-field/date-field';
import { DropdownField } from '../components/fields/dropdown-field/dropdown-field';
import { InputField } from '../components/fields/input-field/input-field';
import { RadioGroupField } from '../components/fields/radio-group-field/radio-group-field';
import { SelectField } from '../components/fields/select-field/select-field';
import { SliderField } from '../components/fields/slider-field/slider-field';
import { TextareaField } from '../components/fields/textarea-field/textarea-field';
import { TimeField } from '../components/fields/time-field/time-field';
import { ToggleField } from '../components/fields/toggle-field/toggle-field';
import { FieldLabel } from '../directives/field-label';
import { FieldSuffix } from '../directives/field-suffix';
import { settle } from './test-bed';

/** A field the library ships, named as its selector is: `date` is `formidable-date-field`. */
export type FieldKind =
  | 'input'
  | 'textarea'
  | 'select'
  | 'dropdown'
  | 'autocomplete'
  | 'date'
  | 'time'
  | 'toggle'
  | 'slider'
  | 'radio-group'
  | 'checkbox-group';

/** The Angular forms API a field is bound through: `[formField]`, `ngModel` inside a `<form>`, or `[formControl]`. */
export type FormsApi = 'signal' | 'template-driven' | 'reactive';

/** Every forms API, for a spec that runs a field through each. */
export const FORMS_APIS: readonly FormsApi[] = ['signal', 'template-driven', 'reactive'];

/** What the field reported, in order: a `valueChange` or a `touch`. */
export type FieldEvent = 'value' | 'touch';

export interface BindFieldOptions {
  /** The model's value before the first render. */
  value?: unknown;
  /** Inputs bound on the field. Only these can be changed later, through `BoundField.set`. */
  inputs?: Record<string, unknown>;
  /** Markup projected into the field, such as its `formidable-field-option`s. */
  content?: string;
  /** Wraps the field in a `formidable-field-decorator`. */
  decorated?: boolean;
  /** Markup projected into the decorator beside the field, such as a `formidableFieldLabel`. Only with `decorated`. */
  decoration?: string;
  /** Markup rendered before the field, such as a spacer that puts it near the fold. */
  before?: string;
  /** Markup rendered after the field, such as a button for focus to leave to by `Tab` and come back from. */
  after?: string;
  /** Angular's `updateOn`, on the `<form>` or on the `FormControl`. Ignored by Signal Forms. */
  updateOn?: 'change' | 'blur' | 'submit';
}

/** The state a forms API holds for a field, which `BoundField.state` changes the way that API's consumer does. */
export interface FieldFlags {
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  /** A rule of the API's reports one error of kind `invalid`, which renders as the message `invalid`. */
  invalid: boolean;
}

export interface BoundField {
  readonly fixture: ComponentFixture<unknown>;
  /** The field's own element, such as `formidable-date-field`. */
  readonly element: HTMLElement;
  /** What the forms API holds as the model. */
  value(): unknown;
  touched(): boolean;
  dirty(): boolean;
  /** Every `valueChange` and `touch` the field emitted, in order. */
  events(): readonly FieldEvent[];
  /** Writes the model through the forms API, as a consumer's code does, then settles. */
  write(value: unknown): Promise<void>;
  /** Changes one of `BindFieldOptions.inputs`, as a parent binding does, then settles. */
  set(input: string, value: unknown): Promise<void>;
  /** Marks the field touched through the forms API rather than by a blur, as a submit does, then settles. */
  markAsTouched(): Promise<void>;
  /**
   * Changes the field's state as each API's consumer does, then settles: a Signal Forms rule; `disable()`,
   * `Validators.required` and a validator of its own on the control; a `[readonly]` binding, and a
   * `[required]` one under `ngModel`.
   */
  state(flags: Partial<FieldFlags>): Promise<void>;
}

/** Any model value but `undefined`, which Signal Forms would drop from the model. */
type ModelValue = NonNullable<unknown> | null;

const FIELDS = [
  AutocompleteField,
  CheckboxGroupField,
  DateField,
  DropdownField,
  InputField,
  RadioGroupField,
  SelectField,
  SliderField,
  TextareaField,
  TimeField,
  ToggleField
];

@Component({ template: '' })
class FieldHost {
  readonly model = signal<unknown>(null);
  readonly inputs = signal<Record<string, unknown>>({});
  readonly flags = signal<FieldFlags>({ disabled: false, readonly: false, required: false, invalid: false });
  readonly events: FieldEvent[] = [];
  control = new FormControl<unknown>(null);

  /** The classic APIs' rule behind `FieldFlags.invalid`. */
  readonly invalid: ValidatorFn = () => (this.flags().invalid ? { invalid: true } : null);

  readonly signalModel = signal<{ field: ModelValue }>({ field: null });
  readonly form = form(this.signalModel, (path) => {
    disabled(path.field, () => this.flags().disabled);
    readonly(path.field, () => this.flags().readonly);
    required(path.field, { when: () => this.flags().required });
    validate(path.field, () => (this.flags().invalid ? { kind: 'invalid' } : null));
  });
}

/** How each API binds the field, and the state it has no rule for and takes as a binding instead. */
const BINDINGS: Record<FormsApi, string> = {
  'signal': '[formField]="form.field"',
  'template-driven': 'name="field" [(ngModel)]="model" [readonly]="flags().readonly" [required]="flags().required"',
  'reactive': '[formControl]="control" [readonly]="flags().readonly"'
};

/** Renders one field bound through `api`, as a consumer's template binds it, and settles its first render. */
export async function bindField(kind: FieldKind, api: FormsApi, options: BindFieldOptions = {}): Promise<BoundField> {
  const {
    value = null,
    inputs = {},
    content = '',
    decorated = false,
    decoration = '',
    before = '',
    after = '',
    updateOn
  } = options;
  const tag = `formidable-${kind}-field`;
  const bindings = Object.keys(inputs).map((name) => `[${name}]="inputs()['${name}']"`);
  const outputs = `(valueChange)="events.push('value')" (touch)="events.push('touch')"`;
  const field = `<${tag} ${BINDINGS[api]} ${bindings.join(' ')} ${outputs}>${content}</${tag}>`;
  const decoratedField =
    before +
    (decorated ? `<formidable-field-decorator>${field}${decoration}</formidable-field-decorator>` : field) +
    after;
  const formOptions = updateOn ? `[ngFormOptions]="{ updateOn: '${updateOn}' }"` : '';
  const template = api === 'template-driven' ? `<form ${formOptions}>${decoratedField}</form>` : decoratedField;

  TestBed.overrideComponent(FieldHost, {
    set: {
      imports: [
        FormsModule,
        ReactiveFormsModule,
        FormField,
        FieldDecorator,
        FieldLabel,
        FieldOption,
        FieldSuffix,
        ...FIELDS
      ],
      template
    }
  });

  const fixture = TestBed.createComponent(FieldHost);
  const host = fixture.componentInstance;

  host.model.set(value);
  host.signalModel.set({ field: value as ModelValue });
  host.inputs.set(inputs);
  host.control = new FormControl<unknown>(value, { updateOn, validators: host.invalid });

  await settle(fixture);

  const control: AbstractControl | null =
    api === 'template-driven'
      ? fixture.debugElement.query(By.directive(NgModel)).injector.get(NgModel).control
      : api === 'reactive'
        ? host.control
        : null;

  // `ngModel` attaches no directive validator to a custom control, so its rule goes on imperatively.
  if (api === 'template-driven') control!.addValidators(host.invalid);
  const state = () => host.form.field();

  return {
    fixture,
    element: fixture.nativeElement.querySelector(tag) as HTMLElement,
    value: () => (control ? control.value : state().value()),
    touched: () => (control ? control.touched : state().touched()),
    dirty: () => (control ? control.dirty : state().dirty()),
    events: () => host.events,
    async write(next: unknown): Promise<void> {
      if (api === 'signal') state().value.set(next as ModelValue);
      else if (api === 'template-driven') host.model.set(next);
      else host.control.setValue(next);

      await settle(fixture);
    },
    async set(input: string, next: unknown): Promise<void> {
      host.inputs.update((current) => ({ ...current, [input]: next }));

      await settle(fixture);
    },
    async markAsTouched(): Promise<void> {
      if (control) control.markAsTouched();
      else state().markAsTouched();

      await settle(fixture);
    },
    async state(flags: Partial<FieldFlags>): Promise<void> {
      host.flags.update((current) => ({ ...current, ...flags }));

      if (control && flags.disabled !== undefined) {
        if (flags.disabled) control.disable();
        else control.enable();
      }

      if (api === 'reactive' && flags.required !== undefined) {
        if (flags.required) control!.addValidators(Validators.required);
        else control!.removeValidators(Validators.required);
      }

      if (control && (flags.required !== undefined || flags.invalid !== undefined)) control.updateValueAndValidity();

      await settle(fixture);
    }
  };
}
