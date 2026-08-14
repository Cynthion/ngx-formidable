import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNgxMask } from 'ngx-mask';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { NgxFormidableFormDirective } from '../../forms/form.directive';
import { FieldLabelPosition } from '../../models/formidable.model';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { RadioGroupFieldComponent } from '../fields/radio-group-field/radio-group-field.component';
import { FieldDecoratorComponent } from './field-decorator.component';

/**
 * Contract of the label's required marker.
 *
 * `showRequiredMarker` is declared on the field and mirrored by the decorator, which suffixes the marker to
 * the label. The marker is a sibling of the projected label rather than part of it, and that is the whole
 * point: the label wrapper is a flex row, so when a label is too long to fit, the consumer's own text is
 * what ellipsizes and the marker survives at full width. Its glyph comes from a theme variable, and it
 * carries no colour of its own, so it follows the label through every state.
 *
 * The flag is presentational. Nothing here asserts validity — the validation suite remains the only
 * validator, and these specs deliberately do not imply otherwise. It is deliberately not called `required`:
 * Angular's own `RequiredValidator` matches `[required][ngModel]` on any element, so that name would attach
 * a sync validator and, since Angular skips async validators when a sync one fails, silence the suite.
 *
 * A form may switch every marker on it off at once with `showRequiredMarkers`.
 */

@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, InputFieldComponent, FieldLabelDirective],
  template: `
    <formidable-field-decorator [style.width.rem]="width">
      <formidable-input-field
        name="field"
        [showRequiredMarker]="showRequiredMarker" />
      @if (hasLabel) {
        <div
          formidableFieldLabel
          [position]="position">
          {{ label }}
        </div>
      }
    </formidable-field-decorator>
  `
})
class InputHostComponent {
  showRequiredMarker = false;
  hasLabel = true;
  label = 'Label';
  position: FieldLabelPosition = 'outside';
  width = 20;
}

/** A group renders its label as a plain `div` instead of a `label`, so the marker has to reach both. */
@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, RadioGroupFieldComponent, FieldLabelDirective],
  template: `
    <formidable-field-decorator>
      <formidable-radio-group-field
        name="field"
        [showRequiredMarker]="true" />
      <div
        formidableFieldLabel
        position="outside">
        Label
      </div>
    </formidable-field-decorator>
  `
})
class RadioGroupHostComponent {}

/** The form-wide switch: one flag hides every marker on the form, whatever its fields asked for. */
@Component({
  standalone: true,
  imports: [FormsModule, NgxFormidableFormDirective, FieldDecoratorComponent, InputFieldComponent, FieldLabelDirective],
  template: `
    <form
      formidableForm
      [showRequiredMarkers]="showRequiredMarkers">
      <formidable-field-decorator>
        <formidable-input-field
          name="field"
          ngModel
          [showRequiredMarker]="true" />
        <div
          formidableFieldLabel
          position="outside">
          Label
        </div>
      </formidable-field-decorator>
    </form>
  `
})
class FormHostComponent {
  showRequiredMarkers = true;
}

describe('required marker', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<InputHostComponent>>;
  let host: InputHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(InputHostComponent);
    host = fixture.componentInstance;
  });

  function marker(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.required-marker');
  }

  /** What the marker actually paints — an empty span whose glyph is generated content. */
  function markerGlyph(): string {
    return getComputedStyle(marker() as HTMLElement, '::after').content;
  }

  it('renders no marker while the field is not required', () => {
    fixture.detectChanges();

    expect(marker()).toBeNull();
  });

  it('suffixes the marker to the label once the field is required', () => {
    host.showRequiredMarker = true;
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    expect(wrapper.tagName.toLowerCase()).toBe('label');
    // Last child, so it reads as a suffix and not as a prefix.
    expect(wrapper.lastElementChild).toBe(marker());
  });

  it('hides the marker from assistive tech', () => {
    host.showRequiredMarker = true;
    fixture.detectChanges();

    expect(marker()?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the marker in a group label too, which is a div rather than a label', () => {
    const radioFixture = TestBed.createComponent(RadioGroupHostComponent);
    radioFixture.detectChanges();

    const wrapper = radioFixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    expect(wrapper.tagName.toLowerCase()).toBe('div');
    expect(wrapper.querySelector('.required-marker')).not.toBeNull();
  });

  it('lets the form hide every marker on it, and give them back', () => {
    const formFixture = TestBed.createComponent(FormHostComponent);
    formFixture.detectChanges();

    expect(formFixture.nativeElement.querySelector('.required-marker')).not.toBeNull();

    formFixture.componentInstance.showRequiredMarkers = false;
    formFixture.detectChanges();

    expect(formFixture.nativeElement.querySelector('.required-marker')).toBeNull();
    // Presentational only: the field still tells assistive tech what it is.
    expect(formFixture.nativeElement.querySelector('input')?.getAttribute('aria-required')).toBe('true');
  });

  it('shows nothing when the field is required but projects no label', () => {
    host.showRequiredMarker = true;
    host.hasLabel = false;
    fixture.detectChanges();

    // The marker is a suffix: with no label to suffix, the wrapper it lives in collapses with it.
    expect(marker()?.getBoundingClientRect().width).toBe(0);
  });

  it('takes its glyph from the theme, and follows an override', () => {
    host.showRequiredMarker = true;
    fixture.detectChanges();

    expect(markerGlyph()).toBe('"*"');

    fixture.nativeElement.style.setProperty('--formidable-label-required-marker', '" (required)"');
    fixture.detectChanges();

    expect(markerGlyph()).toBe('" (required)"');
  });

  // The reason the marker is a sibling of the projected label rather than a child of it.
  (['inside-floating', 'border'] as FieldLabelPosition[]).forEach((position) => {
    it(`survives at full width while a ${position} label ellipsizes`, () => {
      host.showRequiredMarker = true;
      host.position = position;
      host.label = 'A label far too long to ever fit inside this field';
      host.width = 8;
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;
      const text = wrapper.firstElementChild as HTMLElement;
      const markerRect = (marker() as HTMLElement).getBoundingClientRect();

      // The consumer's text is the thing that ran out of room...
      expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
      // ...while the marker keeps its glyph, inside the wrapper's own bounds.
      expect(markerRect.width).toBeGreaterThan(0);
      expect(markerRect.right).toBeLessThanOrEqual(wrapper.getBoundingClientRect().right + 1);
    });
  });
});
