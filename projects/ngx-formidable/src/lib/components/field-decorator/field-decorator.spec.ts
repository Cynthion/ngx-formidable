import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgModel } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideNgxMask } from 'ngx-mask';
import { enforce, staticSuite, test } from 'vest';
import { FieldErrorsDirective } from '../../directives/field-errors.directive';
import { FieldErrorsComponent } from '../field-errors/field-errors.component';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { FieldPrefixDirective } from '../../directives/field-prefix.directive';
import { FieldSuffixDirective } from '../../directives/field-suffix.directive';
import { NgxFormidableFormDirective } from '../../directives/form.directive';
import { AutocompleteFieldComponent } from '../fields/autocomplete-field/autocomplete-field.component';
import { DateFieldComponent } from '../fields/date-field/date-field.component';
import { DropdownFieldComponent } from '../fields/dropdown-field/dropdown-field.component';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { TextareaFieldComponent } from '../fields/textarea-field/textarea-field.component';
import { TimeFieldComponent } from '../fields/time-field/time-field.component';
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

/** A prefix and a suffix that come and go, the way a consumer's own `*ngIf` moves them. */
@Component({
  standalone: true,
  imports: [NgIf, InputFieldComponent, FieldDecoratorComponent, FieldPrefixDirective],
  template: `
    <formidable-field-decorator>
      <formidable-input-field name="field" />
      <div
        *ngIf="showPrefix"
        formidableFieldPrefix
        style="width: 4rem">
        Prefix
      </div>
    </formidable-field-decorator>
  `
})
class TogglablePrefixHostComponent {
  showPrefix = true;
}

/** A field that renders its own panel toggle, with an inside label and an optional suffix beside it. */
@Component({
  standalone: true,
  imports: [NgIf, DropdownFieldComponent, FieldDecoratorComponent, FieldLabelDirective, FieldSuffixDirective],
  template: `
    <formidable-field-decorator>
      <formidable-dropdown-field
        name="field"
        [readonly]="readonly" />
      <div
        formidableFieldLabel
        [position]="'inside'">
        Label
      </div>
      <div
        *ngIf="showSuffix"
        formidableFieldSuffix>
        Suffix
      </div>
    </formidable-field-decorator>
  `
})
class ToggleFieldHostComponent {
  readonly = false;
  showSuffix = false;
}

/** The four panel-ish fields: only two of them draw a toggle inside the field. */
@Component({
  standalone: true,
  imports: [
    FieldDecoratorComponent,
    DropdownFieldComponent,
    DateFieldComponent,
    AutocompleteFieldComponent,
    TimeFieldComponent
  ],
  template: `
    <formidable-field-decorator><formidable-dropdown-field name="a" /></formidable-field-decorator>
    <formidable-field-decorator><formidable-date-field name="b" /></formidable-field-decorator>
    <formidable-field-decorator><formidable-autocomplete-field name="c" /></formidable-field-decorator>
    <formidable-field-decorator><formidable-time-field name="d" /></formidable-field-decorator>
  `
})
class EveryPanelFieldHostComponent {}

/** px per rem, so the expectations stay written in the tokens' own unit. */
function rem(value: number): number {
  return value * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/** Vertical centre of an element, in viewport coordinates. */
function centreY(element: Element): number {
  const rect = element.getBoundingClientRect();

  return rect.top + rect.height / 2;
}

/** Lets the decorator's `ResizeObserver` deliver and the resulting inset reach the layout. */
async function settle(fixture: ComponentFixture<unknown>): Promise<HTMLElement> {
  fixture.detectChanges();

  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
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

  // The bug this replaced: the measurement ran once and wrote inline padding only when it found a
  // non-zero width, so a prefix that went away later left its inset on the field forever.
  it('gives the field back its own padding once the prefix goes away', async () => {
    const fixture = TestBed.createComponent(TogglablePrefixHostComponent);
    const root = await settle(fixture);
    const field = root.querySelector('input') as HTMLInputElement;
    const host = root.querySelector('formidable-field-decorator') as HTMLElement;

    expect(parseFloat(getComputedStyle(field).paddingLeft)).toBeGreaterThan(rem(4));
    expect(host.style.getPropertyValue('--formidable-field-prefix-inset')).not.toBe('');

    fixture.componentInstance.showPrefix = false;
    await settle(fixture);

    expect(parseFloat(getComputedStyle(field).paddingLeft)).toBeCloseTo(rem(1), 1);
    expect(host.style.getPropertyValue('--formidable-field-prefix-inset')).toBe('');
  });

  /**
   * A `dropdown-field` and a `date-field` render a panel toggle inside their own box. It is not projected
   * content, so nothing measures it — the value inset has to account for it, or a label spans the field
   * right up to the border and disappears behind the toggle, and a projected suffix lands on top of it.
   */
  describe('with an in-field panel toggle', () => {
    let fixture: ComponentFixture<ToggleFieldHostComponent>;
    let root: HTMLElement;

    /** The distance the toggle and the field's own padding together claim: `2rem` plus `1rem`. */
    const insetWithToggle = rem(3);

    beforeEach(async () => {
      fixture = TestBed.createComponent(ToggleFieldHostComponent);
      root = await settle(fixture);
    });

    function field(): HTMLElement {
      return root.querySelector('.field') as HTMLElement;
    }

    function toggle(): HTMLElement {
      return root.querySelector('.dropdown-toggle') as HTMLElement;
    }

    it('keeps the label clear of the toggle instead of running it underneath', () => {
      const label = root.querySelector('.label-wrapper') as HTMLElement;

      expect(field().getBoundingClientRect().right - label.getBoundingClientRect().right).toBeCloseTo(
        insetWithToggle,
        1
      );
    });

    it('hands the width back when readonly takes the toggle away', async () => {
      const host = root.querySelector('formidable-field-decorator') as HTMLElement;

      expect(host.classList.contains('has-in-field-toggle')).toBe(true);

      fixture.componentInstance.readonly = true;
      await settle(fixture);

      const label = root.querySelector('.label-wrapper') as HTMLElement;

      expect(host.classList.contains('has-in-field-toggle')).toBe(false);
      expect(toggle()).toBeNull();
      expect(field().getBoundingClientRect().right - label.getBoundingClientRect().right).toBeCloseTo(rem(1), 1);
    });

    // The toggle is a flex item inside the field's padding, so reserving the suffix's width there is
    // what moves the two apart. The suffix itself stays anchored to the field's right edge.
    it('stacks a projected suffix beside the toggle rather than over it', async () => {
      expect(parseFloat(getComputedStyle(field()).paddingRight)).toBeCloseTo(rem(1), 1);

      fixture.componentInstance.showSuffix = true;
      await settle(fixture);

      const suffix = root.querySelector('[formidableFieldSuffix]') as HTMLElement;

      expect(parseFloat(getComputedStyle(field()).paddingRight)).toBeGreaterThan(rem(2));
      expect(suffix.getBoundingClientRect().left).toBeGreaterThanOrEqual(toggle().getBoundingClientRect().right);
    });

    // `autocomplete-field` and `time-field` have a panel and a mask but draw nothing in the field, so
    // reserving the width for them would leave a visible gap at the right edge.
    it('is claimed by the two fields that draw one and by no others', async () => {
      const every = await settle(TestBed.createComponent(EveryPanelFieldHostComponent));
      const claims = Array.from(every.querySelectorAll('formidable-field-decorator')).map((host) =>
        host.classList.contains('has-in-field-toggle')
      );

      expect(claims).toEqual([true, true, false, false]); // dropdown, date, autocomplete, time
    });

    it('keeps the label clear of a suffix and the toggle together', async () => {
      fixture.componentInstance.showSuffix = true;
      await settle(fixture);

      const label = root.querySelector('.label-wrapper') as HTMLElement;
      const suffixInset = parseFloat(getComputedStyle(field()).paddingRight);

      expect(field().getBoundingClientRect().right - label.getBoundingClientRect().right).toBeCloseTo(
        suffixInset + rem(2),
        1
      );
    });
  });
});
