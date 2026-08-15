import { Component } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { IFormidableFieldOption } from '../../models/formidable.model';
import { DateFieldComponent } from './date-field/date-field.component';
import { CheckboxGroupFieldComponent } from './checkbox-group-field/checkbox-group-field.component';

/**
 * Contract of the paths no user walked: the form writing a value, and an options list arriving late, both
 * correct the model without touching the control. A touch is not cosmetic — under `updateOn: 'blur'` it
 * commits the value and under `updateOn: 'submit'` it pre-sets the pending touch, so a touch nobody made
 * would reveal, and commit, a field nobody has visited.
 */

@Component({
  standalone: true,
  imports: [FormsModule, CheckboxGroupFieldComponent],
  template: `
    <form>
      <formidable-checkbox-group-field
        name="choices"
        [ngModel]="value"
        [options]="options" />
    </form>
  `
})
class CheckboxHostComponent {
  value: string[] = ['a', 'b'];
  options: IFormidableFieldOption[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' }
  ];
}

@Component({
  standalone: true,
  imports: [FormsModule, DateFieldComponent],
  template: `
    <form>
      <formidable-date-field
        name="date"
        unicodeTokenFormat="dd . MM . yyyy"
        [ngModel]="value" />
    </form>
  `
})
class DateHostComponent {
  value: Date | null = null;
}

describe('programmatic paths stay silent', () => {
  let fixture: ComponentFixture<CheckboxHostComponent | DateHostComponent>;

  function control(name: string) {
    return fixture.debugElement.children[0]!.injector.get(NgForm).form.get(name);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });
  });

  afterEach(fakeAsync(() => {
    flush();
    discardPeriodicTasks();
  }));

  it('does not touch the control when an options list drops a selected value', fakeAsync(() => {
    fixture = TestBed.createComponent(CheckboxHostComponent) as ComponentFixture<CheckboxHostComponent>;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(control('choices')?.value).toEqual(['a', 'b']);

    // The list refreshes and no longer offers one of the values the model holds.
    (fixture.componentInstance as CheckboxHostComponent).options = [{ value: 'a', label: 'A' }];
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // The model is corrected, because a selection that no longer exists cannot stand...
    expect(control('choices')?.value).toEqual(['a']);
    // ...but nobody visited this field.
    expect(control('choices')?.touched).toBe(false);
  }));

  it('does not touch the control when the form writes a value into a date field', fakeAsync(() => {
    fixture = TestBed.createComponent(DateHostComponent) as ComponentFixture<DateHostComponent>;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    (fixture.componentInstance as DateHostComponent).value = new Date(2024, 4, 12);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(control('date')?.value).toEqual(new Date(2024, 4, 12));
    expect(control('date')?.touched).toBe(false);
  }));
});
