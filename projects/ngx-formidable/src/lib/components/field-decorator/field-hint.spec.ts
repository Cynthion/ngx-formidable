import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { FieldErrorsDirective } from '../../directives/field-errors.directive';
import { StubValidatorDirective } from '../../forms/testing/stub-validator.directive';
import { FieldHintDirective } from '../../directives/field-hint.directive';
import { NgxFormidableFormDirective } from '../../forms/form.directive';
import { FieldHintAlignment } from '../../models/formidable.model';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { FieldDecoratorComponent } from './field-decorator.component';

/**
 * Contract of the decorator's hint slot: hints render below the field and above the errors, they share one
 * row in equal parts, and each aligns its own text.
 *
 * Alignment is asserted geometrically rather than through the computed `text-align`, because the rule that
 * sets it lives in `_globals.scss` — the hint element is projected by the consumer, so the decorator's own
 * stylesheet cannot reach it. Measuring where the text lands proves the global rule actually applies.
 */

interface Model {
  field?: string;
}

const shape = { field: '' };

/** Two hints that come and go, the way a consumer's own `*ngIf` moves them. */
@Component({
  imports: [
    FormsModule,
    NgxFormidableFormDirective,
    StubValidatorDirective,
    FieldDecoratorComponent,
    InputFieldComponent,
    FieldErrorsDirective,
    FieldHintDirective
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      formidableForm
      [formValue]="value"
      [formShape]="shape"
      [stubValidator]="required">
      <formidable-field-decorator>
        <formidable-input-field
          formidableFieldErrors
          name="field"
          [ngModel]="value.field" />
        @if (showHints) {
          <div formidableFieldHint>Note</div>
        }
        @if (showHints && showCounter) {
          <div
            formidableFieldHint
            [align]="counterAlign">
            3 / 150
          </div>
        }
      </formidable-field-decorator>
    </form>
  `
})
class HintHostComponent {
  value: Model = {};
  shape = shape;
  required = { field: 'Required.' };
  showHints = true;
  showCounter = true;
  counterAlign: FieldHintAlignment = 'end';
}

describe('FieldDecoratorComponent hint slot', () => {
  let fixture: ComponentFixture<HintHostComponent>;
  let host: HintHostComponent;
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(HintHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  function wrapper(): HTMLElement {
    return root.querySelector('.hint-wrapper') as HTMLElement;
  }

  function hints(): HTMLElement[] {
    return Array.from(root.querySelectorAll('[formidableFieldHint]'));
  }

  /** Where the hint's text actually sits, which is what alignment means to a reader. */
  function textRect(hint: HTMLElement): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(hint);

    return range.getBoundingClientRect();
  }

  it('renders the hints after the field container and before the errors', () => {
    const container = root.querySelector('.container-horizontal') as HTMLElement;
    const errors = root.querySelector('formidable-field-errors') as HTMLElement;

    expect(container.contains(wrapper())).toBe(false);
    expect(container.compareDocumentPosition(wrapper()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(wrapper().compareDocumentPosition(errors) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides the row when no hint is projected, and shows it again when one returns', () => {
    expect(wrapper().classList.contains('hidden')).toBe(false);

    host.showHints = false;
    fixture.detectChanges();

    expect(wrapper().classList.contains('hidden')).toBe(true);
    expect(getComputedStyle(wrapper()).display).toBe('none');
    expect(wrapper().getBoundingClientRect().height).toBe(0);

    host.showHints = true;
    fixture.detectChanges();

    expect(wrapper().classList.contains('hidden')).toBe(false);
    expect(wrapper().getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it('splits the row evenly between two hints', () => {
    const [note, counter] = hints();

    expect(note!.getBoundingClientRect().width).toBeCloseTo(counter!.getBoundingClientRect().width, 1);
  });

  it('aligns each hint on its own', () => {
    const [note, counter] = hints();

    // The note takes the inherited `start`: its text begins at its own left edge.
    expect(textRect(note!).left).toBeCloseTo(note!.getBoundingClientRect().left, 1);
    // The counter is `end`: its text finishes at its own right edge.
    expect(textRect(counter!).right).toBeCloseTo(counter!.getBoundingClientRect().right, 1);

    host.counterAlign = 'center';
    fixture.detectChanges();

    const box = counter!.getBoundingClientRect();
    const text = textRect(counter!);

    expect(text.left - box.left).toBeCloseTo(box.right - text.right, 1);

    host.counterAlign = 'start';
    fixture.detectChanges();

    expect(textRect(counter!).left).toBeCloseTo(counter!.getBoundingClientRect().left, 1);
  });

  it('sizes the row to the hint and reserves nothing beyond it', () => {
    host.showCounter = false;
    fixture.detectChanges();

    const lineHeight = parseFloat(getComputedStyle(wrapper()).lineHeight);

    expect(getComputedStyle(wrapper()).minHeight).toBe('0px');
    expect(wrapper().getBoundingClientRect().height).toBeCloseTo(lineHeight, 0);
  });

  it('leaves spacing below the decorator to the consumer', () => {
    const decorator = root.querySelector('formidable-field-decorator') as HTMLElement;

    expect(getComputedStyle(decorator).marginBottom).toBe('0px');
  });
});
