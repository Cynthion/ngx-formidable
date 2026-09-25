import { ChangeDetectionStrategy, Component } from '@angular/core';
import { discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideNgxMask } from 'ngx-mask';
import { FieldDecoratorComponent } from '../field-decorator/field-decorator.component';
import { AutocompleteFieldComponent } from './autocomplete-field/autocomplete-field.component';
import { BaseFieldDirective } from './base-field.directive';
import { CheckboxGroupFieldComponent } from './checkbox-group-field/checkbox-group-field.component';
import { DateFieldComponent } from './date-field/date-field.component';
import { DropdownFieldComponent } from './dropdown-field/dropdown-field.component';
import { InputFieldComponent } from './input-field/input-field.component';
import { RadioGroupFieldComponent } from './radio-group-field/radio-group-field.component';
import { SelectFieldComponent } from './select-field/select-field.component';
import { SliderFieldComponent } from './slider-field/slider-field.component';
import { TextareaFieldComponent } from './textarea-field/textarea-field.component';
import { TimeFieldComponent } from './time-field/time-field.component';
import { ToggleFieldComponent } from './toggle-field/toggle-field.component';

/**
 * Contract of a standalone `ngModel`, one outside a `<form>`: every field renders and shows its value.
 *
 * Inside a `<form>` the control registers across a microtask. A standalone one sets itself up from its own
 * `ngOnChanges` and writes straight away, before the field's view exists — `input-field` read its `@if`-held
 * input there and threw NG0951.
 */

// Set per spec, with the template that uses them.
const imports = [
  FormsModule,
  FieldDecoratorComponent,
  AutocompleteFieldComponent,
  CheckboxGroupFieldComponent,
  DateFieldComponent,
  DropdownFieldComponent,
  InputFieldComponent,
  RadioGroupFieldComponent,
  SelectFieldComponent,
  SliderFieldComponent,
  TextareaFieldComponent,
  TimeFieldComponent,
  ToggleFieldComponent
];

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ''
})
class HostComponent {
  value: unknown = null;
  options = [{ value: 'a' }, { value: 'b' }];
}

/** `shown` is what the field reads back, where that differs from what it was given. */
const fields: Record<string, { tag: string; value: unknown; shown?: unknown; extra?: string }> = {
  'input': { tag: 'formidable-input-field', value: 'Cynthion' },
  'masked input': { tag: 'formidable-input-field', value: 'ABC1234', shown: 'ABC-1234', extra: 'mask="AAA-0000"' },
  'textarea': { tag: 'formidable-textarea-field', value: 'notes' },
  'autocomplete': { tag: 'formidable-autocomplete-field', value: 'b', extra: '[options]="options"' },
  'dropdown': { tag: 'formidable-dropdown-field', value: 'b', extra: '[options]="options"' },
  'select': { tag: 'formidable-select-field', value: 'b', extra: '[options]="options"' },
  'radio group': { tag: 'formidable-radio-group-field', value: 'b', extra: '[options]="options"' },
  'checkbox group': { tag: 'formidable-checkbox-group-field', value: ['b'], extra: '[options]="options"' },
  'date': { tag: 'formidable-date-field', value: new Date(2020, 0, 2) },
  'time': { tag: 'formidable-time-field', value: new Date(2020, 0, 2, 13, 45), shown: new Date(1970, 0, 1, 13, 45) },
  'slider': { tag: 'formidable-slider-field', value: 40 },
  'toggle': { tag: 'formidable-toggle-field', value: true }
};

describe('standalone ngModel', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNgxMask()] }));

  for (const [key, { tag, value, shown = value, extra = '' }] of Object.entries(fields)) {
    for (const decorated of [false, true]) {
      it(`shows the value of ${decorated ? 'a decorated' : 'an undecorated'} ${key}`, fakeAsync(() => {
        const field = `<${tag} name="f" [ngModel]="value" ${extra}></${tag}>`;
        const template = decorated ? `<formidable-field-decorator>${field}</formidable-field-decorator>` : field;
        TestBed.overrideComponent(HostComponent, { set: { imports, template } });

        const fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.value = value;
        fixture.detectChanges();
        tick(); // the model's microtask and the mask's own setTimeout
        fixture.detectChanges();
        discardPeriodicTasks(); // ngxMask keeps an interval running for as long as a field is alive

        const instance = fixture.debugElement.query(By.css(tag)).componentInstance as BaseFieldDirective<unknown>;
        expect(instance.value).toEqual(shown);
      }));
    }
  }
});
