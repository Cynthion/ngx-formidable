import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { FormidableOption } from '../../models/formidable.model';
import { CheckboxGroupField } from './checkbox-group-field/checkbox-group-field';
import { DateField } from './date-field/date-field';
import { DropdownField } from './dropdown-field/dropdown-field';
import { InputField } from './input-field/input-field';
import { SliderField } from './slider-field/slider-field';

/**
 * Contract of the paths no user walked: the form writing a value, and an options list arriving late, both
 * correct the model while leaving the control untouched and pristine.
 *
 * Neither flag is cosmetic. A touch is the commit under `updateOn: 'blur'` and pre-sets the pending touch
 * under `updateOn: 'submit'`; and both flags gate the messages, under `revealOn` `touched` and `dirty`. So a
 * flag nobody raised would reveal, and commit, a field nobody has visited.
 */

@Component({
  imports: [FormsModule, CheckboxGroupField],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-checkbox-group-field
        name="choices"
        [ngModel]="value"
        [options]="options" />
    </form>
  `
})
class CheckboxHost {
  value: string[] = ['a', 'b'];
  options: FormidableOption[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' }
  ];
}

@Component({
  imports: [FormsModule, DateField],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-date-field
        name="date"
        unicodeTokenFormat="dd . MM . yyyy"
        [ngModel]="value" />
    </form>
  `
})
class DateHost {
  value: Date | null = null;
}

/** 47 is neither on the step grid nor what the user asked for: the field corrects it to 50. */
@Component({
  imports: [FormsModule, SliderField],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-slider-field
        name="amount"
        [max]="100"
        [min]="0"
        [ngModel]="value"
        [step]="25" />
    </form>
  `
})
class SliderHost {
  value = 47;
}

@Component({
  imports: [FormsModule, InputField],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-input-field
        name="phone"
        mask="000-000"
        [ngModel]="value" />
    </form>
  `
})
class MaskedHost {
  value = '123456';
}

@Component({
  imports: [FormsModule, DropdownField],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form>
      <formidable-dropdown-field
        name="choice"
        [ngModel]="value"
        [options]="options" />
    </form>
  `
})
class DropdownHost {
  value: string | null = 'a';
  options: FormidableOption[] = [{ value: 'a', label: 'A' }];
}

describe('programmatic paths stay silent', () => {
  let fixture: ComponentFixture<CheckboxHost | DateHost | SliderHost | MaskedHost | DropdownHost>;

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
    fixture = TestBed.createComponent(CheckboxHost) as ComponentFixture<CheckboxHost>;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(control('choices')?.value).toEqual(['a', 'b']);

    // The list refreshes and no longer offers one of the values the model holds.
    (fixture.componentInstance as CheckboxHost).options = [{ value: 'a', label: 'A' }];
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // The model is corrected, because a selection that no longer exists cannot stand...
    expect(control('choices')?.value).toEqual(['a']);
    // ...but nobody visited this field.
    expect(control('choices')?.touched).toBe(false);
    expect(control('choices')?.dirty).toBe(false);
  }));

  it('does not touch the control when the form writes a value into a date field', fakeAsync(() => {
    fixture = TestBed.createComponent(DateHost) as ComponentFixture<DateHost>;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    (fixture.componentInstance as DateHost).value = new Date(2024, 4, 12);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(control('date')?.value).toEqual(new Date(2024, 4, 12));
    expect(control('date')?.touched).toBe(false);
    expect(control('date')?.dirty).toBe(false);
  }));

  // The slider corrects a value the form gave it, so the model has to move. What must not move is `dirty`:
  // the user never touched the thumb.
  it('corrects an out-of-step value without dirtying the control', fakeAsync(() => {
    fixture = TestBed.createComponent(SliderHost) as ComponentFixture<SliderHost>;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(control('amount')?.value).toBe(50);
    expect(control('amount')?.dirty).toBe(false);
    expect(control('amount')?.touched).toBe(false);
  }));

  it('applies a mask to a written value without dirtying the control', fakeAsync(() => {
    fixture = TestBed.createComponent(MaskedHost) as ComponentFixture<MaskedHost>;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(control('phone')?.value).toBe('123-456');
    expect(control('phone')?.dirty).toBe(false);
    expect(control('phone')?.touched).toBe(false);
  }));

  // The reconcile used to be unreachable here: `updateOptions` re-applied the written value and cleared the
  // selection before the reconcile could read it, so the model kept a value the list no longer offered.
  it('drops a selected value the options no longer offer', fakeAsync(() => {
    fixture = TestBed.createComponent(DropdownHost) as ComponentFixture<DropdownHost>;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(control('choice')?.value).toBe('a');

    (fixture.componentInstance as DropdownHost).options = [{ value: 'b', label: 'B' }];
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(control('choice')?.value).toBeNull();
    expect(control('choice')?.touched).toBe(false);
    expect(control('choice')?.dirty).toBe(false);

    discardPeriodicTasks(); // ngxMask keeps an interval alive on the dropdown's input
  }));
});
