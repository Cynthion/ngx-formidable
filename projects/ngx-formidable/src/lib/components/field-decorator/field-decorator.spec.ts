import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgModel } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideNgxMask } from 'ngx-mask';
import { enforce, staticSuite, test } from 'vest';
import { FieldErrorsDirective } from '../../directives/field-errors.directive';
import { FieldErrorsComponent } from '../field-errors/field-errors.component';
import { FieldPrefixDirective } from '../../directives/field-prefix.directive';
import { FieldSuffixDirective } from '../../directives/field-suffix.directive';
import { NgxFormidableFormDirective } from '../../directives/form.directive';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { TextareaFieldComponent } from '../fields/textarea-field/textarea-field.component';
import { FieldDecoratorComponent } from './field-decorator.component';

/**
 * Contract of the decorator's own layout: where a projected prefix/suffix sits, and where the validation
 * errors render.
 *
 * These two are coupled, which is the whole reason this file exists. `.container-horizontal` is the
 * positioning context for the label and for the prefix/suffix, so it has to be exactly the field's box.
 * `FieldErrorsDirective` used to insert its component beside the field — which content projection put
 * *inside* that container — inflating it by a reserved error line and dragging the prefix down with it.
 *
 * The prefix is centered in the field's own box and is deliberately independent of the label: an inside
 * label pushes the value down while the prefix stays put. A `textarea` is the exception, top-aligning its
 * prefix with the first line rather than centering it in a box that grows as you type.
 */

interface Model {
  field?: string;
}

const suite = staticSuite((model: Model, field?: string) => {
  if (field) {
    test(field, 'Required.', () => {
      enforce(model.field).isNotBlank();
    });
  }
});

const frame = { field: '' };

@Component({
  standalone: true,
  imports: [
    FormsModule,
    NgxFormidableFormDirective,
    FieldDecoratorComponent,
    InputFieldComponent,
    FieldErrorsDirective,
    FieldPrefixDirective,
    FieldSuffixDirective
  ],
  template: `
    <form
      formidableForm
      [formValue]="value"
      [formFrame]="frame"
      [formSuite]="suite">
      <formidable-field-decorator>
        <formidable-input-field
          formidableFieldErrors
          name="field"
          [ngModel]="value.field" />
        <div formidableFieldPrefix>Prefix</div>
        <div formidableFieldSuffix>Suffix</div>
      </formidable-field-decorator>
    </form>
  `
})
class PrefixWithErrorsHostComponent {
  value: Model = {};
  frame = frame;
  suite = suite;
}

/** The same field with no decorator around it — the shape a consumer's custom field uses. */
@Component({
  standalone: true,
  imports: [FormsModule, NgxFormidableFormDirective, InputFieldComponent, FieldErrorsDirective],
  template: `
    <form
      formidableForm
      [formValue]="value"
      [formFrame]="frame"
      [formSuite]="suite">
      <formidable-input-field
        formidableFieldErrors
        name="field"
        [ngModel]="value.field" />
    </form>
  `
})
class NoDecoratorHostComponent {
  value: Model = {};
  frame = frame;
  suite = suite;
}

@Component({
  standalone: true,
  imports: [FormsModule, TextareaFieldComponent, FieldDecoratorComponent, FieldPrefixDirective],
  template: `
    <formidable-field-decorator>
      <formidable-textarea-field
        name="field"
        [ngModel]="value" />
      <div formidableFieldPrefix>Prefix</div>
    </formidable-field-decorator>
  `
})
class TextareaPrefixHostComponent {
  value = '';
}

/** px per rem, so the expectations stay written in the tokens' own unit. */
function rem(value: number): number {
  return value * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/** Vertical centre of an element, in viewport coordinates. */
function centreY(element: Element): number {
  const rect = element.getBoundingClientRect();

  return rect.top + rect.height / 2;
}

describe('formidable-field-decorator layout', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNgxMask()] }));

  describe('with projected validation errors', () => {
    let fixture: ComponentFixture<PrefixWithErrorsHostComponent>;
    let root: HTMLElement;

    beforeEach(() => {
      fixture = TestBed.createComponent(PrefixWithErrorsHostComponent);
      fixture.detectChanges();
      root = fixture.nativeElement as HTMLElement;
    });

    function container(): HTMLElement {
      return root.querySelector('.container-horizontal') as HTMLElement;
    }

    function field(): HTMLInputElement {
      return root.querySelector('input') as HTMLInputElement;
    }

    // The regression: the errors component reserves an error line, and while it lived inside the
    // container the prefix's `top: 50%` measured against that inflated height and sat ~14px too low.
    it('centers the prefix and the suffix in the field, not in the container', () => {
      const fieldCentre = centreY(field());

      expect(centreY(root.querySelector('.prefix-wrapper-horizontal')!)).toBeCloseTo(fieldCentre, 0);
      expect(centreY(root.querySelector('.suffix-wrapper-horizontal')!)).toBeCloseTo(fieldCentre, 0);
    });

    it('keeps the container the size of the field, so it can position the label and prefix', () => {
      expect(container().getBoundingClientRect().height).toBeCloseTo(field().getBoundingClientRect().height, 0);
    });

    it('renders the errors after the container rather than inside it', () => {
      const errors = root.querySelector('formidable-field-errors') as HTMLElement;

      expect(errors).toBeTruthy();
      expect(container().contains(errors)).toBe(false);
      expect(errors.compareDocumentPosition(container()) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it('reserves a line for the errors even while the field is valid, so nothing shifts later', () => {
      const errors = root.querySelector('.errors') as HTMLElement;

      expect(errors.querySelector('ul')).toBeNull();
      expect(errors.getBoundingClientRect().height).toBeCloseTo(rem(1.2), 0);
    });

    // The errors component is OnPush and its `ngModel` input never changes identity, so it only repaints
    // when the directive pumps `markForCheck()`. Rendering it from the decorator's view rather than beside
    // the field must leave both halves working: it still reads the field's control, and a pump still
    // reaches it through its new ancestor chain.
    it('shows the messages once the control is touched and invalid', () => {
      const errors = fixture.debugElement.query(By.directive(FieldErrorsComponent));
      const control = fixture.debugElement.query(By.css('formidable-input-field')).injector.get(NgModel).control;

      expect(errors).toBeTruthy();
      expect((errors.componentInstance as FieldErrorsComponent).control).toBe(control);

      control.markAsTouched();
      control.setErrors({ errors: ['Required.'] });
      (errors.componentInstance as FieldErrorsComponent).markForCheck();
      fixture.detectChanges();

      const messages = Array.from(root.querySelectorAll('.error')).map((e) => e.textContent?.trim());

      expect(messages).toEqual(['Required.']);
    });
  });

  // A field can carry `formidableFieldErrors` with no decorator at all — consumers do this for custom
  // fields, so the directive has to keep rendering the component itself in that case.
  it('renders the errors beside the control when there is no decorator', () => {
    const fixture = TestBed.createComponent(NoDecoratorHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const errors = root.querySelector('formidable-field-errors');

    expect(errors).toBeTruthy();
    expect(errors!.previousElementSibling?.tagName.toLowerCase()).toBe('formidable-input-field');
  });

  // A textarea grows as you type, so centering would drift the prefix downwards. It sits on the first
  // line instead, like the label.
  it('top-aligns a textarea prefix with its first line and keeps it there as the field grows', () => {
    const fixture = TestBed.createComponent(TextareaPrefixHostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const textarea = root.querySelector('textarea') as HTMLTextAreaElement;
    const prefix = root.querySelector('.prefix-wrapper-horizontal') as HTMLElement;

    const valueTop = textarea.getBoundingClientRect().top + parseFloat(getComputedStyle(textarea).paddingTop);

    expect(prefix.getBoundingClientRect().top).toBeCloseTo(valueTop, 0);

    // grow the box; the prefix must not follow the middle downwards
    const before = prefix.getBoundingClientRect().top;

    textarea.style.height = '12rem';

    expect(prefix.getBoundingClientRect().top).toBeCloseTo(before, 0);
  });
});
