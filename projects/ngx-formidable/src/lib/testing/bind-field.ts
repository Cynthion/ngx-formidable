import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbstractControl, FormControl, FormsModule, NgModel, ReactiveFormsModule } from '@angular/forms';
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

/** The Angular forms API a field is bound through: `ngModel` inside a `<form>`, or `[formControl]`. */
export type FormsApi = 'template-driven' | 'reactive';

export interface BindFieldOptions {
  /** The model's value before the first render. */
  value?: unknown;
  /** Inputs bound on the field. Only these can be changed later, through `BoundField.set`. */
  inputs?: Record<string, unknown>;
  /** Markup projected into the field, such as its `formidable-field-option`s. */
  content?: string;
  /** Wraps the field in a `formidable-field-decorator`. */
  decorated?: boolean;
  /** Angular's `updateOn`, on the `<form>` or on the `FormControl`. */
  updateOn?: 'change' | 'blur' | 'submit';
}

export interface BoundField {
  readonly fixture: ComponentFixture<unknown>;
  /** The field's own element, such as `formidable-date-field`. */
  readonly element: HTMLElement;
  /** The control the forms API holds the model in. */
  readonly control: AbstractControl;
  /** Writes the model through the forms API, as a consumer's code does, then settles. */
  write(value: unknown): Promise<void>;
  /** Changes one of `BindFieldOptions.inputs`, as a parent binding does, then settles. */
  set(input: string, value: unknown): Promise<void>;
}

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
  control = new FormControl<unknown>(null);
}

/** Renders one field bound through `api`, as a consumer's template binds it, and settles its first render. */
export async function bindField(kind: FieldKind, api: FormsApi, options: BindFieldOptions = {}): Promise<BoundField> {
  const { value = null, inputs = {}, content = '', decorated = false, updateOn } = options;
  const tag = `formidable-${kind}-field`;
  const model = api === 'template-driven' ? '[(ngModel)]="model"' : '[formControl]="control"';
  const bindings = Object.keys(inputs).map((name) => `[${name}]="inputs()['${name}']"`);
  const field = `<${tag} name="field" ${model} ${bindings.join(' ')}>${content}</${tag}>`;
  const decoratedField = decorated ? `<formidable-field-decorator>${field}</formidable-field-decorator>` : field;
  const formOptions = updateOn ? `[ngFormOptions]="{ updateOn: '${updateOn}' }"` : '';
  const template = api === 'template-driven' ? `<form ${formOptions}>${decoratedField}</form>` : decoratedField;

  TestBed.overrideComponent(FieldHost, {
    set: { imports: [FormsModule, ReactiveFormsModule, FieldDecorator, FieldOption, ...FIELDS], template }
  });

  const fixture = TestBed.createComponent(FieldHost);
  const host = fixture.componentInstance;

  host.model.set(value);
  host.inputs.set(inputs);
  host.control = new FormControl<unknown>(value, { updateOn });

  await settle(fixture);

  const control =
    api === 'template-driven'
      ? fixture.debugElement.query(By.directive(NgModel)).injector.get(NgModel).control
      : host.control;

  return {
    fixture,
    element: fixture.nativeElement.querySelector(tag) as HTMLElement,
    control,
    async write(next: unknown): Promise<void> {
      if (api === 'template-driven') host.model.set(next);
      else host.control.setValue(next);

      await settle(fixture);
    },
    async set(input: string, next: unknown): Promise<void> {
      host.inputs.update((current) => ({ ...current, [input]: next }));

      await settle(fixture);
    }
  };
}
