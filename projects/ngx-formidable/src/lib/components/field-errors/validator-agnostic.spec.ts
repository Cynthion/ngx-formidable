import { Component, Type } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { FieldErrorsDirective } from '../../directives/field-errors.directive';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { NgxFormidableFieldValidateDirective } from '../../forms/field-validate.directive';
import { FORMIDABLE_ERROR_EXTRACTOR } from '../../models/validation.model';
import { FieldDecoratorComponent } from '../field-decorator/field-decorator.component';
import { InputFieldComponent } from '../fields/input-field/input-field.component';

/**
 * Contract of the library's independence from any one validation library.
 *
 * Errors reach the UI through Angular's own `AbstractControl.errors`, so the decorator's `.is-invalid`
 * state, the field's `aria-invalid` and the message list must all work with no formidable form directive,
 * no `FORMIDABLE_VALIDATOR` and no validation library — driven by Angular's built-in validators alone.
 *
 * `FORMIDABLE_ERROR_EXTRACTOR` is what makes that possible: it turns whatever shape wrote `control.errors`
 * into the messages a field displays. These specs pin down both its default and an override.
 */

@Component({
  standalone: true,
  imports: [FormsModule, FieldDecoratorComponent, InputFieldComponent, FieldErrorsDirective, FieldLabelDirective],
  template: `
    <form>
      <formidable-field-decorator>
        <formidable-input-field
          formidableFieldErrors
          name="name"
          [required]="true"
          [minlength]="3"
          [(ngModel)]="name" />
        <div formidableFieldLabel>Name</div>
      </formidable-field-decorator>
    </form>
  `
})
class AngularValidatorsHostComponent {
  name = '';
}

/** The same field with the `[ngModel]` hijack directive imported and no harness above it. */
@Component({
  standalone: true,
  imports: [
    FormsModule,
    NgxFormidableFieldValidateDirective,
    FieldDecoratorComponent,
    InputFieldComponent,
    FieldErrorsDirective
  ],
  template: `
    <form>
      <formidable-field-decorator>
        <formidable-input-field
          formidableFieldErrors
          name="name"
          [required]="true"
          [(ngModel)]="name" />
      </formidable-field-decorator>
    </form>
  `
})
class HijackWithoutHarnessHostComponent {
  name = '';
}

describe('validator-agnostic error rendering', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fixture: ComponentFixture<any>;
  let root: HTMLElement;

  function decorator(): HTMLElement {
    return root.querySelector('formidable-field-decorator') as HTMLElement;
  }

  function input(): HTMLInputElement {
    return root.querySelector('input') as HTMLInputElement;
  }

  function messages(): (string | undefined)[] {
    return Array.from(root.querySelectorAll('.error')).map((e) => e.textContent?.trim());
  }

  /**
   * Builds the fixture and settles it. Settling matters: the field renders its input through an `@if` whose
   * branch flips once ngxMask initializes, replacing the element — so nothing may be dispatched before it.
   * The fixture has to be built inside the `fakeAsync` zone for `tick()` to reach that timer at all.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mount(host: Type<any>): void {
    fixture = TestBed.createComponent(host);
    root = fixture.nativeElement as HTMLElement;

    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function touch(): void {
    input().dispatchEvent(new FocusEvent('focus'));
    input().dispatchEvent(new FocusEvent('blur'));
  }

  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
  }

  function flush(): void {
    tick();
    fixture.detectChanges();
  }

  describe('with Angular’s built-in validators and no formidable form', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideNgxMask()] });
    });

    it('mounts the errors component without a harness in the injector chain', fakeAsync(() => {
      mount(AngularValidatorsHostComponent);

      expect(root.querySelector('formidable-field-errors')).toBeTruthy();
    }));

    // The claim the whole phase rests on: `required` writes `{ required: true }`, not the harness's
    // `{ errors: [...] }`, and the default extractor renders it anyway.
    it('renders Angular’s error keys as messages once touched', fakeAsync(() => {
      mount(AngularValidatorsHostComponent);

      expect(messages()).toEqual([]);

      touch();
      flush();

      expect(messages()).toEqual(['required']);
    }));

    it('raises .is-invalid on the decorator and aria-invalid on the field', fakeAsync(() => {
      mount(AngularValidatorsHostComponent);

      expect(decorator().classList.contains('is-invalid')).toBe(false);
      expect(input().getAttribute('aria-invalid')).toBeNull();

      touch();
      flush();

      expect(decorator().classList.contains('is-invalid')).toBe(true);
      expect(input().getAttribute('aria-invalid')).toBe('true');
    }));

    it('follows the failing validator, and clears as the value satisfies them all', fakeAsync(() => {
      mount(AngularValidatorsHostComponent);

      touch();
      type('ab');
      flush();

      expect(messages()).toEqual(['minlength']);

      type('abc');
      flush();

      expect(messages()).toEqual([]);
      expect(decorator().classList.contains('is-invalid')).toBe(false);
      expect(input().getAttribute('aria-invalid')).toBeNull();
    }));

    // `[ngModel]` is hijacked by the harness's async-validator directive. A consumer who imports
    // NgxFormidableModule gets it on every control, so it must not swallow Angular's own errors.
    it('leaves Angular’s validators alone when the ngModel hijack has no harness', fakeAsync(() => {
      mount(HijackWithoutHarnessHostComponent);

      touch();
      flush();

      expect(messages()).toEqual(['required']);
    }));
  });

  // A schema library reports its own shape. The extractor is the one place a consumer adapts it.
  it('renders a custom error shape through an overridden extractor', fakeAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        provideNgxMask(),
        {
          provide: FORMIDABLE_ERROR_EXTRACTOR,
          useValue: (errors: Record<string, unknown> | null) =>
            errors?.['required'] ? ['Please tell us your name.'] : []
        }
      ]
    });

    mount(AngularValidatorsHostComponent);

    touch();
    flush();

    expect(messages()).toEqual(['Please tell us your name.']);
  }));
});
