import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import {
  FieldDecoratorComponent,
  FieldErrorsDirective,
  FormidableFormErrors,
  InputFieldComponent,
  NgxFormidableFieldValidateDirective,
  NgxFormidableFormDirective,
  NgxFormidableGroupValidateDirective,
  NgxFormidableWholeFormValidateDirective,
  WHOLE_FORM
} from '@cynthion/ngx-formidable';
import { NgxFormidableVestValidatorDirective } from '@cynthion/ngx-formidable/vest';
import { provideNgxMask } from 'ngx-mask';
import { VestWiringModel, vestWiringSuite } from './vest-wiring.model';

/**
 * End-to-end proof of the demo's own wiring, from the consumer's side of both entry points.
 *
 * The demo imports `@cynthion/ngx-formidable` for the fields and the form directive and
 * `@cynthion/ngx-formidable/vest` for the validator, then keeps `[formSuite]` in the template. This mounts
 * exactly that, with the demo's real Vest suite, and follows a message from a `test(...)` in the suite all
 * the way to the rendered `<li>`.
 */

@Component({
  imports: [
    FormsModule,
    NgxFormidableFormDirective,
    NgxFormidableFieldValidateDirective,
    NgxFormidableWholeFormValidateDirective,
    NgxFormidableVestValidatorDirective,
    FieldDecoratorComponent,
    InputFieldComponent,
    FieldErrorsDirective
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      formidableValidateWholeForm
      [formValue]="formValue"
      [formSuite]="formSuite"
      (formValueChange)="formValue = $event"
      (validChange)="isValid = $event"
      (errorsChange)="errors = $event">
      <formidable-field-decorator>
        <formidable-input-field
          formidableFieldErrors
          name="firstName"
          [ngModel]="formValue.firstName" />
      </formidable-field-decorator>
    </form>
  `
})
class DemoWiringHostComponent {
  formValue: VestWiringModel = { firstName: '', lastName: '', passwords: { password: '' } };
  formSuite = vestWiringSuite;
  isValid: boolean | null = null;
  errors: FormidableFormErrors = {};
}

/** The demo's `ngModelGroup`, so the group rule has the target it reports on. */
@Component({
  imports: [
    FormsModule,
    NgxFormidableFormDirective,
    NgxFormidableFieldValidateDirective,
    NgxFormidableGroupValidateDirective,
    NgxFormidableVestValidatorDirective,
    FieldDecoratorComponent,
    InputFieldComponent,
    FieldErrorsDirective
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      [formValue]="formValue"
      [formSuite]="formSuite"
      [dependentFields]="dependentFields"
      (formValueChange)="formValue = $event"
      (errorsChange)="errors = $event">
      <div
        formidableFieldErrors
        ngModelGroup="passwords">
        <formidable-field-decorator>
          <formidable-input-field
            formidableFieldErrors
            name="password"
            [ngModel]="formValue.passwords?.password ?? null" />
        </formidable-field-decorator>
        <formidable-field-decorator>
          <formidable-input-field
            formidableFieldErrors
            name="confirmPassword"
            [ngModel]="formValue.passwords?.confirmPassword ?? null" />
        </formidable-field-decorator>
      </div>
    </form>
  `
})
class GroupWiringHostComponent {
  formValue: VestWiringModel = { passwords: { password: '', confirmPassword: '' } };
  formSuite = vestWiringSuite;
  dependentFields = { 'passwords.password': ['passwords.confirmPassword'] };
  errors: FormidableFormErrors = {};
}

/**
 * The demo's whole-form rule, reached by typing rather than by assigning `formValue` wholesale — the path a
 * user actually takes, and the one where the bound model trails the form's own values.
 */
@Component({
  imports: [
    FormsModule,
    NgxFormidableFormDirective,
    NgxFormidableFieldValidateDirective,
    NgxFormidableGroupValidateDirective,
    NgxFormidableWholeFormValidateDirective,
    NgxFormidableVestValidatorDirective,
    InputFieldComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      formidableValidateWholeForm
      [formValue]="formValue"
      [formSuite]="formSuite"
      (formValueChange)="formValue = $event"
      (errorsChange)="errors = $event">
      <formidable-input-field
        name="firstName"
        [ngModel]="formValue.firstName" />
      <div ngModelGroup="passwords">
        <formidable-input-field
          name="password"
          [ngModel]="formValue.passwords?.password ?? null" />
      </div>
    </form>
  `
})
class WholeFormTypingHostComponent {
  formValue: VestWiringModel = { firstName: '', passwords: { password: '' } };
  formSuite = vestWiringSuite;
  errors: FormidableFormErrors = {};
}

describe('demo wiring: @cynthion/ngx-formidable + @cynthion/ngx-formidable/vest', () => {
  let fixture: ComponentFixture<DemoWiringHostComponent>;
  let host: DemoWiringHostComponent;
  let root: HTMLElement;

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      tick(100);
    }
    fixture.detectChanges();
  }

  function messages(): (string | undefined)[] {
    return Array.from(root.querySelectorAll('.error')).map((e) => e.textContent?.trim());
  }

  function input(): HTMLInputElement {
    return root.querySelector('input') as HTMLInputElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(DemoWiringHostComponent);
    host = fixture.componentInstance;
    root = fixture.nativeElement as HTMLElement;
  });

  it('renders the Vest suite’s own messages on the field', fakeAsync(() => {
    settle();

    input().dispatchEvent(new FocusEvent('focus'));
    input().dispatchEvent(new FocusEvent('blur'));
    settle();

    // Straight out of `vestWiringSuite`'s two `test('firstName', …)` rules.
    expect(messages()).toEqual(['First name is required.', 'First name does not start with T.']);
    expect(host.isValid).toBe(false);
  }));

  it('clears the messages a satisfied rule no longer reports', fakeAsync(() => {
    settle();

    input().dispatchEvent(new FocusEvent('focus'));
    input().dispatchEvent(new FocusEvent('blur'));
    input().value = 'Anna';
    input().dispatchEvent(new Event('input'));
    settle();

    expect(messages()).toEqual(['First name does not start with T.']);
  }));

  // The demo's whole-form rule: it reads the first name and the password, and reports on neither.
  it('runs the suite’s WHOLE_FORM rule through formidableValidateWholeForm', fakeAsync(() => {
    settle();

    host.formValue = { firstName: 'Test', lastName: '', passwords: { password: '1234' } };
    settle();

    expect(host.errors[WHOLE_FORM]).toEqual(["Test user, your password should not be '1234'!"]);
  }));
});

describe('demo wiring: the whole-form rule while typing', () => {
  let fixture: ComponentFixture<WholeFormTypingHostComponent>;
  let host: WholeFormTypingHostComponent;
  let root: HTMLElement;

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      tick(100);
    }
    fixture.detectChanges();
  }

  /** 0 is First Name, 1 is Password. */
  function type(index: number, value: string): void {
    const field = root.querySelectorAll('formidable-input-field')[index] as HTMLElement;
    const input = field.querySelector('input') as HTMLInputElement;

    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(WholeFormTypingHostComponent);
    host = fixture.componentInstance;
    root = fixture.nativeElement as HTMLElement;
  });

  // The rule reads the first name and the password, and has to see the keystroke that completes the pair.
  it('reports on the keystroke that completes the password', fakeAsync(() => {
    host.formValue = { firstName: 'Test', passwords: { password: '' } };
    settle();

    expect(host.errors[WHOLE_FORM]).toBeUndefined();

    type(1, '1234');
    settle();

    expect(host.errors[WHOLE_FORM]).toEqual(["Test user, your password should not be '1234'!"]);
  }));

  it('reports on the keystroke that completes the first name', fakeAsync(() => {
    host.formValue = { firstName: 'Tes', passwords: { password: '1234' } };
    settle();

    expect(host.errors[WHOLE_FORM]).toBeUndefined();

    type(0, 'Test');
    settle();

    expect(host.errors[WHOLE_FORM]).toEqual(["Test user, your password should not be '1234'!"]);
  }));

  it('clears it again on the keystroke that breaks the pair', fakeAsync(() => {
    host.formValue = { firstName: 'Test', passwords: { password: '1234' } };
    settle();

    expect(host.errors[WHOLE_FORM]).toEqual(["Test user, your password should not be '1234'!"]);

    type(1, '12345');
    settle();

    expect(host.errors[WHOLE_FORM]).toBeUndefined();
  }));
});

describe('demo wiring: the passwords group', () => {
  let fixture: ComponentFixture<GroupWiringHostComponent>;
  let host: GroupWiringHostComponent;
  let root: HTMLElement;

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      tick(100);
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(GroupWiringHostComponent);
    host = fixture.componentInstance;
    root = fixture.nativeElement as HTMLElement;
  });

  // The rule reads both fields but reports on `passwords`, so that is the target it has to reach.
  it('runs the suite’s group rule through ngModelGroup', fakeAsync(() => {
    host.formValue = { firstName: 'Anna', lastName: 'A', passwords: { password: 'a', confirmPassword: 'b' } };
    settle();

    expect(host.errors['passwords']).toEqual(['Passwords do not match!']);
    expect(host.errors['passwords.password']).toBeUndefined();
  }));

  it('renders the group’s message beneath the group once it is touched', fakeAsync(() => {
    host.formValue = { firstName: 'Anna', lastName: 'A', passwords: { password: 'a', confirmPassword: 'b' } };
    settle();

    // Touching a field touches its group, which is what lets the group's errors render.
    const password = root.querySelector('input') as HTMLInputElement;
    password.dispatchEvent(new FocusEvent('focus'));
    password.dispatchEvent(new FocusEvent('blur'));
    settle();

    const messages = Array.from(root.querySelectorAll('.error')).map((e) => e.textContent?.trim());

    expect(messages).toContain('Passwords do not match!');
  }));
});
